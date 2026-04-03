"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Tag, Plus, Edit, Trash2, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export default function CouponsManagementPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: 10,
    minOrder: 0,
    maxDiscount: undefined as number | undefined,
    usageLimit: 100,
    expiresAt: "",
    active: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user && profile?.role !== "superadmin") {
      router.push("/admin");
      toast.error("Superadmin access required");
      return;
    }

    if (user) {
      fetchCoupons();
    }
  }, [user, loading, profile, router]);

  async function fetchCoupons() {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCoupons(data.coupons || []);
      } else {
        toast.error(data.error || "Failed to fetch coupons");
      }
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/coupons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Coupon ${formData.code} created successfully`);
        setCreateDialogOpen(false);
        resetForm();
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to create coupon");
      }
    } catch (error) {
      console.error("Create coupon error:", error);
      toast.error("Failed to create coupon");
    }
  }

  async function handleUpdate() {
    if (!editingCoupon) return;

    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/coupons/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: editingCoupon.code,
          updates: {
            active: editingCoupon.active,
            usageLimit: editingCoupon.usageLimit,
            maxDiscount: editingCoupon.maxDiscount,
            expiresAt: editingCoupon.expiresAt,
          },
        }),
      });

      // Safe JSON parsing
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Invalid response from server:", parseError);
        throw new Error("Server returned invalid response");
      }

      if (res.ok && data.success) {
        toast.success("Coupon updated successfully");
        setEditingCoupon(null);
        fetchCoupons();
      } else {
        toast.error(data?.error || "Failed to update coupon");
      }
    } catch (error) {
      console.error("Update coupon error:", error);
      toast.error("Failed to update coupon");
    }
  }

  async function toggleActive(coupon: Coupon) {
    setEditingCoupon({ ...coupon, active: !coupon.active });
    
    // Optimistic update
    setCoupons(prev => prev.map(c => 
      c.id === coupon.id ? { ...c, active: !c.active } : c
    ));
  }

  function resetForm() {
    setFormData({
      code: "",
      type: "percentage",
      value: 10,
      minOrder: 0,
      maxDiscount: undefined,
      usageLimit: 100,
      expiresAt: "",
      active: true,
    });
  }

  function openEditDialog(coupon: Coupon) {
    setEditingCoupon(coupon);
  }

  function formatDate(dateString: any): string {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch {
      return "Invalid date";
    }
  }

  function getTypeBadge(type: string) {
    return (
      <Badge variant="outline" className={
        type === "percentage" 
          ? "bg-blue-50 text-blue-700 border-blue-200" 
          : "bg-purple-50 text-purple-700 border-purple-200"
      }>
        {type === "percentage" ? "%" : "₹"} {type}
      </Badge>
    );
  }

  function getUsageProgress(usedCount: number, usageLimit: number) {
    const percentage = Math.round((usedCount / usageLimit) * 100);
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{usedCount} / {usageLimit}</span>
          <span className={`${percentage > 80 ? 'text-red-600' : 'text-gray-600'}`}>
            {percentage}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              percentage > 80 ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Tag className="w-12 h-12 mx-auto mb-4 animate-spin text-blush" />
          <p className="text-gray-600">Loading coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-8 h-8 text-blush" />
            <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
          </div>
          <p className="text-gray-600">
            Create and manage discount codes
          </p>
        </div>
        
        <Button
          onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}
          className="bg-blush hover:bg-[#f48c82] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Coupons
            </CardTitle>
            <Tag className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {coupons.filter(c => c.active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Usage
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Redemptions across all coupons</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Discount Given
            </CardTitle>
            <Tag className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{coupons.reduce((sum, c) => {
              // Rough estimate based on usage
              return sum + (c.type === "fixed" ? c.value * c.usedCount : 0);
            }, 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Fixed discounts only</p>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-bold">{coupon.code}</TableCell>
                  <TableCell>{getTypeBadge(coupon.type)}</TableCell>
                  <TableCell>
                    {coupon.type === "percentage" 
                      ? `${coupon.value}%` 
                      : `₹${coupon.value}`}
                    {coupon.maxDiscount && (
                      <div className="text-xs text-gray-500">
                        Max: ₹{coupon.maxDiscount}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {coupon.minOrder > 0 ? `₹${coupon.minOrder}` : "None"}
                  </TableCell>
                  <TableCell className="w-48">
                    {getUsageProgress(coupon.usedCount, coupon.usageLimit)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(coupon.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      coupon.active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }>
                      {coupon.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className="hover:opacity-70 transition-opacity"
                        title={coupon.active ? "Deactivate" : "Activate"}
                      >
                        {coupon.active ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditDialog(coupon)}
                        className="hover:opacity-70 transition-opacity text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {coupons.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No coupons yet</p>
              <p className="text-sm mt-1">Create your first coupon to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Set up a discount code for your customers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SAVE20"
                  className="uppercase"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Discount Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value">Discount Value *</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: parseInt(e.target.value) || 0})}
                  min={0}
                  max={formData.type === "percentage" ? 100 : undefined}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === "percentage" ? "0-100%" : "In rupees"}
                </p>
              </div>

              <div>
                <Label htmlFor="minOrder">Minimum Order</Label>
                <Input
                  id="minOrder"
                  type="number"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({...formData, minOrder: parseInt(e.target.value) || 0})}
                  min={0}
                  placeholder="0"
                />
              </div>
            </div>

            {formData.type === "percentage" && (
              <div>
                <Label htmlFor="maxDiscount">Maximum Discount (Optional)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={formData.maxDiscount || ""}
                  onChange={(e) => setFormData({...formData, maxDiscount: parseInt(e.target.value) || undefined})}
                  min={0}
                  placeholder="₹200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cap the discount amount for percentage coupons
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({...formData, usageLimit: parseInt(e.target.value) || 100})}
                  min={1}
                />
                <p className="text-xs text-gray-500 mt-1">Total redemptions allowed</p>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.code || !formData.value}
              className="bg-blush hover:bg-[#f48c82]"
            >
              Create Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCoupon && editingCoupon.code !== formData.code} onOpenChange={() => setEditingCoupon(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Update coupon settings
            </DialogDescription>
          </DialogHeader>
          
          {editingCoupon && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Coupon Code</div>
                <div className="text-2xl font-bold">{editingCoupon.code}</div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={editingCoupon.active}
                  onCheckedChange={(checked) => setEditingCoupon({...editingCoupon, active: checked})}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>

              <div>
                <Label htmlFor="edit-usageLimit">Usage Limit</Label>
                <Input
                  id="edit-usageLimit"
                  type="number"
                  value={editingCoupon.usageLimit}
                  onChange={(e) => setEditingCoupon({...editingCoupon, usageLimit: parseInt(e.target.value) || 100})}
                  min={1}
                />
              </div>

              <div>
                <Label htmlFor="edit-expiresAt">Expiration Date</Label>
                <Input
                  id="edit-expiresAt"
                  type="datetime-local"
                  value={editingCoupon.expiresAt ? new Date(editingCoupon.expiresAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditingCoupon({...editingCoupon, expiresAt: e.target.value ? new Date(e.target.value) : undefined})}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCoupon(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-blush hover:bg-[#f48c82]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
