import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { useRouter } from "@tanstack/react-router";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await login(username, password);
    if (!ok) {
      setError("Invalid credentials");
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" gutterBottom>
          Login
        </Typography>
        <Stack spacing={2} component="form" onSubmit={handleSubmit}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained">
            Sign In
          </Button>
          <Typography variant="body2" color="text.secondary">
            Hint users: ha.quoc.dat / gem.caglar — Pass: Aa@123456
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
