import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useSearchSuggestions } from "@/hooks/useEvents";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  autoFocus?: boolean;
  onClose?: () => void;
};

export function SearchBar({ className, autoFocus, onClose }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: suggestions } = useSearchSuggestions(q);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    navigate({ to: "/events", search: { q: q.trim() } });
    onClose?.();
  }

  function handleSuggestion(slug: string) {
    setQ("");
    setOpen(false);
    navigate({ to: "/events/$slug", params: { slug } });
    onClose?.();
  }

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search events, venues..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button type="button" onClick={() => { setQ(""); setOpen(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Suggestions dropdown */}
      {open && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
              onMouseDown={() => handleSuggestion(s.slug)}
            >
              {s.bannerUrl ? (
                <img src={s.bannerUrl} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🎟️</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
