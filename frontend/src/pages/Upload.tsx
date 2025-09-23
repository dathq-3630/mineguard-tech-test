import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Alert,
} from "@mui/material";
import { extractPdfText } from "../utils/pdf";
import { saveDocument } from "../utils/storage";
import { useRouter } from "@tanstack/react-router";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const text = await extractPdfText(file);
      const summary = generateSummary(text);
      const keyPoints = extractKeyPoints(text);
      const id = crypto.randomUUID();
      saveDocument({
        id,
        name: file.name,
        size: file.size,
        text,
        summary,
        keyPoints,
        createdAt: new Date().toISOString(),
      });
      router.navigate({ to: "/doc/$id", params: { id } });
    } catch (e: any) {
      setError(e?.message || "Failed to process PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Upload a compliance PDF</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {loading && <LinearProgress />}
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            Process
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function generateSummary(text: string): string {
  const first = text.split(/\n+/).slice(0, 3).join(" ").trim();
  return first ? first.slice(0, 500) : "No summary available.";
}

function extractKeyPoints(text: string): string[] {
  const lines = text.split(/\n+/);
  const bullets = lines.filter((l) => /^(\s*[-•*]|\d+\.)/.test(l)).slice(0, 8);
  if (bullets.length)
    return bullets.map((b) => b.replace(/^\s*[-•*]\s*/, "").trim());
  return lines
    .filter((l) => l.length > 40)
    .slice(0, 5)
    .map((l) => l.slice(0, 120) + "...");
}
