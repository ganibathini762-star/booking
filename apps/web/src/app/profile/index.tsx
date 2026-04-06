import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { getInitials, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  beforeLoad: ({ context }) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl pb-20 md:pb-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
            {getInitials(user.name)}
          </div>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
              {user.role}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{user.phone ?? "Not added"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email Verified</p>
            <p className="text-sm font-medium">{user.isVerified ? "✅ Verified" : "⚠️ Not verified"}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            to="/profile/bookings"
            className="flex-1 text-center py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            My Bookings
          </Link>
          <Link
            to="/profile/settings"
            className="flex-1 text-center py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
