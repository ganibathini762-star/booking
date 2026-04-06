import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  useMyEvents,
  useOrganizerShows,
  useCreateEvent,
  usePublishEvent,
  useCancelEvent,
  useAddShow,
  useAddTier,
} from "@/hooks/useOrganizer";
import { useCategories } from "@/hooks/useEvents";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { formatPrice } from "@/lib/utils";
import {
  Plus, ChevronDown, ChevronUp, Globe, Ban,
  BarChart3, CalendarDays, Layers, Tag,
  CheckCircle, Clock, AlertCircle, ExternalLink,
} from "lucide-react";
import type { Event, EventShow } from "@/types/event";

export const Route = createFileRoute("/organizer/dashboard")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user || (user.role !== "organizer" && user.role !== "admin")) {
      throw redirect({ to: "/" });
    }
  },
  component: OrganizerDashboard,
});

// ── Helpers ───────────────────────────────────────────────────────

type Tab = "overview" | "events" | "create";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Add Tier inline form ──────────────────────────────────────────
function AddTierForm({ eventId, showId, onDone }: {
  eventId: string; showId: string; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [maxPer, setMaxPer] = useState("10");
  const [err, setErr] = useState("");
  const { mutate, isPending } = useAddTier();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price || !qty) { setErr("Name, price and quantity are required"); return; }
    mutate(
      { eventId, showId, name, price: parseFloat(price), totalQuantity: parseInt(qty), maxPerBooking: parseInt(maxPer) },
      { onSuccess: () => { setName(""); setPrice(""); setQty(""); setErr(""); onDone(); }, onError: () => setErr("Failed to add tier") }
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 p-3 rounded-lg bg-muted/40 border border-dashed border-border space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Ticket Tier</p>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Tier name" required
          className="col-span-2 sm:col-span-1 border border-border rounded-md px-2.5 py-1.5 text-sm bg-background w-full" />
        <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price (₹)" type="number" min="0" required
          className="border border-border rounded-md px-2.5 py-1.5 text-sm bg-background w-full" />
        <input value={qty} onChange={e => setQty(e.target.value)} placeholder="Quantity" type="number" min="1" required
          className="border border-border rounded-md px-2.5 py-1.5 text-sm bg-background w-full" />
        <input value={maxPer} onChange={e => setMaxPer(e.target.value)} placeholder="Max/booking" type="number" min="1" max="20"
          className="border border-border rounded-md px-2.5 py-1.5 text-sm bg-background w-full" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50">
          {isPending ? "Adding…" : "Add tier"}
        </button>
        <button type="button" onClick={onDone} className="px-3 py-1.5 border border-border rounded-md text-sm text-muted-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Show row with tiers ───────────────────────────────────────────
function ShowRow({ show, eventId }: { show: EventShow; eventId: string }) {
  const [addingTier, setAddingTier] = useState(false);
  const totalSeats = show.ticketTiers.reduce((s, t) => s + t.totalQuantity, 0);
  const availSeats = show.ticketTiers.reduce((s, t) => s + t.availableQuantity, 0);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {show.showDate} · {show.showTime.slice(0, 5)}
          </p>
          <p className="text-xs text-muted-foreground">
            {show.ticketTiers.length} tier{show.ticketTiers.length !== 1 ? "s" : ""} ·{" "}
            {availSeats}/{totalSeats} seats available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={show.status} />
          <button onClick={() => setAddingTier(!addingTier)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" />Tier
          </button>
        </div>
      </div>

      {/* Tier list */}
      {show.ticketTiers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-1 pr-3 font-medium">Tier</th>
                <th className="text-right py-1 pr-3 font-medium">Price</th>
                <th className="text-right py-1 pr-3 font-medium">Total</th>
                <th className="text-right py-1 font-medium">Available</th>
              </tr>
            </thead>
            <tbody>
              {show.ticketTiers.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-1 pr-3">{t.name}</td>
                  <td className="py-1 pr-3 text-right">{formatPrice(parseFloat(t.price))}</td>
                  <td className="py-1 pr-3 text-right">{t.totalQuantity}</td>
                  <td className={`py-1 text-right font-medium ${t.availableQuantity === 0 ? "text-red-500" : "text-green-600"}`}>
                    {t.availableQuantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addingTier && (
        <AddTierForm eventId={eventId} showId={show.id} onDone={() => setAddingTier(false)} />
      )}
    </div>
  );
}

// ── Event detail panel (shows + add-show form) ────────────────────
function EventDetailPanel({ event }: { event: Event }) {
  const { data: shows, isLoading } = useOrganizerShows(event.slug);
  const { mutate: addShow, isPending: addingShow } = useAddShow();
  const [showDate, setShowDate] = useState("");
  const [showTime, setShowTime] = useState("");
  const [showAddShowForm, setShowAddShowForm] = useState(false);
  const [err, setErr] = useState("");

  function submitShow(e: React.FormEvent) {
    e.preventDefault();
    if (!showDate || !showTime) { setErr("Date and time are required"); return; }
    addShow(
      { eventId: event.id, showDate, showTime },
      {
        onSuccess: () => { setShowDate(""); setShowTime(""); setErr(""); setShowAddShowForm(false); },
        onError: () => setErr("Failed to add show"),
      }
    );
  }

  if (isLoading) return <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Loading shows…</div>;

  return (
    <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> Shows ({shows?.length ?? 0})
        </p>
        <button onClick={() => setShowAddShowForm(!showAddShowForm)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground hover:text-foreground">
          <Plus className="h-3 w-3" />Add Show
        </button>
      </div>

      {/* Add show form */}
      {showAddShowForm && (
        <form onSubmit={submitShow} className="p-3 rounded-lg bg-muted/40 border border-dashed border-border space-y-2">
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={showDate} onChange={e => setShowDate(e.target.value)} required
              className="border border-border rounded-md px-2.5 py-1.5 text-sm bg-background" />
            <input type="time" value={showTime} onChange={e => setShowTime(e.target.value)} required
              className="border border-border rounded-md px-2.5 py-1.5 text-sm bg-background" />
            <button type="submit" disabled={addingShow}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50">
              {addingShow ? "Adding…" : "Add"}
            </button>
            <button type="button" onClick={() => setShowAddShowForm(false)}
              className="px-3 py-1.5 border border-border rounded-md text-sm text-muted-foreground">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Shows list */}
      {shows?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No shows yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {shows?.map((show) => (
            <ShowRow key={show.id} show={show} eventId={event.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────
function EventCard({ event, expanded, onToggle }: {
  event: Event; expanded: boolean; onToggle: () => void;
}) {
  const { mutate: publish, isPending: publishing } = usePublishEvent();
  const { mutate: cancel, isPending: cancelling } = useCancelEvent();
  const [cancelConfirm, setCancelConfirm] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{event.title}</p>
            <StatusBadge status={event.status} />
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5">
            {event.category && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />{event.category.name}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />{event.venue.city}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Actions */}
          {event.status === "draft" && (
            <button onClick={e => { e.stopPropagation(); publish(event.id); }}
              disabled={publishing}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50">
              <Globe className="h-3 w-3" />{publishing ? "…" : "Publish"}
            </button>
          )}
          {(event.status === "draft" || event.status === "published") && !cancelConfirm && (
            <button onClick={e => { e.stopPropagation(); setCancelConfirm(true); }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-md hover:bg-red-50">
              <Ban className="h-3 w-3" />Cancel
            </button>
          )}
          {cancelConfirm && (
            <>
              <button onClick={e => { e.stopPropagation(); cancel(event.id, { onSettled: () => setCancelConfirm(false) }); }}
                disabled={cancelling}
                className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md font-medium disabled:opacity-50">
                {cancelling ? "…" : "Confirm"}
              </button>
              <button onClick={e => { e.stopPropagation(); setCancelConfirm(false); }}
                className="text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground">
                Keep
              </button>
            </>
          )}
          {event.status === "published" && (
            <Link to="/events/$slug" params={{ slug: event.slug }}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" />View
            </Link>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
        </div>
      </button>

      {expanded && <EventDetailPanel event={event} />}
    </div>
  );
}

// ── Create Event form ─────────────────────────────────────────────
function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const { data: categories } = useCategories();
  const { mutate: create, isPending, error } = useCreateEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [startDt, setStartDt] = useState("");
  const [endDt, setEndDt] = useState("");
  const [language, setLanguage] = useState("");
  const [ageRating, setAgeRating] = useState<"" | "U" | "UA" | "A">("");

  function toIso(dt: string) { return dt ? new Date(dt).toISOString() : undefined; }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create(
      {
        title,
        description: description || undefined,
        categoryId: categoryId || undefined,
        venueId: venueId || undefined,
        startDatetime: toIso(startDt),
        endDatetime: toIso(endDt),
        language: language || undefined,
        ageRating: ageRating || undefined,
      },
      { onSuccess: onCreated }
    );
  }

  const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
        <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Coldplay World Tour"
          className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={3} placeholder="Tell attendees about your event…"
          className={`${inputCls} resize-none`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">Select category</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Age Rating</label>
          <select value={ageRating} onChange={e => setAgeRating(e.target.value as typeof ageRating)} className={inputCls}>
            <option value="">Any</option>
            <option value="U">U — Universal</option>
            <option value="UA">UA — Parental guidance</option>
            <option value="A">A — Adults only</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Venue ID</label>
        <input value={venueId} onChange={e => setVenueId(e.target.value)} placeholder="UUID of your approved venue"
          className={inputCls} />
        <p className="text-xs text-muted-foreground mt-1">Leave blank to add venue later.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start date &amp; time</label>
          <input type="datetime-local" value={startDt} onChange={e => setStartDt(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End date &amp; time</label>
          <input type="datetime-local" value={endDt} onChange={e => setEndDt(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Language</label>
        <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g. English, Hindi"
          className={inputCls} />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to create event. Check your inputs.</span>
        </div>
      )}

      <button type="submit" disabled={isPending || !title}
        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50">
        {isPending ? "Creating…" : "Create Event"}
      </button>
    </form>
  );
}

// ── Main dashboard ────────────────────────────────────────────────
function OrganizerDashboard() {
  const { data: events, isLoading } = useMyEvents();
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;

  const all = events ?? [];
  const published = all.filter(e => e.status === "published").length;
  const drafts = all.filter(e => e.status === "draft").length;
  const cancelled = all.filter(e => e.status === "cancelled").length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "events", label: `My Events (${all.length})` },
    { id: "create", label: "Create Event" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your events, shows and ticket tiers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Total Events" value={all.length} />
        <StatCard icon={<CheckCircle className="h-4 w-4" />} label="Published" value={published} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Drafts" value={drafts} />
        <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Cancelled" value={cancelled} />
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

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          {all.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No events yet</p>
              <button onClick={() => setTab("create")}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                Create your first event
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold">Recent Events</h2>
              <div className="space-y-2">
                {all.slice(0, 5).map(event => (
                  <div key={event.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.venue?.city ?? "No venue"} · {event.category?.name ?? "Uncategorised"}
                      </p>
                    </div>
                    <StatusBadge status={event.status} />
                  </div>
                ))}
              </div>
              {all.length > 5 && (
                <button onClick={() => setTab("events")}
                  className="text-sm text-primary hover:underline">
                  View all {all.length} events →
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* My Events tab */}
      {tab === "events" && (
        <div className="space-y-3">
          {all.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No events yet</p>
              <button onClick={() => setTab("create")}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                Create your first event
              </button>
            </div>
          ) : (
            all.map(event => (
              <EventCard
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Create Event tab */}
      {tab === "create" && (
        <div>
          <h2 className="text-base font-semibold mb-4">Create New Event</h2>
          <CreateEventForm onCreated={() => setTab("events")} />
        </div>
      )}
    </div>
  );
}
