import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

export const Route = createFileRoute("/profile/settings")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { name?: string; phone?: string }) => {
      const res = await api.put<ApiResponse<AuthUser>>("/auth/me", data);
      return res.data.data;
    },
    onSuccess: (updated) => {
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg pb-20 md:pb-8">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            value={user?.email}
            disabled
            className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={() => mutation.mutate({ name, phone: phone || undefined })}
          disabled={mutation.isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? "Saving…" : saved ? "✅ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
