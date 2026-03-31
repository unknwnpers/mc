"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Users, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserRecord {
  uid: string;
  email: string | null;
  name: string | null;
  role: "customer" | "admin" | "superadmin";
  created_at: any;
}

const ROLE_STYLES: Record<string, string> = {
  superadmin: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  admin:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  customer:   "bg-white/5 text-white/30 border-white/10",
};

async function adminFetch(url: string, opts: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
}

export default function UsersPage() {
  const { profile }               = useAuth();
  const isSuperAdmin              = profile?.role === "superadmin";
  const [users,    setUsers]      = useState<UserRecord[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [search,   setSearch]     = useState("");

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    try {
      const res  = await adminFetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(uid: string, role: string) {
    setUpdating(uid);
    try {
      const res  = await adminFetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ uid, role }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Role updated → ${role}`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: role as any } : u));
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdating(null); }
  }

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">Users</h1>
          <p className="text-white/30 text-sm mt-1">{users.length} registered customers</p>
        </div>
        <button onClick={fetchUsers} disabled={fetching}
          className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/40 hover:text-white transition-all border border-white/[0.06]">
          <RefreshCw className={cn("w-5 h-5", fetching && "animate-spin")} />
        </button>
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 mb-6 transition-all" />

      {/* Table */}
      <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_120px_150px] px-6 py-3 border-b border-white/[0.04] text-[10px] font-black uppercase tracking-widest text-white/20">
          <span>User</span>
          <span>Email</span>
          <span>Role</span>
          {isSuperAdmin && <span>Change Role</span>}
        </div>

        {fetching ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-white/10" />
            <p className="text-white/20 font-semibold text-sm">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map(u => (
              <div key={u.uid} className="grid grid-cols-[1fr_1fr_120px_150px] items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400/30 to-rose-600/30 flex items-center justify-center text-rose-300 text-xs font-black shrink-0">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-white/70 text-sm font-bold truncate">{u.name || "—"}</span>
                </div>

                {/* Email */}
                <span className="text-white/30 text-sm truncate font-mono">{u.email}</span>

                {/* Role Badge */}
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border w-fit",
                  ROLE_STYLES[u.role] || ROLE_STYLES.customer)}>
                  {u.role}
                </span>

                {/* Role Changer (superadmin only) */}
                {isSuperAdmin && (
                  <Select
                    defaultValue={u.role}
                    disabled={updating === u.uid || u.uid === auth.currentUser?.uid}
                    onValueChange={val => changeRole(u.uid, val)}
                  >
                    <SelectTrigger className="h-8 w-[130px] bg-white/[0.04] border-white/10 text-white/60 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <SelectItem value="customer" className="text-xs">Customer</SelectItem>
                      <SelectItem value="admin"    className="text-xs">Admin</SelectItem>
                      <SelectItem value="superadmin" className="text-xs text-rose-400">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
