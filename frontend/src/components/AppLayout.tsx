import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Compliance Analyzer
          </Typography>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/" sx={{ mr: 1 }}>
                Dashboard
              </Button>
              <Button
                color="inherit"
                onClick={() => {
                  logout();
                  router.navigate({ to: "/login" });
                }}
                variant="outlined"
                sx={{
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  "&:hover": {
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
