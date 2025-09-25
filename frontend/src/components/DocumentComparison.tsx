import { useState } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import { Compare as CompareIcon } from "@mui/icons-material";
import { useDocumentComparison } from "../hooks/useDocuments";

interface Document {
  id: number;
  name: string;
}

interface DocumentComparisonProps {
  documents: Document[];
  onClose?: () => void;
}

export default function DocumentComparison({
  documents,
  onClose,
}: DocumentComparisonProps) {
  const [document1Id, setDocument1Id] = useState<number | "">("");
  const [document2Id, setDocument2Id] = useState<number | "">("");
  const [comparisonType, setComparisonType] = useState<
    "gap_analysis" | "similarity" | "differences"
  >("gap_analysis");

  const comparisonMutation = useDocumentComparison();
  const loading = comparisonMutation.isPending;
  const error = comparisonMutation.error?.message || null;
  const result = comparisonMutation.data || null;

  const handleCompare = async () => {
    if (!document1Id || !document2Id || document1Id === document2Id) {
      return;
    }

    try {
      await comparisonMutation.mutateAsync({
        document1Id: Number(document1Id),
        document2Id: Number(document2Id),
        comparisonType,
      });
    } catch (err) {
      console.error("Comparison error:", err);
    }
  };

  const resetForm = () => {
    setDocument1Id("");
    setDocument2Id("");
    setComparisonType("gap_analysis");
    comparisonMutation.reset();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">Document Comparison</Typography>
            {onClose && (
              <Button onClick={onClose} variant="outlined">
                Close
              </Button>
            )}
          </Stack>

          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>First Document</InputLabel>
                <Select
                  value={document1Id}
                  onChange={(e) => setDocument1Id(e.target.value as number)}
                  disabled={loading}
                >
                  {documents.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Second Document</InputLabel>
                <Select
                  value={document2Id}
                  onChange={(e) => setDocument2Id(e.target.value as number)}
                  disabled={loading}
                >
                  {documents.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Comparison Type</InputLabel>
              <Select
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value as any)}
                disabled={loading}
              >
                <MenuItem value="gap_analysis">Gap Analysis</MenuItem>
                <MenuItem value="similarity">Similarity Analysis</MenuItem>
                <MenuItem value="differences">Difference Detection</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleCompare}
                disabled={
                  !document1Id ||
                  !document2Id ||
                  document1Id === document2Id ||
                  loading
                }
                startIcon={
                  loading ? <CircularProgress size={20} /> : <CompareIcon />
                }
                sx={{ flex: 1 }}
              >
                {loading ? "Comparing..." : "Compare Documents"}
              </Button>
              <Button variant="outlined" onClick={resetForm} disabled={loading}>
                Reset
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Comparison Results
              </Typography>

              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={result.comparisonType
                      .replace("_", " ")
                      .toUpperCase()}
                    color="primary"
                    size="small"
                  />
                  {result.score !== undefined && (
                    <Chip
                      label={`${result.score}% Similar`}
                      color="secondary"
                      size="small"
                    />
                  )}
                  <Chip
                    label={`$${result.costUsd.toFixed(4)}`}
                    color="default"
                    size="small"
                  />
                </Stack>

                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Analysis
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {result.comparison}
                    </Typography>
                  </CardContent>
                </Card>

                {result.keyFindings.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Key Findings
                      </Typography>
                      <Stack spacing={1}>
                        {result.keyFindings.map((finding, index) => (
                          <Typography
                            key={index}
                            variant="body2"
                            sx={{ pl: 2 }}
                          >
                            • {finding}
                          </Typography>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Usage Statistics
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Typography variant="body2">
                      Model: {result.usage.model}
                    </Typography>
                    <Typography variant="body2">
                      Input: {result.usage.inputTokens} tokens
                    </Typography>
                    <Typography variant="body2">
                      Output: {result.usage.outputTokens} tokens
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
