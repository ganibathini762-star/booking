import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  useAdminStats,
  useAdminUsers,
  useAdminEvents,
  usePendingVenues,
  useBanUser,
  useUnbanUser,
  useSetRole,
  useApproveEvent,
  useFeatureEvent,
  useCancelAdminEvent,
  useApproveVenue,
  useRejectVenue,
} from "@/hooks/useAdmin";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { formatPrice } from "@/lib/utils";
import {
  Users, CalendarDays, BarChart3, Building2,
  ShieldCheck, ShieldOff, Star, StarOff,
  CheckCircle, XCircle, Ban, ChevronLeft, ChevronRight,
  Search, AlertCircle,
} from "lucide-react";
import type { AdminUser, AdminEvent, AdminVenue } from "@/hooks/useAdmin";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user || user.role !== "admin") throw redirect({ to: "/" });
  },
  component: AdminDashboard,
});

// ── Helpers ───────────────────────────────────────────────────────

type Tab = "overview" | "users" | "events" | "venues";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  organizer: "bg-blue-100 text-blue-700",
  user: "bg-muted text-muted-foreground",
};

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>;
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${accent ?? "bg-primary/10 text-primary"}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border">
      <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
      <div className="flex gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 border border-border rounded-md disabled:opacity-40 hover:bg-muted/50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1.5 border border-border rounded-md disabled:opacity-40 hover:bg-muted/50">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────

