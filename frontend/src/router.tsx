import {
  createRootRoute,
  createRoute,
  createRouter,
  Router,
} from "@tanstack/react-router";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
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

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: withAuth(Upload),
});

const docDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/doc/$id",
  component: withAuth(DocumentDetail),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  uploadRoute,
  docDetailRoute,
]);

export const router: Router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
