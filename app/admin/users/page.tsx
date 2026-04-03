"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Users, Shield, Ban, CheckCircle, AlertTriangle, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin" | "superadmin";
  createdAt: Date | null;
  blocked?: boolean;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [blocking, setBlocking] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user && profile?.role !== "admin" && profile?.role !== "superadmin") {
      router.push("/admin");
      toast.error("Admin access required");
      return;
    }

    if (user) {
      fetchUsers();
    }
  }, [user, loading, profile, router]);

  async function fetchUsers() {
    setLoadingData(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingData(false);
    }
  }

  async function updateRole(userId: string, newRole: string) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: userId, role: newRole }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers(); // Refresh list
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    }
  }

  async function blockUser() {
    if (!selectedUser) return;

    setBlocking(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          blocked: !selectedUser.blocked, // Toggle block status
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          selectedUser.blocked 
            ? `User ${selectedUser.email} unblocked` 
            : `User ${selectedUser.email} blocked`
        );
        setBlockDialogOpen(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh list
      } else {
        toast.error(data.error || "Failed to update block status");
      }
    } catch (error) {
      console.error("Failed to block/unblock user:", error);
      toast.error("Failed to update block status");
    } finally {
      setBlocking(false);
    }
  }

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

  function canManageUser(targetRole: string) {
    // Superadmins can manage everyone except other superadmins
    if (profile?.role === "superadmin") {
      return targetRole !== "superadmin";
    }
    // Admins can only manage customers
    if (profile?.role === "admin") {
      return targetRole === "customer";
    }
    return false;
  }

  // Filter users by search term
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
        <p className="text-gray-600">
          Manage user roles and permissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-gray-500 mt-1">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Customers
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "customer").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Regular users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Admins
            </CardTitle>
            <Shield className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => ["admin", "superadmin"].includes(u.role)).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {user.createdAt ? (
                      new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(user.createdAt)
                    ) : (
                      <span className="text-gray-400">Not available</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Role Selector - Only if can manage */}
                      {canManageUser(user.role) ? (
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value) => updateRole(user.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            {profile?.role === "superadmin" && (
                              <SelectItem value="admin">Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {user.role === "superadmin" ? "Protected" : "No Access"}
                        </Badge>
                      )}

                      {/* Block/Unblock Button - Only superadmins can block */}
                      {profile?.role === "superadmin" && user.role !== "superadmin" && (
                        <Button
                          variant={user.blocked ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setBlockDialogOpen(true);
                          }}
                          className={user.blocked ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
                        >
                          {user.blocked ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="w-4 h-4 mr-1" />
                              Block
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? (
                <p>No users found matching "{searchTerm}"</p>
              ) : (
                <p>No users found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Block User
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will {selectedUser?.blocked ? "unblock" : "block"} {selectedUser?.email}. Are you sure?
              {selectedUser?.blocked ? (
                <p className="mt-2 text-sm text-green-600 font-semibold">
                  User will be able to access the system again
                </p>
              ) : (
                <p className="mt-2 text-sm text-red-600 font-semibold">
                  User will not be able to access the system
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={blockUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={blocking}
            >
              {blocking 
                ? (selectedUser?.blocked ? "Unblocking..." : "Blocking...") 
                : (selectedUser?.blocked ? "Unblock User" : "Block User")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
