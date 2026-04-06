"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Users, Shield, Ban, CheckCircle, AlertTriangle, Loader2, Search, Eye, Download, Filter, X } from "lucide-react";
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
import Link from "next/link";

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
  
  // Advanced filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting
  const [sortBy, setSortBy] = useState<"name" | "email" | "joined">("joined");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Bulk Operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{ action: string; count: number } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingData(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        // Parse createdAt strings back to Date objects
        const users = (data.users || []).map((u: any) => ({
          ...u,
          createdAt: u.createdAt ? new Date(u.createdAt) : null,
        }));
        setUsers(users);
      } else {
        toast.error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

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
  }, [user, loading, profile, router, fetchUsers]);

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

  // Filter, sort, and paginate users
  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
      const matchesSearch = 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && !u.blocked) ||
        (statusFilter === "blocked" && u.blocked);
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "joined":
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          comparison = aTime - bTime;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Export users to CSV
  const exportUsers = () => {
    const headers = ["Email", "Name", "Role", "Status", "Joined"];
    const rows = filteredUsers.map(u => [
      u.email,
      u.name || "",
      u.role,
      u.blocked ? "Blocked" : "Active",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exported ${filteredUsers.length} users`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  // ── Bulk Operations ───────────────────────────────────────────────────────
  function toggleUserSelection(id: string) {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  function selectAllUsers() {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  }

  async function executeBulkAction(action: string) {
    if (selectedUsers.size === 0) return;
    setBulkActionLoading(true);
    
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const ids = Array.from(selectedUsers);
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ids }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`${action} completed for ${ids.length} users`);
        setSelectedUsers(new Set());
        fetchUsers();
      } else {
        toast.error(data.error || "Bulk action failed");
      }
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Bulk action failed");
    } finally {
      setBulkActionLoading(false);
      setShowBulkConfirm(null);
    }
  }

  const hasActiveFilters = searchTerm || roleFilter !== "all" || statusFilter !== "all";

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

      {/* Search & Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-blue-50" : ""}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">!</Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={exportUsers}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Bulk Action Bar */}
        {selectedUsers.size > 0 && (
          <div className="mx-6 mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {profile?.role === "superadmin" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkConfirm({ action: "set_customer", count: selectedUsers.size })}
                    disabled={bulkActionLoading}
                  >
                    Set as Customer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkConfirm({ action: "set_admin", count: selectedUsers.size })}
                    disabled={bulkActionLoading}
                  >
                    Set as Admin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkConfirm({ action: "block", count: selectedUsers.size })}
                    disabled={bulkActionLoading}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <Ban className="w-4 h-4 mr-1" /> Block
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkConfirm({ action: "unblock", count: selectedUsers.size })}
                    disabled={bulkActionLoading}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Unblock
                  </Button>
                </>
              )}
              <div className="w-px h-6 bg-blue-200 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers(new Set())}
                className="text-blue-700"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Role:</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">SuperAdmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Status:</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}

              <div className="ml-auto text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.id))}
                    onChange={selectAllUsers}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>
                  <button 
                    onClick={() => {
                      if (sortBy === "email") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else { setSortBy("email"); setSortOrder("asc"); }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Email {sortBy === "email" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    onClick={() => {
                      if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else { setSortBy("name"); setSortOrder("asc"); }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>
                  <button 
                    onClick={() => {
                      if (sortBy === "joined") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else { setSortBy("joined"); setSortOrder("desc"); }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Joined {sortBy === "joined" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id} className={selectedUsers.has(user.id) ? "bg-blue-50/50" : "group"}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/admin/users/${user.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {user.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${user.id}`} className="hover:text-blue-600 transition-colors">
                      {user.name}
                    </Link>
                  </TableCell>
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
                      {/* View Details Button */}
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      
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
                <p>No users found matching &quot;{searchTerm}&quot;</p>
              ) : (
                <p>No users found</p>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <p className="text-gray-500 text-sm">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) pageNum = currentPage - 2 + i;
                      if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9 h-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
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

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={!!showBulkConfirm} onOpenChange={() => setShowBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Confirm Bulk Action
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>{showBulkConfirm?.action.replace("_", " ")}</strong> {showBulkConfirm?.count} user{showBulkConfirm?.count !== 1 ? "s" : ""}?
              <p className="mt-2 text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBulkConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showBulkConfirm && executeBulkAction(showBulkConfirm.action)}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
