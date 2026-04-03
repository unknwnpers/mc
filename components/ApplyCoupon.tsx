"use client";

import { useState } from "react";
import { Check, X, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ApplyCouponProps {
  orderAmount: number;
  onCouponApplied?: (discount: number, finalAmount: number, couponData: any) => void;
  onCouponRemoved?: () => void;
}

export function ApplyCoupon({ orderAmount, onCouponApplied, onCouponRemoved }: ApplyCouponProps) {
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(orderAmount);

  async function handleApply() {
    if (!code.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    setApplying(true);

    try {
      const token = await import("firebase/auth").then(m => m.getAuth().currentUser?.getIdToken());
      
      const response = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          code: code.trim(),
          orderAmount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppliedCoupon(data.coupon);
        setDiscount(data.discount);
        setFinalAmount(data.finalAmount);
        
        toast.success(`Coupon applied! You saved ₹${data.discount}`);
        onCouponApplied?.(data.discount, data.finalAmount, data.coupon);
      } else {
        toast.error(data.error || "Invalid coupon code");
        setAppliedCoupon(null);
        setDiscount(0);
        setFinalAmount(orderAmount);
        onCouponRemoved?.();
      }
    } catch (error: any) {
      console.error("Coupon apply error:", error);
      toast.error("Failed to apply coupon. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function handleRemove() {
    setCode("");
    setAppliedCoupon(null);
    setDiscount(0);
    setFinalAmount(orderAmount);
    toast.info("Coupon removed");
    onCouponRemoved?.();
  }

  // Update final amount when order amount changes
  useState(() => {
    if (appliedCoupon) {
      // Re-apply coupon with new order amount
      handleApply();
    }
  });

  if (appliedCoupon) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{appliedCoupon.code}</span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Applied
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {appliedCoupon.type === 'percentage' 
                    ? `${appliedCoupon.value}% off` 
                    : `₹${appliedCoupon.value} off`}
                  {discount > 0 && (
                    <span className="ml-2 font-semibold text-green-700">
                      -₹{discount}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </div>
          
          {/* Discount Breakdown */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{orderAmount}</span>
              </div>
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Discount</span>
                <span>-₹{discount}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-bold text-base pt-2 border-t border-green-200">
                <span>Total</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Tag className="w-5 h-5 text-blush" />
            <span className="font-semibold">Have a coupon code?</span>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter code (e.g., SAVE20)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={applying}
              className="flex-1 uppercase tracking-wider"
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            />
            <Button
              onClick={handleApply}
              disabled={applying || !code.trim()}
              className="bg-blush hover:bg-[#f48c82] text-white px-6 min-w-[100px]"
            >
              {applying ? 'Applying...' : 'Apply'}
            </Button>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Enter your coupon code above and click Apply. Discount will be calculated automatically.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
