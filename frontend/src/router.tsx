import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DocumentDetail from "./pages/DocumentDetail";
import { AuthProvider, useAuth } from "./auth/AuthContext";

const rootRoute = createRootRoute({
  component: function Root() {
    return (
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    );
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

function withAuth(Component: React.ComponentType) {
  function Wrapped() {
    const { user } = useAuth();
    if (!user) {
      // TanStack Router uses navigate API via router, but for simplicity use location
      window.location.replace("/login");
      return null;
    }
    return <Component />;
  }
  return Wrapped;
}

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: withAuth(Dashboard),
});

const docDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/doc/$id",
  component: withAuth(DocumentDetail),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  docDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
