import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

type RegisterResponse = {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
};

function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");

  const registerMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = { ...data, phone: data.phone || undefined };
      const res = await api.post<ApiResponse<RegisterResponse>>("/auth/register", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      navigate({ to: "/" });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Registration failed. Please try again.";
      setError(msg);
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    registerMutation.mutate(form);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Create an account</h1>
          <p className="text-muted-foreground mt-1">Join TicketFlow today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">Full Name</label>
            <input
              id="name" name="name" type="text" required
              value={form.name} onChange={handleChange}
              placeholder="John Doe"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="phone" name="phone" type="tel"
              value={form.phone} onChange={handleChange}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password" name="password" type="password" required minLength={8}
              value={form.password} onChange={handleChange}
              placeholder="Min 8 chars, upper, lower & number"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {registerMutation.isPending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
