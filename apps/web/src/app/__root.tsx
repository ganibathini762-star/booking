import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}
