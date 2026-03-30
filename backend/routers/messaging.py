from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

from database import get_db
import models, schemas
from auth_utils import verify_restaurant

router = APIRouter(prefix="/api/messaging", tags=["Messaging"])


@router.post("/send-bulk", response_model=schemas.MessageResponse)
async def send_bulk_messages(
    request: schemas.MessageCreate,
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
):
    """
    Send messages to customers
    Target can be 'all' (all customers) or 'new' (customers who haven't received a message)
    """
    try:
        # Get customers based on target
        if request.target == "all":
            # Get all customers for this restaurant
            customers = db.query(models.User).filter(
                models.User.restaurant_id == restaurant_id,
                models.User.role == "customer"
            ).all()
        elif request.target == "new":
            # Get customers who haven't received any message yet
            # Get all customers first
            all_customers = db.query(models.User).filter(
                models.User.restaurant_id == restaurant_id,
                models.User.role == "customer"
            ).all()
            
            # Get customers who have received messages
            customers_with_messages = db.query(models.Message.customer_id).filter(
                models.Message.restaurant_id == restaurant_id,
                models.Message.status == "sent"
            ).distinct().all()
            
            customer_ids_with_messages = {c[0] for c in customers_with_messages}
            
            # Filter customers without messages
            customers = [c for c in all_customers if c.id not in customer_ids_with_messages]
        else:
            raise HTTPException(status_code=400, detail="Invalid target. Must be 'all' or 'new'")

        if not customers:
            return schemas.MessageResponse(
                success=True,
                message="No customers found matching the target criteria",
                messages_sent=0,
                messages_failed=0
            )

        # Create message records for each customer
        messages_sent = 0
        messages_failed = 0

        for customer in customers:
            if not customer.phone:
                messages_failed += 1
                continue

            try:
                message = models.Message(
                    id=str(uuid.uuid4()),
                    restaurant_id=restaurant_id,
                    customer_id=customer.id,
                    message_type=request.message_type,
                    content=request.content,
                    target=request.target,
                    phone_number=customer.phone,
                    status="sent",  # In production, integrate with actual SMS/WhatsApp service
                    sent_at=datetime.utcnow()
                )
                db.add(message)
                messages_sent += 1
            except Exception as e:
                messages_failed += 1
                print(f"Error creating message for customer {customer.id}: {str(e)}")

        db.commit()

        return schemas.MessageResponse(
            success=True,
            message=f"Messages sent successfully",
            messages_sent=messages_sent,
            messages_failed=messages_failed
        )

    except Exception as e:
        db.rollback()
        print(f"Error sending bulk messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error sending messages: {str(e)}")


@router.get("/messages", response_model=list[schemas.Message])
async def get_messages(
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get all messages sent by the restaurant
    """
    try:
        messages = db.query(models.Message).filter(
            models.Message.restaurant_id == restaurant_id
        ).order_by(
            models.Message.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        return messages
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")


@router.get("/messages/{message_id}", response_model=schemas.Message)
async def get_message(
    message_id: str,
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
):
    """
    Get a specific message
    """
    try:
        message = db.query(models.Message).filter(
            models.Message.id == message_id,
            models.Message.restaurant_id == restaurant_id
        ).first()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        return message
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching message: {str(e)}")


@router.get("/messages/customer/{customer_id}", response_model=list[schemas.Message])
async def get_customer_messages(
    customer_id: str,
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
    skip: int = 0,
    limit: int = 50,
):
    """
    Get all messages sent to a specific customer
    """
    try:
        messages = db.query(models.Message).filter(
            models.Message.customer_id == customer_id,
            models.Message.restaurant_id == restaurant_id
        ).order_by(
            models.Message.created_at.desc()
        ).offset(skip).limit(limit).all()

        return messages
    except Exception as e:
        print(f"Error fetching customer messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")
