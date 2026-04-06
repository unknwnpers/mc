"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import {
  User, Mail, Phone, MapPin, Calendar, ShoppingBag,
  ArrowLeft, Loader2, Shield, Ban, CheckCircle, Clock,
  Package, MapPinned, Activity, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-700 border-yellow-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  created: "bg-neutral-100 text-neutral-600 border-neutral-200",
  processing: "bg-amber-100 text-amber-600 border-amber-200",
  shipped: "bg-blue-100 text-blue-600 border-blue-200",
  delivered: "bg-green-100 text-green-600 border-green-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  failed: "bg-red-200 text-red-700 border-red-300",
};

interface UserDetails {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: "customer" | "admin" | "superadmin";
  blocked?: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

interface UserStats {
  totalSpent: number;
  orderCount: number;
  addressCount: number;
  lastLogin?: Date;
}

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt?: Date;
  items?: any[];
}

interface LoginLog {
  id: string;
  ip?: string;
  status: string;
  timestamp?: Date;
  userAgent?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  isNewDevice?: boolean;
  isNewLocation?: boolean;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUserDetails(data.user);
        setStats(data.stats);
        setAddresses(data.addresses || []);
        setOrders(data.orders || []);
        setLoginHistory(data.loginHistory || []);
      } else {
        toast.error(data.error || "Failed to fetch user details");
        router.push("/admin/users");
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    if (user && (profile?.role === "admin" || profile?.role === "superadmin")) {
      fetchUserDetails();
    }
  }, [user, profile, fetchUserDetails]);

  function getRoleBadge(role: string) {
    const styles: Record<string, string> = {
      customer: "bg-gray-50 text-gray-700 border-gray-200",
      admin: "bg-blue-50 text-blue-700 border-blue-200",
      superadmin: "bg-purple-50 text-purple-700 border-purple-200",
    };

    return (
      <Badge variant="outline" className={styles[role] || styles.customer}>
        <Shield className="w-3 h-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">User not found</p>
        <Button onClick={() => router.push("/admin/users")} className="mt-4">
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/users")}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {userDetails.name?.[0]?.toUpperCase() || userDetails.email[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{userDetails.name || "Unknown User"}</h1>
              <p className="text-gray-500">{userDetails.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge(userDetails.role)}
                {userDetails.blocked && (
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                    <Ban className="w-3 h-3 mr-1" />
                    Blocked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            <ShoppingBag className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats?.totalSpent || 0).toLocaleString("en-IN")}</div>
            <p className="text-xs text-gray-500 mt-1">Lifetime spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orderCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saved Addresses</CardTitle>
            <MapPinned className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.addressCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Delivery addresses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Last Login</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats?.lastLogin
                ? new Date(stats.lastLogin).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Never"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.lastLogin
                ? new Date(stats.lastLogin).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="font-medium">{userDetails.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{userDetails.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{userDetails.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Joined</p>
                <p className="font-medium">
                  {userDetails.createdAt
                    ? new Date(userDetails.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Orders, Addresses, Login History */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="addresses">Addresses ({addresses.length})</TabsTrigger>
          <TabsTrigger value="logins">Login History</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="pt-6">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 12)}...</TableCell>
                        <TableCell>
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyles[order.status] || statusStyles.created}
                          >
                            {order.status?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{(order.total || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/orders`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardContent className="pt-6">
              {addresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPinned className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No saved addresses</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={cn(
                        "p-4 rounded-xl border",
                        addr.isDefault ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{addr.name}</span>
                          <Badge variant="outline" className="text-xs">{addr.label}</Badge>
                          {addr.isDefault && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">+91 {addr.phone}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {addr.addressLine1}
                        {addr.addressLine2 && `, ${addr.addressLine2}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins">
          <Card>
            <CardContent className="pt-6">
              {loginHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No login history available</p>
                  <p className="text-xs mt-1">Login history is only tracked for admin users</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.ip || "—"}</TableCell>
                        <TableCell>
                          {log.location ? (
                            <span>
                              {log.location.city && `${log.location.city}, `}
                              {log.location.region && `${log.location.region}`}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.isNewDevice && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                New Device
                              </Badge>
                            )}
                            {log.isNewLocation && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                New Location
                              </Badge>
                            )}
                            {!log.isNewDevice && !log.isNewLocation && (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              log.status === "SUCCESS"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {log.status === "SUCCESS" ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <Ban className="w-3 h-3 mr-1" />
                            )}
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
