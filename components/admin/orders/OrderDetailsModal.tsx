"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Package, User, MapPin, CreditCard, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailsModalProps {
  order: any | null;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const formatDate = (date: any) => {
    return new Date(date?.toDate?.() || date).toLocaleString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#111] border-white/[0.06] text-white overflow-hidden p-0 rounded-3xl shadow-2xl backdrop-blur-3xl">
        <div className="max-h-[90vh] overflow-y-auto custom-scrollbar no-scrollbar">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#111]/80 backdrop-blur-md border-b border-white/[0.06] px-8 py-6 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">Order Details</DialogTitle>
              <p className="text-[10px] font-mono font-bold text-white/30 mt-1 uppercase tracking-widest">ID: {order.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              <button onClick={onClose} className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Customer & Payment Section */}
              <div className="space-y-6">
                {/* Customer */}
                <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-white/20">
                    <User className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Customer Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-black">{order.recipient?.name || "N/A"}</p>
                      <p className="text-xs text-white/40 font-bold tracking-tight">{order.recipient?.email || "N/A"}</p>
                      <p className="text-xs text-white/40 font-bold tracking-tight">{order.recipient?.phone || "N/A"}</p>
                    </div>
                    <div className="pt-2 border-t border-white/[0.04]">
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">User ID</p>
                      <p className="text-[10px] font-mono text-white/40 break-all">{order.userId}</p>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-white/20">
                    <CreditCard className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Payment & Timeline</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Method</p>
                      <Badge className="bg-white/5 border-white/[0.1] text-white/60 text-[10px] font-black tracking-widest py-1">
                        {order.isCOD ? "CASH ON DELIVERY" : (order.codPaymentRazorpayOrderId ? "COD TO ONLINE" : "ONLINE PAYMENT")}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-xl font-black tracking-tighter">₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-white/[0.04]">
                      <div className="flex items-center gap-2 text-white/40 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ordered On</span>
                      </div>
                      <p className="text-xs font-bold">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-white/20">
                  <MapPin className="w-4 h-4" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Shipping Address</h3>
                </div>
                {order.recipient?.address ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-white">{order.recipient.address.name}</p>
                      <p className="text-sm text-white/60 leading-relaxed font-medium">
                        {order.recipient.address.addressLine1}
                        {order.recipient.address.addressLine2 && <>, {order.recipient.address.addressLine2}</>}
                        {order.recipient.address.landmark && (
                          <>
                            <br />
                            <span className="text-white/30 italic text-xs">Landmark: {order.recipient.address.landmark}</span>
                          </>
                        )}
                      </p>
                      <p className="text-sm font-bold tracking-tight pt-1">
                        {order.recipient.address.city}, {order.recipient.address.state} — {order.recipient.address.pincode}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-white/[0.04]">
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Delivery Phone</p>
                      <p className="text-sm font-black">{order.recipient.address.phone}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center py-10 opacity-20">
                    <p className="text-xs font-bold uppercase tracking-widest">No address data found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/20">
                  <Package className="w-4 h-4" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Order Items ({order.items?.length || 0})</h3>
                </div>
              </div>
              
              <div className="space-y-4">
                {(order.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.04] last:border-0 group">
                    <div className="flex items-center gap-5">
                      <div className="relative h-16 w-16 shrink-0 bg-white/5 rounded-xl overflow-hidden border border-white/[0.06]">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-20">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute top-1 right-1 bg-white text-black text-[9px] font-black h-5 w-5 rounded-lg flex items-center justify-center shadow-2xl">
                          {item.quantity}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white group-hover:text-rose-400 transition-colors">{item.name}</p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                          Size: <span className="text-white/60">{item.selectedSize || "Default"}</span>
                        </p>
                        <p className="text-[10px] text-white/20 font-bold tracking-tight mt-1 font-mono uppercase">SKU: {item.sku || order.id.slice(0,6)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">₹{item.price.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-white/20 font-bold">per unit</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="pt-6 border-t border-white/[0.06] flex flex-col items-end gap-2">
                <div className="flex items-center gap-10">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold">₹{order.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-10">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Shipping</span>
                  <span className="text-sm font-bold text-emerald-400">FREE</span>
                </div>
                <div className="flex items-center gap-10 mt-2">
                  <span className="text-sm font-black text-white uppercase tracking-widest">Order Total</span>
                  <span className="text-2xl font-black tracking-tighter text-white">₹{order.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
