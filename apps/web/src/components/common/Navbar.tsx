import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Ticket, Bell, User, ChevronDown, MapPin, Search, Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCityStore } from "@/stores/cityStore";
import { getInitials, cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { selectedCity, setCity, cities } = useCityStore();
  const navigate = useNavigate();

  const { data: notifData } = useNotifications(isAuthenticated);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const unreadCount = notifData?.unreadCount ?? 0;

  function handleLogout() {
    logout();
    navigate({ to: "/" });
  }

  return (
    <>
      {/* Full-screen search overlay (mobile) */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col p-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSearchOpen(false)} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            <span className="font-semibold">Search</span>
          </div>
          <SearchBar autoFocus onClose={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary shrink-0">
            <Ticket className="h-5 w-5" />
            <span className="hidden sm:inline">TicketFlow</span>
          </Link>

          {/* Desktop Nav Categories */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium ml-2">
            {["Movies", "Concerts", "Sports", "Theatre"].map((cat) => (
              <Link
                key={cat}
                to="/events"
                search={{ category: cat.toLowerCase() }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {cat}
              </Link>
            ))}
          </nav>

          {/* Desktop Search (expanded) */}
          <div className="hidden md:block flex-1 max-w-sm mx-auto">
            <SearchBar />
          </div>

          {/* Mobile search icon */}
          <button
            className="md:hidden ml-auto h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* City Selector */}
          <div className="hidden lg:block relative shrink-0">
            <button
              onClick={() => setCityOpen(!cityOpen)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="h-4 w-4" />
              {selectedCity}
              <ChevronDown className="h-3 w-3" />
            </button>
            {cityOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCityOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover shadow-xl z-20 overflow-hidden">
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => { setCity(city); setCityOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${city === selectedCity ? "text-primary font-medium" : ""}`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Auth + Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:block relative">
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative"
                    onClick={() => setNotifOpen((v) => !v)}
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-xl z-20 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                          <p className="text-sm font-semibold">Notifications</p>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markAllRead.mutate()}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-border">
                          {!notifData?.notifications.length ? (
                            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No notifications</p>
                          ) : (
                            notifData.notifications.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                                className={cn(
                                  "w-full text-left px-4 py-3 hover:bg-accent transition-colors",
                                  !n.isRead && "bg-primary/5"
                                )}
                              >
                                <p className={cn("text-sm font-medium", !n.isRead && "text-primary")}>{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative group">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {getInitials(user.name)}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-popover shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-accent transition-colors">My Profile</Link>
                    <Link to="/profile/bookings" className="block px-3 py-2 text-sm hover:bg-accent transition-colors">My Bookings</Link>
                    {(user.role === "organizer" || user.role === "admin") && (
                      <Link to="/organizer/dashboard" className="block px-3 py-2 text-sm hover:bg-accent transition-colors">Organizer Portal</Link>
                    )}
                    {user.role === "admin" && (
                      <Link to="/admin/dashboard" className="block px-3 py-2 text-sm hover:bg-accent transition-colors">Admin Panel</Link>
                    )}
                    <div className="border-t border-border">
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors">
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors">
                  Sign in
                </Link>
                <Link to="/auth/register" className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Sign up
                </Link>
              </>
            )}

            {/* Hamburger (mobile) */}
            <button
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {/* City */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCity}
                onChange={(e) => setCity(e.target.value as typeof selectedCity)}
                className="bg-transparent text-sm font-medium focus:outline-none"
              >
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <nav className="grid grid-cols-2 gap-1">
              {["Movies", "Concerts", "Sports", "Theatre", "Comedy", "Kids"].map((cat) => (
                <Link
                  key={cat}
                  to="/events"
                  search={{ category: cat.toLowerCase() }}
                  className="py-2 px-3 text-sm rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {cat}
                </Link>
              ))}
            </nav>

            {!isAuthenticated && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Link to="/auth/login" className="flex-1 text-center py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
                <Link to="/auth/register" className="flex-1 text-center py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors" onClick={() => setMobileOpen(false)}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5 h-14">
          <Link to="/" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors">
            <Ticket className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Search</span>
          </button>
          <Link to="/profile/bookings" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors">
            <Ticket className="h-5 w-5" />
            <span className="text-[10px]">Tickets</span>
          </Link>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-3 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="text-[10px]">Alerts</span>
          </button>
          <Link
            to={isAuthenticated ? "/profile" : "/auth/login"}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">Me</span>
          </Link>
        </div>
      </div>
    </>
  );
}
