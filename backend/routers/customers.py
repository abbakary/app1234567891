from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime

from database import get_db
from websocket_manager import manager
import models, schemas
from auth_utils import verify_restaurant

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("/profile")
async def get_customer_profile(
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
    x_customer_id: str = Header(...),
):
    """
    Get customer profile including personal details and order statistics
    """
    try:
        # Get the customer user
        customer = db.query(models.User).filter(
            models.User.id == x_customer_id,
            models.User.restaurant_id == restaurant_id,
            models.User.role == "customer"
        ).first()

        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Get customer's orders
        orders = db.query(models.Order).filter(
            models.Order.customer_id == x_customer_id,
            models.Order.restaurant_id == restaurant_id
        ).all()

        # Calculate statistics
        total_orders = len(orders)
        completed_orders = len([o for o in orders if o.status == "paid"])
        total_spent = sum([o.total for o in orders if o.status == "paid"])

        # Calculate rewards (placeholder logic - 1 point per 100 currency)
        rewards_points = int(total_spent * 10)

        return {
            "id": customer.id,
            "name": customer.name or customer.username,
            "username": customer.username,
            "email": customer.email,
            "phone": customer.phone,
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_spent": total_spent,
            "rewards_points": rewards_points,
        }

    except Exception as e:
        print(f"Error fetching customer profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching profile: {str(e)}")


@router.post("/location")
async def update_customer_location(
    location_data: schemas.CustomerLocationUpdate,
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
    x_customer_id: Optional[str] = Header(None),
):
    """
    Save customer's GPS location for an order
    This endpoint is called from the mobile/web app to track where the customer is
    """
    try:
        # Get the order
        order = db.query(models.Order).filter(
            models.Order.restaurant_id == restaurant_id,
            models.Order.id == location_data.order_id,
        ).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Only delivery/pickup orders should have customer locations
        if order.order_type not in ["delivery", "pickup"]:
            raise HTTPException(status_code=400, detail="Only delivery/pickup orders can have location tracking")

        # Log the customer location update (could store in database if needed)
        print(
            f"Customer location update for order {location_data.order_id}: "
            f"Lat: {location_data.latitude}, Lng: {location_data.longitude}, "
            f"Accuracy: {location_data.accuracy}m"
        )

        # Broadcast location update to all connected clients (driver, reception, kitchen)
        await manager.broadcast_update({
            "type": "CUSTOMER_LOCATION_UPDATED",
            "order_id": location_data.order_id,
            "latitude": location_data.latitude,
            "longitude": location_data.longitude,
            "accuracy": location_data.accuracy,
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {
            "status": "success",
            "message": "Location updated",
            "order_id": location_data.order_id,
        }

    except Exception as e:
        print(f"Error updating customer location: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating location: {str(e)}")


@router.get("/{order_id}/location-history")
async def get_location_history(
    order_id: str,
    db: Session = Depends(get_db),
    restaurant_id: str = Depends(verify_restaurant),
):
    """
    Get historical customer location data for an order (if stored)
    This would be used to show the delivery route after completion
    """
    try:
        order = db.query(models.Order).filter(
            models.Order.restaurant_id == restaurant_id,
            models.Order.id == order_id,
        ).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # For now, return empty array - implement storage in database if needed
        return {
            "order_id": order_id,
            "locations": [],
            "message": "Location history storage not yet implemented",
        }

    except Exception as e:
        print(f"Error fetching location history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")
