"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Shield, AlertTriangle, Activity, Ban, Clock, CheckCircle, XCircle, TrendingUp, Eye, Lock, Wifi, WifiOff, Filter, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SecurityLog {
  id: string;
  type: "SECURITY" | "ADMIN_ACTION" | "AUTH";
  action: string;
  userId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILED";
  metadata?: any;
  timestamp: any;
  isNew?: boolean; // Flag for real-time updates
}

interface BlockedIP {
  identifier: string;
  reason?: string;
  timestamp: number;
  duration: number;
}

interface SecurityStats {
  totalLogs: number;
  failedAttempts: number;
  blockedIPs: number;
  adminActions: number;
  recentActivity: SecurityLog[];
}

interface PaginationInfo {
  limit: number;
  offset: number;
  hasMore: boolean;
  totalCount: number;
}

interface FilterState {
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  userId: string;
  action: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const DEFAULT_LIMIT = 50;

export default function SecurityDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Real-time connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // Filter and pagination state
  const [filters, setFilters] = useState<FilterState>({
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    type: searchParams.get("type") || "",
    status: searchParams.get("status") || "",
    userId: searchParams.get("userId") || "",
    action: searchParams.get("action") || "",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
    offset: parseInt(searchParams.get("offset") || "0"),
    hasMore: false,
    totalCount: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedAction, setDebouncedAction] = useState(filters.action);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkAdminAccess();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchSecurityData();
      setupEventSource();
    }
    
