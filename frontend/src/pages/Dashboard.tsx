import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import { deleteDocument, listDocuments } from "../utils/storage";

export default function Dashboard() {
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const docs = useMemo(() => listDocuments(), [tick]);
  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <TextField
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button component={Link} to="/upload" variant="contained">
          Upload
        </Button>
      </Stack>
      <Grid container spacing={2}>
        {filtered.map((d) => (
          <Grid item xs={12} md={6} key={d.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{d.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {(d.size / 1024).toFixed(1)} KB ·{" "}
                  {new Date(d.createdAt).toLocaleString()}
                </Typography>
                <Typography sx={{ mt: 1 }}>{d.summary}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Key points:
                </Typography>
                <ul>
                  {d.keyPoints.slice(0, 5).map((p, i) => (
                    <li key={i}>
                      <Typography variant="body2">{p}</Typography>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardActions>
                <Button
                  component={Link}
                  to="/doc/$id"
                  params={{ id: d.id }}
                  size="small"
                >
                  Open
                </Button>
                <Button
                  color="error"
                  size="small"
                  onClick={() => {
                    deleteDocument(d.id);
                    setTick((t) => t + 1);
                  }}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
