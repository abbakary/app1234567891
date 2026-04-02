'use client';

import type { Order, PaymentMethod } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Download, Printer } from 'lucide-react';

interface ReceiptDialogProps {
  order: Order;
  paymentMethod?: PaymentMethod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ order, paymentMethod = 'cash', open, onOpenChange }: ReceiptDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const feedbackUrl = `https://restoflow.app/feedback/${order.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="sr-only">Receipt</DialogTitle>
        </DialogHeader>

        <div className="receipt-content flex-1 overflow-y-auto pr-2">
          {/* Receipt Header */}
          <div className="text-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold">RestoFlow</h2>
            <p className="text-sm text-muted-foreground">Restaurant Management</p>
            <p className="text-xs text-muted-foreground mt-2">
              123 Restaurant Street, City
            </p>
            <p className="text-xs text-muted-foreground">
              Tel: (555) 123-4567
            </p>
          </div>

          {/* Order Info */}
          <div className="flex justify-between text-sm mb-4">
            <div>
              <p className="text-muted-foreground">Order #</p>
              <p className="font-mono">{order.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date</p>
              <p>
                {(() => {
                  const dateVal = order.paidAt || order.createdAt;
                  if (!dateVal) return 'N/A';
                  const d = new Date(dateVal);
                  return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM dd, yyyy HH:mm');
                })()}
              </p>
            </div>
          </div>

          <div className="flex justify-between text-sm mb-4 pb-4 border-b">
            <div>
              <p className="text-muted-foreground">Table</p>
              <p className="font-medium">{order.tableName}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Guests</p>
              <p>{order.customerCount}</p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4">
            {order.items.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <div className="flex-1">
                  <span>{item.menuItem.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <span className="font-medium">
                  TSH {(item.menuItem.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>TSH {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (10%)</span>
              <span>TSH {order.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
              <span>Total</span>
              <span>TSH {order.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="text-center text-sm text-muted-foreground mt-4 pt-4 border-t">
            <p>
              Paid via{' '}
              <span className="capitalize font-medium text-foreground">
                {paymentMethod === 'qr' ? 'QR Code' : paymentMethod}
              </span>
            </p>
          </div>

          {/* Feedback QR */}
          <div className="text-center mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Scan to leave feedback or reorder
            </p>
            <div className="bg-white p-2 rounded inline-block">
              <QRCodeSVG value={feedbackUrl} size={80} />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t">
            <p>Thank you for dining with us!</p>
            <p className="mt-1">Please come again</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t flex-shrink-0 print:hidden">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            <Download className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
