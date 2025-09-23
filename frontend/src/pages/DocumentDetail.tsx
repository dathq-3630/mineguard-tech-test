import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { getDocument } from "../utils/storage";

export default function DocumentDetail() {
  const params = useParams({ from: "/doc/$id" as any }) as { id: string };
  const doc = useMemo(() => getDocument(params.id), [params.id]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  if (!doc) return <Alert severity="error">Document not found.</Alert>;

  function handleAsk() {
    setAnswer(simpleAnswer(doc.text, question));
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {doc.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {(doc.size / 1024).toFixed(1)} KB ·{" "}
        {new Date(doc.createdAt).toLocaleString()}
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Summary</Typography>
        <Typography>{doc.summary}</Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6">Key Points</Typography>
        <ul>
          {doc.keyPoints.map((p, i) => (
            <li key={i}>
              <Typography variant="body2">{p}</Typography>
            </li>
          ))}
        </ul>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ask a question
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            fullWidth
            label="Your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleAsk}
            disabled={!question.trim()}
          >
            Ask
          </Button>
        </Stack>
        {answer && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Answer</Typography>
            <Typography>{answer}</Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Full Text</Typography>
        <Box sx={{ whiteSpace: "pre-wrap", mt: 1 }}>{doc.text}</Box>
      </Paper>
    </Box>
  );
}

function simpleAnswer(text: string, q: string): string {
  const question = q.toLowerCase();
  // naive extractive: find sentences containing keywords from the question
  const keywords = question
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((w) => w.length > 2);
  const sentences = text.split(/(?<=[.!?])\s+/);
  const scored = sentences
    .map((s) => ({
      s,
      score: keywords.reduce(
        (acc, k) => acc + (s.toLowerCase().includes(k) ? 1 : 0),
        0
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return "No direct answer found in the document.";
  return scored
    .slice(0, 3)
    .map((x) => x.s)
    .join(" ");
}