function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading } = useAdminUsers(page, q || undefined);
  const { mutate: ban, isPending: banning } = useBanUser();
  const { mutate: unban, isPending: unbanning } = useUnbanUser();
  const { mutate: setRole } = useSetRole();

  const users: AdminUser[] = (data?.data as unknown as AdminUser[]) ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          Search
        </button>
        {q && (
          <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(1); }}
            className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground">
            Clear
          </button>
        )}
      </form>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{u.name}</p>
                  <Badge label={u.role} color={ROLE_STYLES[u.role] ?? ""} />
                  {u.isBanned && <Badge label="Banned" color="bg-red-100 text-red-700" />}
                  {u.isVerified && <Badge label="Verified" color="bg-green-100 text-green-700" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Role selector */}
                <select
                  value={u.role}
                  onChange={e => setRole({ userId: u.id, role: e.target.value as AdminUser["role"] })}
                  className="text-xs border border-border rounded-md px-2 py-1 bg-background"
                >
                  <option value="user">User</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Ban / Unban */}
                {u.isBanned ? (
                  <button onClick={() => unban(u.id)} disabled={unbanning}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 text-white rounded-md font-medium disabled:opacity-50">
                    <ShieldCheck className="h-3 w-3" />Unban
                  </button>
                ) : (
                  <button onClick={() => ban(u.id)} disabled={banning}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-md hover:bg-red-50 disabled:opacity-50">
                    <Ban className="h-3 w-3" />Ban
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ── Events tab ────────────────────────────────────────────────────

function EventsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, isLoading } = useAdminEvents(page, status || undefined);
  const { mutate: approve, isPending: approving } = useApproveEvent();
  const { mutate: feature } = useFeatureEvent();
  const { mutate: cancel, isPending: cancelling } = useCancelAdminEvent();
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  const events: AdminEvent[] = (data?.data as unknown as AdminEvent[]) ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const STATUS_FILTERS = [
    { value: "", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "cancelled", label: "Cancelled" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              status === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No events found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{ev.title}</p>
                  <Badge label={ev.status} color={STATUS_STYLES[ev.status] ?? ""} />
                  {ev.isFeatured && <Badge label="Featured" color="bg-yellow-100 text-yellow-700" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ev.organizer?.name ?? "Unknown"} · {ev.venue?.city ?? "No venue"} · {ev.category?.name ?? "Uncategorised"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Approve (for draft events) */}
                {ev.status === "draft" && (
                  <button onClick={() => approve(ev.id)} disabled={approving}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 text-white rounded-md font-medium disabled:opacity-50">
                    <CheckCircle className="h-3 w-3" />{approving ? "…" : "Approve"}
                  </button>
                )}

                {/* Feature toggle */}
                {ev.status === "published" && (
                  <button
                    onClick={() => feature({ eventId: ev.id, featured: !ev.isFeatured })}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 border rounded-md font-medium ${
                      ev.isFeatured
                        ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {ev.isFeatured ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                    {ev.isFeatured ? "Unfeature" : "Feature"}
                  </button>
                )}

                {/* Cancel */}
                {(ev.status === "draft" || ev.status === "published") && (
                  cancelConfirm === ev.id ? (
                    <>
                      <button onClick={() => { cancel(ev.id); setCancelConfirm(null); }}
                        disabled={cancelling}
                        className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md font-medium disabled:opacity-50">
                        Confirm
                      </button>
                      <button onClick={() => setCancelConfirm(null)}
                        className="text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground">
                        Keep
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setCancelConfirm(ev.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-md hover:bg-red-50">
                      <XCircle className="h-3 w-3" />Cancel
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ── Venues tab ────────────────────────────────────────────────────

function VenuesTab() {
  const { data: venues, isLoading } = usePendingVenues();
  const { mutate: approve, isPending: approving } = useApproveVenue();
  const { mutate: reject, isPending: rejecting } = useRejectVenue();
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading venues…</div>;
  }

  if (!venues || venues.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="font-medium">No pending venues</p>
        <p className="text-sm mt-1">All venue requests have been reviewed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {venues.map((v: AdminVenue) => (
        <div key={v.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{v.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {v.address} · {v.city}, {v.state} · Capacity: {v.capacity.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => approve(v.id)} disabled={approving}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-md font-medium disabled:opacity-50">
              <ShieldCheck className="h-3 w-3" />{approving ? "…" : "Approve"}
            </button>

            {rejectConfirm === v.id ? (
              <>
                <button onClick={() => { reject(v.id); setRejectConfirm(null); }}
                  disabled={rejecting}
                  className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md font-medium disabled:opacity-50">
                  Confirm reject
                </button>
                <button onClick={() => setRejectConfirm(null)}
                  className="text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground">
                  Keep
                </button>
              </>
            ) : (
              <button onClick={() => setRejectConfirm(v.id)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-md hover:bg-red-50">
                <ShieldOff className="h-3 w-3" />Reject
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading stats…</div>;
  }

  if (!stats) return null;

  const alerts = [];
  if (stats.pendingVenues > 0)
    alerts.push({ msg: `${stats.pendingVenues} venue${stats.pendingVenues > 1 ? "s" : ""} awaiting approval`, tab: "venues" as Tab });
  if (stats.pendingEvents > 0)
    alerts.push({ msg: `${stats.pendingEvents} event${stats.pendingEvents > 1 ? "s" : ""} in draft`, tab: "events" as Tab });

  return (
    <div className="space-y-6">
      {/* Alert banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <button key={i} onClick={() => onNavigate(a.tab)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-left hover:bg-yellow-100 transition-colors">
              <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-sm text-yellow-800">{a.msg} — click to review</span>
            </button>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Users" value={stats.totalUsers}
          accent="bg-blue-50 text-blue-600" />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Total Events" value={stats.totalEvents}
          accent="bg-purple-50 text-purple-600" />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Paid Bookings" value={stats.paidBookings}
          accent="bg-green-50 text-green-600" />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Total Revenue"
          value={formatPrice(stats.totalRevenue)} sub="from paid bookings"
          accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Pending Venues" value={stats.pendingVenues}
          accent="bg-yellow-50 text-yellow-600" />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Draft Events" value={stats.pendingEvents}
          accent="bg-orange-50 text-orange-600" />
      </div>

      {/* Quick-action links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["users", "events", "venues"] as Tab[]).map(t => (
          <button key={t} onClick={() => onNavigate(t)}
            className="p-4 rounded-xl border border-border bg-card text-left hover:bg-muted/30 transition-colors capitalize font-medium text-sm">
            Manage {t} →
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "events", label: "Events" },
    { id: "venues", label: "Venues" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl pb-20 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform management — users, events, venues</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab onNavigate={setTab} />}
      {tab === "users"    && <UsersTab />}
      {tab === "events"   && <EventsTab />}
      {tab === "venues"   && <VenuesTab />}
    </div>
  );
}