    return () => {
      cleanupEventSource();
    };
  }, [user]);

  // Setup SSE connection for real-time security events
  const setupEventSource = useCallback(async () => {
    if (!user) return;
    
    // Clean up existing connection
    cleanupEventSource();
    
    setConnectionStatus('connecting');
    
    try {
      const token = await user.getIdToken();
      const eventSource = new EventSource(`/api/admin/security/events?token=${token}`);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('[SSE] Connected to security event stream');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };
      
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('[SSE]', data.message);
      });
      
      eventSource.addEventListener('security-log', (event) => {
        const newLog: SecurityLog = JSON.parse(event.data);
        
        // Add to recent activity with highlight flag
        setStats(prev => {
          if (!prev) return prev;
          
          // Check if log already exists
          if (prev.recentActivity.some(log => log.id === newLog.id)) {
            return prev;
          }
          
          const updatedActivity = [{ ...newLog, isNew: true }, ...prev.recentActivity].slice(0, 50);
          
          // Update stats based on log type
          const isFailedAuth = newLog.status === 'FAILED' && newLog.type === 'AUTH';
          const isAdminAction = newLog.type === 'ADMIN_ACTION';
          
          return {
            ...prev,
            totalLogs: prev.totalLogs + 1,
            failedAttempts: isFailedAuth ? prev.failedAttempts + 1 : prev.failedAttempts,
            adminActions: isAdminAction ? prev.adminActions + 1 : prev.adminActions,
            recentActivity: updatedActivity,
          };
        });
        
        setLastUpdate(new Date());
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
          setStats(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              recentActivity: prev.recentActivity.map(log => 
                log.id === newLog.id ? { ...log, isNew: false } : log
              ),
            };
          });
        }, 5000);
      });
      
      eventSource.addEventListener('heartbeat', () => {
        setLastUpdate(new Date());
      });
      
      eventSource.addEventListener('error', (event) => {
        console.error('[SSE] Error:', event);
        setConnectionStatus('error');
        
        // Attempt reconnection with exponential backoff
        const maxDelay = 30000; // 30 seconds max
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            setupEventSource();
          }
        }, delay);
      });
      
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        setConnectionStatus('disconnected');
        eventSource.close();
        
        // Attempt reconnection
        const maxDelay = 30000;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            setupEventSource();
          }
        }, delay);
      };
      
    } catch (error) {
      console.error('[SSE] Failed to setup:', error);
      setConnectionStatus('error');
    }
  }, [user]);

  // Clean up SSE connection
  const cleanupEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect when page becomes visible
        if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
          setupEventSource();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionStatus, setupEventSource]);

  async function checkAdminAccess() {
    try {
      const token = await user?.getIdToken();
      if (!token) return;
      
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        router.push("/admin");
        toast.error("Admin access required");
      }
    } catch (error) {
      router.push("/admin");
    }
  }

  // Build query string from filters and pagination
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", String(pagination.limit));
    params.set("offset", String(pagination.offset));
    
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (filters.userId) params.set("userId", filters.userId);
    if (debouncedAction) params.set("action", debouncedAction);
    
    return params.toString();
  }, [filters, pagination.limit, pagination.offset, debouncedAction]);

  // Update URL with current filters
  const updateURL = useCallback(() => {
    const queryString = buildQueryString();
    router.replace(`/admin/security?${queryString}`, { scroll: false });
  }, [buildQueryString, router]);

  // Apply filters and fetch data
  async function fetchSecurityData() {
    setLoadingData(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const queryString = buildQueryString();

      // Fetch security logs with filters
      const logsRes = await fetch(`/api/admin/security/logs?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logsData = await logsRes.json();

      // Fetch blocked IPs
      const blocksRes = await fetch("/api/admin/security/blocks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blocksData = await blocksRes.json();

      // Calculate stats
      const logs: SecurityLog[] = logsData.logs || [];
      const blocked: BlockedIP[] = blocksData.blocks || [];

      const failedAttempts = logs.filter(
        (log) => log.status === "FAILED" && log.type === "AUTH"
      ).length;

      const adminActions = logs.filter(
        (log) => log.type === "ADMIN_ACTION"
      ).length;

      setStats({
        totalLogs: logsData.totalCount || logs.length,
        failedAttempts,
        blockedIPs: blocked.length,
        adminActions,
        recentActivity: logs,
      });

      setPagination(prev => ({
        ...prev,
        hasMore: logsData.pagination?.hasMore || false,
        totalCount: logsData.totalCount || 0,
      }));

      setBlockedIPs(blocked);
    } catch (error) {
      console.error("Failed to fetch security data:", error);
      toast.error("Failed to load security data");
    } finally {
      setLoadingData(false);
    }
  }

  // Debounce action filter
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedAction(filters.action);
    }, 300);
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [filters.action]);

  // Fetch data when filters or pagination change
  useEffect(() => {
    if (user) {
      fetchSecurityData();
      updateURL();
    }
  }, [filters.type, filters.status, filters.userId, debouncedAction, pagination.limit, pagination.offset]);

  // Handle date filter changes (apply on button click)
  const applyDateFilters = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchSecurityData();
    updateURL();
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      type: "",
      status: "",
      userId: "",
      action: "",
    });
    setDebouncedAction("");
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  // Pagination handlers
  const goToPage = (newOffset: number) => {
    setPagination(prev => ({ ...prev, offset: Math.max(0, newOffset) }));
  };

  const goToFirstPage = () => goToPage(0);
  const goToPreviousPage = () => goToPage(pagination.offset - pagination.limit);
  const goToNextPage = () => goToPage(pagination.offset + pagination.limit);
  const goToLastPage = () => {
    const lastOffset = Math.floor((pagination.totalCount - 1) / pagination.limit) * pagination.limit;
    goToPage(lastOffset);
  };

  function formatTimestamp(timestamp: any): string {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Unknown";
    }
  }

  function getStatusBadge(status: "SUCCESS" | "FAILED") {
    return status === "SUCCESS" ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  }

  function getTypeBadge(type: string) {
    const styles: Record<string, string> = {
      SECURITY: "bg-purple-50 text-purple-700 border-purple-200",
      ADMIN_ACTION: "bg-blue-50 text-blue-700 border-blue-200",
      AUTH: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return (
      <Badge variant="outline" className={styles[type] || styles.SECURITY}>
        {type.replace("_", " ")}
      </Badge>
    );
  }

  function getActionIcon(action: string) {
    if (action.includes("BLOCK") || action.includes("BLOCKED")) {
      return <Ban className="w-4 h-4" />;
    }
    if (action.includes("FAILED") || action.includes("EXCEEDED")) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Activity className="w-4 h-4" />;
  }

  async function unblockIP(identifier: string) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/blocks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ identifier }),
      });

      if (res.ok) {
        toast.success("IP unblocked");
        fetchSecurityData();
      } else {
        toast.error("Failed to unblock IP");
      }
    } catch (error) {
      toast.error("Failed to unblock IP");
    }
  }

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  // Connection status indicator component
  const ConnectionStatusIndicator = () => {
    const statusConfig = {
      connected: { icon: Wifi, color: 'text-green-500', bg: 'bg-green-50', label: 'Live' },
      connecting: { icon: Wifi, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Connecting...' },
      disconnected: { icon: WifiOff, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Offline' },
      error: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
    };
    
    const config = statusConfig[connectionStatus];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        {lastUpdate && connectionStatus === 'connected' && (
          <span className="text-xs text-gray-400">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          </div>
          <ConnectionStatusIndicator />
        </div>
        <p className="text-gray-600">
          Monitor security events, blocked IPs, and admin activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Events
            </CardTitle>
            <Activity className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLogs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Last 50 logs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Failed Attempts
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedAttempts || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Auth failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Blocked IPs
            </CardTitle>
            <Ban className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.blockedIPs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Currently blocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Admin Actions
            </CardTitle>
            <Eye className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.adminActions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Admin operations</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="w-4 h-4 mr-2" />
            Activity Feed
          </TabsTrigger>
          <TabsTrigger value="blocked">
            <Lock className="w-4 h-4 mr-2" />
            Blocked IPs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentActivity.map((log) => (
                      <TableRow 
                        key={log.id}
                        className={log.isNew ? 'bg-green-50 transition-colors duration-500' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.isNew && (
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                            )}
                            {getTypeBadge(log.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="font-medium">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ip || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">No security events found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Feed Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Complete Activity Log</CardTitle>
                  <p className="text-sm text-gray-500">All security and admin events</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">
                      {Object.values(filters).filter(v => v !== "").length}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            {/* Filter Panel */}
            {showFilters && (
              <CardContent className="border-b bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date Range</label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="flex-1"
                      />
                      <span className="text-gray-400 self-center">to</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  {/* Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="SECURITY">Security</option>
                      <option value="ADMIN_ACTION">Admin Action</option>
                      <option value="AUTH">Authentication</option>
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="SUCCESS">Success</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>
                  
                  {/* User ID Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">User ID</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by user ID..."
                        value={filters.userId}
                        onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  {/* Action Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Action</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by action..."
                        value={filters.action}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  {/* Apply/Clear Buttons */}
                  <div className="space-y-2 flex items-end">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={applyDateFilters}
                        className="flex-1"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
            
            {/* Pagination Info */}
            <CardContent className="border-b py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.totalCount)} of {pagination.totalCount} results
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), offset: 0 }))}
                    className="h-8 px-2 rounded-md border border-gray-300 bg-white text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </CardContent>
            
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentActivity.map((log) => (
                      <TableRow 
                        key={log.id}
                        className={log.isNew ? 'bg-green-50 transition-colors duration-500' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.isNew && (
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                            )}
                            {getTypeBadge(log.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="font-medium">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.userId ? (
                            <div className="text-sm">
                              <div className="font-medium">{log.userId.substring(0, 8)}...</div>
                              {log.role && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {log.role}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-gray-500">
                          {log.metadata ? JSON.stringify(log.metadata) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No activity found</p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
              
              {/* Pagination Controls */}
              {pagination.totalCount > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.totalCount / pagination.limit)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToFirstPage}
                      disabled={pagination.offset === 0}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={pagination.offset === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={!pagination.hasMore}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToLastPage}
                      disabled={!pagination.hasMore}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked IPs Tab */}
        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently Blocked IPs</CardTitle>
              <p className="text-sm text-gray-500">
                Automatically or manually blocked identifiers
              </p>
            </CardHeader>
            <CardContent>
              {blockedIPs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked At</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIPs.map((block) => (
                      <TableRow key={block.identifier}>
                        <TableCell className="font-mono">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {block.identifier}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {block.reason || "Manual block"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatTimestamp(block.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {Math.round(block.duration / 60)} min
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unblockIP(block.identifier)}
                          >
                            Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="text-gray-500">No blocked IPs at the moment</p>
                  <p className="text-sm text-gray-400 mt-1">
                    System is secure - no threats detected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto-refresh hint */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Dashboard updates automatically when you refresh the page</p>
      </div>
    </div>
  );
}
