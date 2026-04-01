'use client';

import { useState } from 'react';
import type { Order, PaymentMethod } from '@/lib/types';
import { useCreatePayment, useCompleteMockPayment } from '@/hooks/use-restaurant-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { CreditCard, Banknote, Smartphone, QrCode, Check, Receipt, ArrowLeft } from 'lucide-react';
import { ClickPesaForm } from '@/components/payment/ClickPesaForm';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PaymentDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (order: Order) => void;
}

export function PaymentDialog({ order, open, onOpenChange, onComplete }: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [showQR, setShowQR] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'method' | 'payment' | 'success'>('method');
  const [customerPhone, setCustomerPhone] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const createPayment = useCreatePayment();
  const completeMockPayment = useCompleteMockPayment();

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'mobile', label: 'Mobile Money', icon: Smartphone },
    { value: 'qr', label: 'QR Code', icon: QrCode },
  ];

  const fetchLatestOrder = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${order.id}`, {
        headers: { 'X-Restaurant-ID': order.restaurantId || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch latest order status');
      const updatedOrder = await res.json();
      setCompletedOrder(updatedOrder);
      return updatedOrder;
    } catch (err) {
      console.error('fetchLatestOrder error:', err);
      return null;
    }
  };

  const handlePaymentMethodSelect = () => {
    if (method === 'mobile') {
      // Show ClickPesa form for mobile money
      setCheckoutStep('payment');
    } else if (method === 'qr') {
      // Show QR code
      setShowQR(true);
    } else {
      // For cash and card, mark as paid immediately
      handlePayment();
    }
  };

  const handlePayment = async () => {
    try {
      // Create payment record
      const payment = await createPayment.mutateAsync({
        orderId: order.id,
        amount: order.total,
        method,
      });

      console.log('Payment created:', payment);
      toast.success('Payment recorded', {
        description: `Order #${order.id.slice(-6)} is marked as paid`
      });

      const finalOrder = await fetchLatestOrder();
      if (finalOrder) setCompletedOrder(finalOrder);
      setIsPaid(true);
    } catch (error) {
      toast.error('Payment failed');
      console.error('Payment error:', error);
    }
  };

  const handleMobileMoneySuccess = async () => {
    // After ClickPesa form successfully initiates payment, create payment record with pending status
    try {
      const transactionId = sessionStorage.getItem('pendingTransactionId');
      const res = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Restaurant-ID': order.restaurantId || '',
        },
        body: JSON.stringify({
          order_id: order.id,
          amount: order.total,
          method: 'mobile',
          status: 'pending',
          reference: transactionId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create payment record');
      }

      const payment = await res.json();
      console.log('Mobile money payment created:', payment);
      sessionStorage.removeItem('pendingTransactionId');
      
      toast.success('Mobile money payment initiated', {
        description: `Order #${order.id.slice(-6)} awaiting payment confirmation`
      });

      const finalOrder = await fetchLatestOrder();
      if (finalOrder) setCompletedOrder(finalOrder);
      setIsPaid(true);
    } catch (error) {
      toast.error('Failed to record payment');
      console.error('Payment error:', error);
    }
  };

  const handleQRPaymentConfirm = async () => {
    try {
      // Create payment record for QR payment
      const payment = await createPayment.mutateAsync({
        orderId: order.id,
        amount: order.total,
        method: 'qr',
      });

      console.log('QR Payment created:', payment);

      toast.success('QR Payment recorded', {
        description: `Order #${order.id.slice(-6)} is marked as paid`
      });

      const finalOrder = await fetchLatestOrder();
      if (finalOrder) setCompletedOrder(finalOrder);
      setIsPaid(true);
      setShowQR(false);
    } catch (error) {
      console.error('QR Payment error:', error);
      toast.error('Payment failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleClose = () => {
    if (isPaid) {
      onComplete(completedOrder || { ...order, status: 'paid', paid_at: new Date().toISOString() });
    }
    setIsPaid(false);
    setShowQR(false);
    setMethod('cash');
    setCompletedOrder(null);
    onOpenChange(false);
  };

  // Generate QR code data (in production, this would be a payment link)
  const qrData = JSON.stringify({
    orderId: order.id,
    amount: order.total,
    restaurant: 'RestoFlow',
    timestamp: Date.now(),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!isPaid ? (
          <>
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                {order.tableName} - Order #{order.id.slice(-6)}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {checkoutStep === 'payment' && method === 'mobile' ? (
                <ClickPesaForm
                  amount={order.total}
                  onSuccess={handleMobileMoneySuccess}
                  onBack={() => setCheckoutStep('method')}
                  isLoading={createPayment.isPending}
                  restaurantId={order.restaurantId || ''}
                  orderId={order.id}
                />
              ) : (
                <>
                  {/* Order Summary */}
                  <div className="bg-secondary/50 rounded-lg p-4 mb-6">
                    <div className="space-y-2 text-sm">
                      {order.items.map(item => (
                        <div key={item.menuItemId} className="flex justify-between">
                          <span>
                            {item.menuItem.name} x{item.quantity}
                          </span>
                          <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>${order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tax</span>
                          <span>${order.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-1">
                          <span>Total</span>
                          <span>${order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {showQR ? (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Customer scans this QR code to pay
                      </p>
                      <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                        <QRCodeSVG value={qrData} size={200} />
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="font-semibold text-xl">TSH {order.total.toLocaleString()}</p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowQR(false)}
                        >
                          Back
                        </Button>
                        <Button
                          className="w-full"
                          onClick={handleQRPaymentConfirm}
                          disabled={createPayment.isPending}
                        >
                          Confirm Payment Received
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Label className="text-base font-semibold mb-3 block">
                        Select Payment Method
                      </Label>
                      <RadioGroup
                        value={method}
                        onValueChange={(v) => setMethod(v as PaymentMethod)}
                        className="grid grid-cols-2 gap-3"
                      >
                        {paymentMethods.map(({ value, label, icon: Icon }) => (
                          <Label
                            key={value}
                            htmlFor={value}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                              method === value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <RadioGroupItem value={value} id={value} className="sr-only" />
                            <Icon className={`h-6 w-6 mb-2 ${method === value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${method === value ? 'text-primary' : ''}`}>
                              {label}
                            </span>
                          </Label>
                        ))}
                      </RadioGroup>

                      <Button
                        className="w-full mt-6"
                        size="lg"
                        onClick={handlePaymentMethodSelect}
                        disabled={createPayment.isPending}
                      >
                        {createPayment.isPending
                          ? 'Processing...'
                          : method === 'qr'
                          ? 'Show QR Code'
                          : method === 'mobile'
                          ? 'Pay via Mobile Money'
                          : `Pay $${order.total.toFixed(2)}`}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-status-available rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Complete!</h3>
            <p className="text-muted-foreground mb-6">
              Order #{order.id.slice(-6)} has been paid
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleClose}>
                <Receipt className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
