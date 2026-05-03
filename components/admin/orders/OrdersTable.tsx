"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Copy, MoreHorizontal, Package } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrdersTableProps {
  orders: any[];
  fetching: boolean;
  onViewDetails: (order: any) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  updatingId: string | null;
}

export function OrdersTable({ orders, fetching, onViewDetails, onUpdateStatus, updatingId }: OrdersTableProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("ID copied to clipboard");
  };

  const paymentMethodStyles = {
    cod: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    online: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    codToOnline: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  if (fetching) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl h-96 flex items-center justify-center backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Fetching Orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl h-96 flex items-center justify-center backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-white/20">
          <Package className="w-16 h-16" />
          <p className="text-xl font-black">No orders found</p>
          <p className="text-sm font-medium">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl transition-all">
      <Table>
        <TableHeader className="bg-white/[0.02]">
          <TableRow className="hover:bg-transparent border-white/[0.06]">
            <TableHead className="font-black text-white/40 py-6 px-8 uppercase tracking-widest text-[10px]">Order ID</TableHead>
            <TableHead className="font-black text-white/40 py-6 px-8 uppercase tracking-widest text-[10px]">Customer Details</TableHead>
            <TableHead className="font-black text-white/40 py-6 px-8 uppercase tracking-widest text-[10px]">Total & Payment</TableHead>
            <TableHead className="font-black text-white/40 py-6 px-8 uppercase tracking-widest text-[10px]">Current Status</TableHead>
            <TableHead className="font-black text-white/40 py-6 px-8 uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
              {/* Order ID */}
              <TableCell className="py-6 px-8 align-top">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 group/id">
                    <span className="font-mono text-[11px] font-bold text-white/80">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(order.id)}
                      className="opacity-0 group-hover/id:opacity-100 transition-opacity text-white/20 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30 font-medium whitespace-nowrap">
                    {new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </TableCell>

              {/* Customer */}
              <TableCell className="py-6 px-8 align-top">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-sm">{(order.recipient?.name || "C")[0].toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate max-w-[180px]">
                      {order.recipient?.name || "Unknown Customer"}
                    </p>
                    <p className="text-[10px] text-white/40 font-bold truncate tracking-tight">{order.recipient?.email || "No email"}</p>
                    <p className="text-[10px] text-white/40 font-bold tracking-tight mt-0.5">{order.recipient?.phone || "No phone"}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px] font-bold border-white/[0.06] text-white/40 bg-white/[0.02]">
                        {order.items?.length || 0} Items
                      </Badge>
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Total & Payment */}
              <TableCell className="py-6 px-8 align-top">
                <div className="space-y-2">
                  <p className="text-xl font-black text-white tracking-tighter">₹{order.total.toLocaleString('en-IN')}</p>
                  <div className="flex flex-wrap gap-1">
                    {order.isCOD ? (
                      <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", paymentMethodStyles.cod)}>
                        COD
                      </Badge>
                    ) : order.codPaymentRazorpayOrderId ? (
                      <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", paymentMethodStyles.codToOnline)}>
                        COD → Online
                      </Badge>
                    ) : (
                      <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", paymentMethodStyles.online)}>
                        Online Paid
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Status */}
              <TableCell className="py-6 px-8 align-top">
                <div className="space-y-3">
                  <StatusBadge status={order.status} />
                  <Select
                    defaultValue={order.status}
                    disabled={updatingId === order.id}
                    onValueChange={val => onUpdateStatus(order.id, val)}
                  >
                    <SelectTrigger className="h-8 w-[130px] rounded-xl border-white/[0.06] bg-white/[0.02] font-bold text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-all shadow-xl">
                      <SelectValue placeholder="Update" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/[0.06] text-white">
                      {["created", "processing", "shipped", "delivered", "cancelled"].map(s => (
                        <SelectItem key={s} value={s} className="text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell className="py-6 px-8 text-right align-top">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewDetails(order)}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/20 transition-all text-white group/btn"
                    title="View Full Details"
                  >
                    <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  </button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-white/40 hover:text-white">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#111] border-white/[0.06] text-white rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                      <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-white/20 px-3 py-2">Quick Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                      <DropdownMenuItem onClick={() => onViewDetails(order)} className="rounded-xl hover:bg-white/5 font-bold text-sm px-3 py-2 cursor-pointer transition-colors">
                        View Order Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyToClipboard(order.id)} className="rounded-xl hover:bg-white/5 font-bold text-sm px-3 py-2 cursor-pointer transition-colors">
                        Copy Order ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                      <DropdownMenuItem className="rounded-xl hover:bg-red-500/10 text-red-400 font-bold text-sm px-3 py-2 cursor-pointer transition-colors">
                        Cancel Order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
