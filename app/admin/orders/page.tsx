"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Filter, Search, MoreHorizontal, ShoppingCart } from "lucide-react";

const ADMIN_EMAIL = "admin@miksandchiks.com"; // Recommended: Move to env

const statusStyles: any = {
  created: "bg-neutral-100 text-neutral-600 border-neutral-200",
  processing: "bg-amber-100 text-amber-600 border-amber-200",
  shipped: "bg-blue-100 text-blue-600 border-blue-200",
  delivered: "bg-green-100 text-green-600 border-green-200",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetching, setFetching] = useState(true);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(o => o.status === statusFilter));
    }
  }, [statusFilter, orders]);

  const fetchOrders = async () => {
    setFetching(true);
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setOrders(fetched);
      setFilteredOrders(fetched);
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setFetching(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { status });
      toast.success("Order status updated");
      fetchOrders();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-neutral-100 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <LayoutDashboard className="w-10 h-10" />
            </div>
          <h1 className="text-3xl font-black text-neutral-900 mb-4">Access Denied</h1>
          <p className="text-neutral-500 mb-8">You do not have the necessary permissions to access the administrator dashboard.</p>
          <a href="/" className="inline-block bg-neutral-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-500 transition-all">
            Return to Store
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg text-white">
                    <LayoutDashboard className="w-7 h-7" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-neutral-900">Admin Dashboard</h1>
                    <p className="text-neutral-500 font-medium tracking-tight">Manage all customer orders and statuses</p>
                </div>
            </div>

            <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-neutral-100 gap-2">
                <div className="px-6 py-2 border-r border-neutral-100">
                    <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-0.5">Total Orders</p>
                    <p className="text-2xl font-black text-neutral-900">{orders.length}</p>
                </div>
                <div className="px-6 py-2">
                    <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-0.5">Pending</p>
                    <p className="text-2xl font-black text-rose-500">{orders.filter(o => o.status !== 'delivered').length}</p>
                </div>
            </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 mb-8 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-neutral-400" />
                <span className="font-bold text-neutral-700">Filter by Status:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
                {["all", "created", "processing", "shipped", "delivered"].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                            "px-5 py-2 rounded-xl text-sm font-bold transition-all border capitalize",
                            statusFilter === s 
                                ? "bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-200" 
                                : "bg-white text-neutral-600 border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50"
                        )}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-xl shadow-rose-100/10 border border-neutral-100 overflow-hidden text-black">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow className="hover:bg-transparent border-neutral-100">
                <TableHead className="w-[120px] font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Order ID</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Customer / Items</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Total</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetching ? (
                  <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-rose-400 border-r-transparent"></div>
                      </TableCell>
                  </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-neutral-400 italic">
                    No orders matching this criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="font-mono text-[11px] text-neutral-400 py-6 px-8">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-tighter truncate max-w-[200px] mb-2">{order.userId}</p>
                          <div className="flex flex-wrap gap-1">
                              {order.items.map((item: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-[10px] font-medium border-neutral-200 text-neutral-600 bg-white">
                                      {item.name} × {item.quantity}
                                  </Badge>
                              ))}
                          </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <span className="text-lg font-black text-neutral-900">₹{order.total}</span>
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", statusStyles[order.status] || statusStyles.created)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 px-8 text-right">
                      <Select
                        defaultValue={order.status}
                        onValueChange={(val) => updateStatus(order.id, val)}
                      >
                        <SelectTrigger className="w-[140px] ml-auto rounded-xl border-neutral-200 font-bold text-xs shadow-sm bg-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-neutral-200">
                          <SelectItem value="created" className="text-xs font-bold">Created</SelectItem>
                          <SelectItem value="processing" className="text-xs font-bold">Processing</SelectItem>
                          <SelectItem value="shipped" className="text-xs font-bold">Shipped</SelectItem>
                          <SelectItem value="delivered" className="text-xs font-bold">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
