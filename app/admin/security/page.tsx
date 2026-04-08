"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Shield, AlertTriangle, Activity, Ban, Clock, CheckCircle, XCircle, TrendingUp, Eye, Lock, Wifi, WifiOff, Filter, ChevronLeft, ChevronRight, Search, X, Settings, RotateCcw, Save, Bell, Skull, Flag, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

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
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<SecurityStats | null>(null);

  // Redirect non-superadmin users
  useEffect(() => {
    if (!loading && profile?.role !== "superadmin") {
      router.push("/admin");
    }
  }, [loading, profile, router]);
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
  
  // Sessions state
  interface AdminSession {
    id: string;
    userId: string;
    userEmail: string;
    role: string;
    ip: string;
    userAgent: string;
    loginTime: string;
    lastActivity: string;
  }
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionToTerminate, setSessionToTerminate] = useState<AdminSession | null>(null);

  // Security policies state
  interface SecurityPolicies {
    maxFailedAttempts: number;
    failedAttemptsWindow: number;
    autoBlockEnabled: boolean;
    blockDuration: number;
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
    sessionTimeout: number;
    maxConcurrentSessions: number;
    notifyOnBlock: boolean;
    notifyEmail?: string;
    updatedAt?: string;
    updatedBy?: string;
  }
  const [policies, setPolicies] = useState<SecurityPolicies | null>(null);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesSaving, setPoliciesSaving] = useState(false);
  const [policiesResetting, setPoliciesResetting] = useState(false);
  const [policyErrors, setPolicyErrors] = useState<Record<string, string>>({});

  // Threats state
  interface Threat {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source: { type: 'IP' | 'USER' | 'SESSION'; value: string };
    description: string;
    evidence: any[];
    detectedAt: string;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
    autoBlocked: boolean;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    resolution?: string;
  }
  const [threats, setThreats] = useState<Threat[]>([]);
  const [threatsLoading, setThreatsLoading] = useState(false);
  const [threatStats, setThreatStats] = useState({
    total: 0,
    activeCount: 0,
    criticalCount: 0,
    todayCount: 0,
  });
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [threatResolution, setThreatResolution] = useState('');
  const [threatFilter, setThreatFilter] = useState<'ALL' | 'ACTIVE' | 'CRITICAL'>('ALL');

  // Alert config state
  interface AlertChannel {
    type: 'EMAIL' | 'WEBHOOK' | 'DASHBOARD' | 'SLACK';
    enabled: boolean;
    config: any;
  }
  interface AlertConfig {
    minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    channels: AlertChannel[];
    throttleMinutes: number;
    digestEnabled: boolean;
    digestFrequency: 'HOURLY' | 'DAILY';
    autoBlockCritical: boolean;
  }
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [alertConfigLoading, setAlertConfigLoading] = useState(false);
  const [alertConfigSaving, setAlertConfigSaving] = useState(false);

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
      
      eventSource.addEventListener('security-threat', (event) => {
        const newThreat: Threat = JSON.parse(event.data);
        
        // Add threat to list
        setThreats(prev => {
          // Check if threat already exists
          if (prev.some(t => t.id === newThreat.id)) {
            return prev;
          }
          return [newThreat, ...prev];
        });
        
        // Update threat stats
        setThreatStats(prev => ({
          total: prev.total + 1,
          activeCount: prev.activeCount + 1,
          criticalCount: newThreat.severity === 'CRITICAL' ? prev.criticalCount + 1 : prev.criticalCount,
          todayCount: prev.todayCount + 1,
        }));
        
        // Show toast notification
        toast.warning(
          <div>
            <strong>Security Threat Detected!</strong>
            <p className="text-sm">{newThreat.ruleName}: {newThreat.description}</p>
          </div>,
          { duration: 10000 }
        );
        
        setLastUpdate(new Date());
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

  // Threat helper functions
  function getSeverityBadge(severity: string) {
    const styles: Record<string, string> = {
      LOW: "bg-blue-50 text-blue-700 border-blue-200",
      MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
      HIGH: "bg-orange-50 text-orange-700 border-orange-200",
      CRITICAL: "bg-red-50 text-red-700 border-red-200",
    };
    const icons: Record<string, any> = {
      LOW: Activity,
      MEDIUM: AlertTriangle,
      HIGH: AlertTriangle,
      CRITICAL: Skull,
    };
    const Icon = icons[severity] || AlertTriangle;
    return (
      <Badge variant="outline" className={styles[severity] || styles.MEDIUM}>
        <Icon className="w-3 h-3 mr-1" />
        {severity}
      </Badge>
    );
  }

  function getThreatStatusBadge(status: string) {
    const styles: Record<string, string> = {
      ACTIVE: "bg-red-50 text-red-700 border-red-200",
      ACKNOWLEDGED: "bg-blue-50 text-blue-700 border-blue-200",
      RESOLVED: "bg-green-50 text-green-700 border-green-200",
      FALSE_POSITIVE: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.ACTIVE}>
        {status.replace("_", " ")}
      </Badge>
    );
  }

  // Filtered threats based on selected filter
  const filteredThreats = threats.filter((threat: Threat) => {
    if (threatFilter === 'ACTIVE') {
      return threat.status === 'ACTIVE' || threat.status === 'ACKNOWLEDGED';
    }
    if (threatFilter === 'CRITICAL') {
      return threat.severity === 'CRITICAL';
    }
    return true;
  });

  // Fetch threats from API
  async function fetchThreats() {
    setThreatsLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/threats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setThreats(data.threats || []);
      } else {
        toast.error("Failed to fetch threats");
      }

      // Also fetch stats
      const statsRes = await fetch("/api/admin/security/threats/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setThreatStats({
          total: statsData.stats.total || 0,
          activeCount: statsData.stats.activeCount || 0,
          criticalCount: statsData.stats.criticalCount || 0,
          todayCount: statsData.stats.todayCount || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch threats:", error);
      toast.error("Failed to fetch threats");
    } finally {
      setThreatsLoading(false);
    }
  }

  // Handle acknowledge threat
  async function handleAcknowledgeThreat(threat: Threat) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/threats", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threatId: threat.id, action: "acknowledge" }),
      });

      if (res.ok) {
        toast.success("Threat acknowledged");
        fetchThreats();
      } else {
        toast.error("Failed to acknowledge threat");
      }
    } catch (error) {
      toast.error("Failed to acknowledge threat");
    }
  }

  // Handle resolve threat
  async function handleResolveThreat(threat: Threat, resolution: string) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/threats", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threatId: threat.id, action: "resolve", resolution }),
      });

      if (res.ok) {
        toast.success("Threat resolved");
        setSelectedThreat(null);
        setThreatResolution('');
        fetchThreats();
      } else {
        toast.error("Failed to resolve threat");
      }
    } catch (error) {
      toast.error("Failed to resolve threat");
    }
  }

  // Handle mark as false positive
  async function handleFalsePositive(threat: Threat) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/threats", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threatId: threat.id, action: "false-positive" }),
      });

      if (res.ok) {
        toast.success("Marked as false positive");
        setSelectedThreat(null);
        fetchThreats();
      } else {
        toast.error("Failed to update threat");
      }
    } catch (error) {
      toast.error("Failed to update threat");
    }
  }

  // Alert configuration helper functions
  async function fetchAlertConfig() {
    setAlertConfigLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/alerts/config", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAlertConfig(data.config);
      } else {
        toast.error("Failed to fetch alert config");
      }
    } catch (error) {
      console.error("Failed to fetch alert config:", error);
      toast.error("Failed to fetch alert config");
    } finally {
      setAlertConfigLoading(false);
    }
  }

  async function saveAlertConfig() {
    if (!alertConfig) return;

    setAlertConfigSaving(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/alerts/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: alertConfig }),
      });

      if (res.ok) {
        toast.success("Alert configuration saved");
      } else {
        toast.error("Failed to save alert config");
      }
    } catch (error) {
      toast.error("Failed to save alert config");
    } finally {
      setAlertConfigSaving(false);
    }
  }

  function updateAlertConfigField(field: string, value: any) {
    setAlertConfig(prev => prev ? { ...prev, [field]: value } : null);
  }

  function updateAlertChannel(type: string, enabled: boolean) {
    setAlertConfig(prev => {
      if (!prev) return null;
      const channels = prev.channels || [];
      const existingIndex = channels.findIndex((c: AlertChannel) => c.type === type);
      
      if (existingIndex >= 0) {
        channels[existingIndex] = { ...channels[existingIndex], enabled };
      } else {
        channels.push({ type: type as any, enabled, config: {} });
      }
      
      return { ...prev, channels };
    });
  }

  function updateAlertChannelConfig(type: string, configUpdate: any) {
    setAlertConfig(prev => {
      if (!prev) return null;
      const channels = prev.channels || [];
      const existingIndex = channels.findIndex((c: AlertChannel) => c.type === type);
      
      if (existingIndex >= 0) {
        channels[existingIndex] = {
          ...channels[existingIndex],
          config: { ...channels[existingIndex].config, ...configUpdate },
        };
      }
      
      return { ...prev, channels };
    });
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

  // Fetch active admin sessions
  async function fetchSessions() {
    setLoadingSessions(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        toast.error("Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to fetch sessions");
    } finally {
      setLoadingSessions(false);
    }
  }

  // Terminate a session (force logout)
  async function handleTerminateSession(session: AdminSession) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (res.ok) {
        toast.success(`Session for ${session.userEmail} terminated`);
        fetchSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to terminate session");
      }
    } catch (error) {
      toast.error("Failed to terminate session");
    } finally {
      setSessionToTerminate(null);
    }
  }

  // Load sessions when tab changes to sessions
  useEffect(() => {
    if (activeTab === "sessions" && user) {
      fetchSessions();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchSessions, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, user]);

  // Load policies when tab changes to policies
  useEffect(() => {
    if (activeTab === "policies" && user) {
      fetchPolicies();
    }
  }, [activeTab, user]);

  // Load threats when tab changes to threats
  useEffect(() => {
    if (activeTab === "threats" && user) {
      fetchThreats();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchThreats, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, user]);

  // Fetch security policies
  async function fetchPolicies() {
    setPoliciesLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/policies", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
        setPolicyErrors({});
      } else {
        toast.error("Failed to fetch security policies");
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
      toast.error("Failed to fetch security policies");
    } finally {
      setPoliciesLoading(false);
    }
  }

  // Update security policies
  async function savePolicies() {
    if (!policies) return;

    setPoliciesSaving(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/policies", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ policies }),
      });

      const data = await res.json();

      if (res.ok) {
        setPolicies(data.policies);
        setPolicyErrors({});
        toast.success("Security policies updated successfully");
      } else {
        toast.error(data.error || "Failed to update policies");
      }
    } catch (error) {
      toast.error("Failed to update policies");
    } finally {
      setPoliciesSaving(false);
    }
  }

  // Reset policies to defaults
  async function resetPolicies() {
    setPoliciesResetting(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/security/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reset" }),
      });

      const data = await res.json();

      if (res.ok) {
        setPolicies(data.policies);
        setPolicyErrors({});
        toast.success("Security policies reset to defaults");
      } else {
        toast.error(data.error || "Failed to reset policies");
      }
    } catch (error) {
      toast.error("Failed to reset policies");
    } finally {
      setPoliciesResetting(false);
    }
  }

  // Update a single policy value
  function updatePolicy<K extends keyof SecurityPolicies>(key: K, value: SecurityPolicies[K]) {
    setPolicies(prev => prev ? { ...prev, [key]: value } : null);
    // Clear error for this field
    setPolicyErrors(prev => ({ ...prev, [key]: "" }));
  }

  // Validate policy value
  function validatePolicy(key: string, value: number, min: number, max: number): boolean {
    if (value < min || value > max) {
      setPolicyErrors(prev => ({
        ...prev,
        [key]: `Must be between ${min} and ${max}`,
      }));
      return false;
    }
    return true;
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="w-4 h-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Shield className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="blocked">
            <Lock className="w-4 h-4 mr-2" />
            Blocked
          </TabsTrigger>
          <TabsTrigger value="threats" className="relative">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Threats
            {threatStats.activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {threatStats.activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Settings className="w-4 h-4 mr-2" />
            Policies
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

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Admin Sessions</CardTitle>
                  <p className="text-sm text-gray-500">
                    Currently logged-in admin and superadmin users
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSessions}
                  disabled={loadingSessions}
                >
                  {loadingSessions ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{session.userEmail}</span>
                            {user?.uid === session.userId && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.role === "superadmin" ? "default" : "secondary"}>
                            {session.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {session.ip}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatTimestamp(session.loginTime)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatTimestamp(session.lastActivity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSessionToTerminate(session)}
                            disabled={user?.uid === session.userId}
                            className={user?.uid === session.userId ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            Terminate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="text-gray-500">No active admin sessions</p>
                  <p className="text-sm text-gray-400 mt-1">
                    All admin users are currently logged out
                  </p>
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

        {/* Threats Tab */}
        <TabsContent value="threats" className="space-y-4">
          {/* Threat Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Threats</CardTitle>
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{threatStats.total}</div>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
                <Activity className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{threatStats.activeCount}</div>
                <p className="text-xs text-gray-500">Need attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Critical</CardTitle>
                <Skull className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{threatStats.criticalCount}</div>
                <p className="text-xs text-gray-500">High severity</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today</CardTitle>
                <Clock className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{threatStats.todayCount}</div>
                <p className="text-xs text-gray-500">Detected today</p>
              </CardContent>
            </Card>
          </div>

          {/* Threats List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detected Threats</CardTitle>
                  <p className="text-sm text-gray-500">
                    Security threats detected by automated rules
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={threatFilter}
                    onChange={(e) => setThreatFilter(e.target.value as any)}
                    className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                  >
                    <option value="ALL">All Threats</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="CRITICAL">Critical Only</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchThreats}
                    disabled={threatsLoading}
                  >
                    {threatsLoading ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    <span className="ml-2">Refresh</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {threatsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredThreats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredThreats.map((threat) => (
                      <TableRow key={threat.id}>
                        <TableCell>
                          {getSeverityBadge(threat.severity)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{threat.ruleName}</p>
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {threat.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {threat.source.type}: {threat.source.value.substring(0, 20)}
                            {threat.source.value.length > 20 ? '...' : ''}
                          </Badge>
                          {threat.autoBlocked && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Auto-blocked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatTimestamp(threat.detectedAt)}
                        </TableCell>
                        <TableCell>
                          {getThreatStatusBadge(threat.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {threat.status === 'ACTIVE' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcknowledgeThreat(threat)}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Ack
                              </Button>
                            )}
                            {(threat.status === 'ACTIVE' || threat.status === 'ACKNOWLEDGED') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedThreat(threat)}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolve
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedThreat(threat)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="text-gray-500">No threats detected</p>
                  <p className="text-sm text-gray-400 mt-1">
                    System is running securely
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Security Policies</CardTitle>
                  <p className="text-sm text-gray-500">
                    Configure auto-blocking rules, rate limiting, and session settings
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPolicies}
                    disabled={policiesResetting || policiesLoading}
                  >
                    {policiesResetting ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span className="ml-2">Reset to Defaults</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={savePolicies}
                    disabled={policiesSaving || policiesLoading || Object.keys(policyErrors).some(k => policyErrors[k])}
                  >
                    {policiesSaving ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="ml-2">Save Changes</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {policiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : policies ? (
                <div className="space-y-8">
                  {/* Failed Login Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Failed Login Protection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Max Failed Attempts
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={policies.maxFailedAttempts}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (validatePolicy('maxFailedAttempts', val, 1, 20)) {
                              updatePolicy('maxFailedAttempts', val);
                            }
                          }}
                          className={policyErrors.maxFailedAttempts ? 'border-red-500' : ''}
                        />
                        {policyErrors.maxFailedAttempts && (
                          <p className="text-sm text-red-500">{policyErrors.maxFailedAttempts}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Number of failed login attempts before blocking (1-20)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Attempt Window (minutes)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={policies.failedAttemptsWindow}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (validatePolicy('failedAttemptsWindow', val, 1, 60)) {
                              updatePolicy('failedAttemptsWindow', val);
                            }
                          }}
                          className={policyErrors.failedAttemptsWindow ? 'border-red-500' : ''}
                        />
                        {policyErrors.failedAttemptsWindow && (
                          <p className="text-sm text-red-500">{policyErrors.failedAttemptsWindow}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Time window for counting failed attempts (1-60 minutes)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Block Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Ban className="w-5 h-5 text-red-500" />
                      Auto-Block Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Auto-Block Enabled</p>
                          <p className="text-sm text-gray-500">
                            Automatically block IPs after too many failed attempts
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={policies.autoBlockEnabled}
                            onChange={(e) => updatePolicy('autoBlockEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Block Duration (minutes)
                        </label>
                        <Input
                          type="number"
                          min={5}
                          max={1440}
                          value={policies.blockDuration}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (validatePolicy('blockDuration', val, 5, 1440)) {
                              updatePolicy('blockDuration', val);
                            }
                          }}
                          disabled={!policies.autoBlockEnabled}
                          className={policyErrors.blockDuration ? 'border-red-500' : ''}
                        />
                        {policyErrors.blockDuration && (
                          <p className="text-sm text-red-500">{policyErrors.blockDuration}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          How long to block IPs (5-1440 minutes = 5 min to 24 hours)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rate Limiting Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      Rate Limiting
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Rate Limiting Enabled</p>
                          <p className="text-sm text-gray-500">
                            Limit API requests per IP address
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={policies.rateLimitEnabled}
                            onChange={(e) => updatePolicy('rateLimitEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Max Requests
                          </label>
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            value={policies.rateLimitRequests}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (validatePolicy('rateLimitRequests', val, 5, 100)) {
                                updatePolicy('rateLimitRequests', val);
                              }
                            }}
                            disabled={!policies.rateLimitEnabled}
                            className={policyErrors.rateLimitRequests ? 'border-red-500' : ''}
                          />
                          {policyErrors.rateLimitRequests && (
                            <p className="text-sm text-red-500">{policyErrors.rateLimitRequests}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Maximum requests allowed (5-100)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Window (seconds)
                          </label>
                          <Input
                            type="number"
                            min={10}
                            max={300}
                            value={policies.rateLimitWindow}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (validatePolicy('rateLimitWindow', val, 10, 300)) {
                                updatePolicy('rateLimitWindow', val);
                              }
                            }}
                            disabled={!policies.rateLimitEnabled}
                            className={policyErrors.rateLimitWindow ? 'border-red-500' : ''}
                          />
                          {policyErrors.rateLimitWindow && (
                            <p className="text-sm text-red-500">{policyErrors.rateLimitWindow}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Time window in seconds (10-300)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-500" />
                      Session Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Session Timeout (minutes)
                        </label>
                        <Input
                          type="number"
                          min={15}
                          max={480}
                          value={policies.sessionTimeout}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (validatePolicy('sessionTimeout', val, 15, 480)) {
                              updatePolicy('sessionTimeout', val);
                            }
                          }}
                          className={policyErrors.sessionTimeout ? 'border-red-500' : ''}
                        />
                        {policyErrors.sessionTimeout && (
                          <p className="text-sm text-red-500">{policyErrors.sessionTimeout}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Admin session timeout (15-480 minutes = 15 min to 8 hours)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Max Concurrent Sessions
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={policies.maxConcurrentSessions}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (validatePolicy('maxConcurrentSessions', val, 1, 10)) {
                              updatePolicy('maxConcurrentSessions', val);
                            }
                          }}
                          className={policyErrors.maxConcurrentSessions ? 'border-red-500' : ''}
                        />
                        {policyErrors.maxConcurrentSessions && (
                          <p className="text-sm text-red-500">{policyErrors.maxConcurrentSessions}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Maximum concurrent admin sessions per user (1-10)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-500" />
                      Notifications
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Notify on Block</p>
                          <p className="text-sm text-gray-500">
                            Send email notification when an IP is blocked
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={policies.notifyOnBlock}
                            onChange={(e) => updatePolicy('notifyOnBlock', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {policies.notifyOnBlock && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Notification Email
                          </label>
                          <Input
                            type="email"
                            placeholder="admin@example.com"
                            value={policies.notifyEmail || ''}
                            onChange={(e) => updatePolicy('notifyEmail', e.target.value)}
                          />
                          <p className="text-xs text-gray-500">
                            Email address to receive block notifications
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Last Updated */}
                  {policies.updatedAt && (
                    <div className="border-t pt-4 text-sm text-gray-500 text-right">
                      Last updated: {formatTimestamp(policies.updatedAt)}
                      {policies.updatedBy && ` by ${policies.updatedBy}`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
                  <p className="text-gray-500">Failed to load security policies</p>
                  <Button variant="outline" size="sm" onClick={fetchPolicies} className="mt-4">
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alert Configuration</CardTitle>
                  <p className="text-sm text-gray-500">
                    Configure threat alerting channels and thresholds
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={saveAlertConfig}
                  disabled={alertConfigSaving || alertConfigLoading}
                >
                  {alertConfigSaving ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="ml-2">Save</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {alertConfigLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : alertConfig ? (
                <div className="space-y-8">
                  {/* Minimum Severity */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Alert Threshold
                    </h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Minimum Severity Level
                      </label>
                      <select
                        value={alertConfig.minSeverity}
                        onChange={(e) => updateAlertConfigField('minSeverity', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                      >
                        <option value="LOW">LOW - All threats</option>
                        <option value="MEDIUM">MEDIUM - Medium and above</option>
                        <option value="HIGH">HIGH - High and critical only</option>
                        <option value="CRITICAL">CRITICAL - Critical only</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        Only threats at or above this severity will trigger alerts
                      </p>
                    </div>
                  </div>

                  {/* Alert Channels */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-500" />
                      Alert Channels
                    </h3>
                    <div className="space-y-4">
                      {/* Dashboard */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Dashboard Notifications</p>
                          <p className="text-sm text-gray-500">
                            Show real-time toast notifications in admin dashboard
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alertConfig.channels?.find((c: AlertChannel) => c.type === 'DASHBOARD')?.enabled ?? true}
                            onChange={(e) => updateAlertChannel('DASHBOARD', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Email */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">Email Alerts</p>
                            <p className="text-sm text-gray-500">
                              Send email notifications for threats
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={alertConfig.channels?.find((c: AlertChannel) => c.type === 'EMAIL')?.enabled ?? false}
                              onChange={(e) => updateAlertChannel('EMAIL', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        {alertConfig.channels?.find((c: AlertChannel) => c.type === 'EMAIL')?.enabled && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Recipient Email
                            </label>
                            <Input
                              type="email"
                              placeholder="security@example.com"
                              value={alertConfig.channels?.find((c: AlertChannel) => c.type === 'EMAIL')?.config?.recipient || ''}
                              onChange={(e) => updateAlertChannelConfig('EMAIL', { recipient: e.target.value })}
                            />
                          </div>
                        )}
                      </div>

                      {/* Slack */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">Slack Notifications</p>
                            <p className="text-sm text-gray-500">
                              Send alerts to Slack webhook
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={alertConfig.channels?.find((c: AlertChannel) => c.type === 'SLACK')?.enabled ?? false}
                              onChange={(e) => updateAlertChannel('SLACK', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        {alertConfig.channels?.find((c: AlertChannel) => c.type === 'SLACK')?.enabled && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Slack Webhook URL
                            </label>
                            <Input
                              type="url"
                              placeholder="https://hooks.slack.com/services/..."
                              value={alertConfig.channels?.find((c: AlertChannel) => c.type === 'SLACK')?.config?.webhookUrl || ''}
                              onChange={(e) => updateAlertChannelConfig('SLACK', { webhookUrl: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Throttling */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-500" />
                      Throttling
                    </h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Alert Throttle (minutes)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={alertConfig.throttleMinutes}
                        onChange={(e) => updateAlertConfigField('throttleMinutes', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-gray-500">
                        Minimum time between alerts for the same source (prevents spam)
                      </p>
                    </div>
                  </div>

                  {/* Auto-block */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Ban className="w-5 h-5 text-red-500" />
                      Auto-Block Settings
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Auto-Block Critical Threats</p>
                        <p className="text-sm text-gray-500">
                          Automatically block IPs for CRITICAL severity threats
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alertConfig.autoBlockCritical}
                          onChange={(e) => updateAlertConfigField('autoBlockCritical', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
                  <p className="text-gray-500">Failed to load alert configuration</p>
                  <Button variant="outline" size="sm" onClick={fetchAlertConfig} className="mt-4">
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password Policy Card */}
          <PasswordPolicyCard />
        </TabsContent>
      </Tabs>

      {/* Auto-refresh hint */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Dashboard updates automatically when you refresh the page</p>
      </div>

      {/* Terminate Session Confirmation Modal */}
      {sessionToTerminate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Terminate Session?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to force logout <strong>{sessionToTerminate.userEmail}</strong>? 
              This will immediately end their admin session.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSessionToTerminate(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleTerminateSession(sessionToTerminate)}
              >
                Terminate Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Threat Detail/Resolution Modal */}
      {selectedThreat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Threat Details</h3>
              {getSeverityBadge(selectedThreat.severity)}
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Rule</p>
                <p className="font-medium">{selectedThreat.ruleName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p>{selectedThreat.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <Badge variant="outline" className="font-mono mt-1">
                    {selectedThreat.source.type}: {selectedThreat.source.value}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Detected At</p>
                  <p>{formatTimestamp(selectedThreat.detectedAt)}</p>
                </div>
              </div>
              
              {selectedThreat.autoBlocked && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">
                    <Ban className="w-4 h-4 inline mr-1" />
                    This source was automatically blocked
                  </p>
                </div>
              )}
              
              {(selectedThreat.status === 'ACTIVE' || selectedThreat.status === 'ACKNOWLEDGED') && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Resolution Notes</p>
                  <textarea
                    value={threatResolution}
                    onChange={(e) => setThreatResolution(e.target.value)}
                    placeholder="Enter resolution notes..."
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}
              
              {selectedThreat.resolution && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Resolution</p>
                  <p className="text-sm">{selectedThreat.resolution}</p>
                  {selectedThreat.resolvedBy && (
                    <p className="text-xs text-gray-400 mt-1">
                      Resolved by {selectedThreat.resolvedBy} on {formatTimestamp(selectedThreat.resolvedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedThreat(null);
                  setThreatResolution('');
                }}
              >
                Close
              </Button>
              
              {(selectedThreat.status === 'ACTIVE' || selectedThreat.status === 'ACKNOWLEDGED') && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleFalsePositive(selectedThreat)}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    False Positive
                  </Button>
                  <Button
                    onClick={() => handleResolveThreat(selectedThreat, threatResolution)}
                    disabled={!threatResolution.trim()}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Resolve
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Password Policy Card Component
function PasswordPolicyCard() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPassword, setTestPassword] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchPasswordPolicy();
  }, []);

  const fetchPasswordPolicy = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/security/password-policy', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPolicy(data.policy);
      }
    } catch (error) {
      console.error('Failed to fetch password policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePasswordPolicy = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/security/password-policy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ policy }),
      });

      if (res.ok) {
        const data = await res.json();
        setPolicy(data.policy);
        toast.success('Password policy updated successfully');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to update password policy');
      }
    } catch (err) {
      toast.error('Failed to update password policy');
    } finally {
      setSaving(false);
    }
  };

  const testPasswordStrength = async () => {
    if (!testPassword) return;
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/security/password-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'validate', password: testPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data.result);
      }
    } catch (error) {
      console.error('Failed to test password:', error);
    }
  };

  const updatePolicyField = (field: string, value: any) => {
    setPolicy((prev: any) => ({ ...prev, [field]: value }));
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 40) return 'text-red-500';
    if (strength < 60) return 'text-yellow-500';
    if (strength < 80) return 'text-blue-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Password Policy</CardTitle>
            <p className="text-sm text-gray-500">
              Configure password requirements and expiration settings
            </p>
          </div>
          <Button size="sm" onClick={savePasswordPolicy} disabled={saving}>
            {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="ml-2">Save</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {policy ? (
          <div className="space-y-8">
            {/* Length Requirements */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" />
                Length Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Minimum Length</label>
                  <Input
                    type="number"
                    min={8}
                    max={64}
                    value={policy.minLength}
                    onChange={(e) => updatePolicyField('minLength', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Minimum password length (8-64)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Maximum Length</label>
                  <Input
                    type="number"
                    min={64}
                    max={256}
                    value={policy.maxLength}
                    onChange={(e) => updatePolicyField('maxLength', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Maximum password length (64-256)</p>
                </div>
              </div>
            </div>

            {/* Character Requirements */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                Character Requirements
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'requireUppercase', label: 'Require Uppercase (A-Z)' },
                  { key: 'requireLowercase', label: 'Require Lowercase (a-z)' },
                  { key: 'requireNumbers', label: 'Require Numbers (0-9)' },
                  { key: 'requireSpecialChars', label: 'Require Special Characters' },
                ].map((req) => (
                  <div key={req.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{req.label}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policy[req.key]}
                        onChange={(e) => updatePolicyField(req.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration & History */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Expiration & History
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password Expiration (days)</label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={policy.maxAgeDays}
                    onChange={(e) => updatePolicyField('maxAgeDays', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Days until password expires (0 = never)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Prevent Reuse (count)</label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={policy.preventReuseCount}
                    onChange={(e) => updatePolicyField('preventReuseCount', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Number of previous passwords to prevent reuse (0 = disabled)</p>
                </div>
              </div>
            </div>

            {/* Lockout Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                Lockout Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Max Failed Attempts</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={policy.maxFailedAttempts}
                    onChange={(e) => updatePolicyField('maxFailedAttempts', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Failed attempts before lockout</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Lockout Duration (minutes)</label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={policy.lockoutDurationMinutes}
                    onChange={(e) => updatePolicyField('lockoutDurationMinutes', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">How long to lock account (5-1440 min)</p>
                </div>
              </div>
            </div>

            {/* Password Strength Tester */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                Password Strength Tester
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter password to test..."
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && testPasswordStrength()}
                  />
                  <Button onClick={testPasswordStrength} disabled={!testPassword}>
                    Test
                  </Button>
                </div>
                {testResult && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Strength:</span>
                      <span className={getStrengthColor(testResult.strength)}>
                        {testResult.strengthLabel} ({testResult.strength}/100)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          testResult.strength < 40
                            ? 'bg-red-500'
                            : testResult.strength < 60
                            ? 'bg-yellow-500'
                            : testResult.strength < 80
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${testResult.strength}%` }}
                      />
                    </div>
                    {testResult.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        <p className="font-medium">Issues:</p>
                        <ul className="list-disc list-inside">
                          {testResult.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {testResult.valid && (
                      <p className="text-sm text-green-600">Password meets all requirements!</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
            <p className="text-gray-500">Failed to load password policy</p>
            <Button variant="outline" size="sm" onClick={fetchPasswordPolicy} className="mt-4">
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
