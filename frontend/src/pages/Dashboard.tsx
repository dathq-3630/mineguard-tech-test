import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  IconButton,
  Paper,
  Fade,
  Skeleton,
} from "@mui/material";
import Chatbot from "../components/Chatbot";
import DocumentComparison from "../components/DocumentComparison";
import ConversationList from "../components/ConversationList";
import DocumentCard from "../components/DocumentCard";
import {
  Upload as UploadIcon,
  Chat as ChatIcon,
  Compare as CompareIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useDocuments } from "../hooks/useDocuments";

export default function Dashboard() {
  const [q, setQ] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: docs = [], refetch: refetchDocs, isLoading } = useDocuments();

  const filtered = (docs || []).filter((d) => {
    const matchesSearch = d.original_name
      .toLowerCase()
      .includes(q.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || d.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      // Refetch documents after successful upload
      refetchDocs();
      setUploadDialogOpen(false);
      setFile(null);
    } catch (e: any) {
      setUploadError(e?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleChatWithDocument = (documentId: number) => {
    setSelectedDocumentId(documentId);
    setSelectedConversationId("");
    setChatDialogOpen(true);
  };

  const handleGeneralChat = () => {
    setSelectedDocumentId(null);
    setSelectedConversationId("");
    setChatDialogOpen(true);
  };

  const handleCompareDocuments = () => {
    if (docs.length < 2) {
      alert("You need at least 2 documents to compare");
      return;
    }
    setCompareDialogOpen(true);
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        refetchDocs();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  return (
    <Box>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Document Dashboard
          </Typography>

          {/* Search and Filter Bar */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              label="Search documents"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
              placeholder="Search by document name..."
            />

            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 120 }}
              SelectProps={{ native: true }}
            >
              <option value="all">All Status</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </TextField>
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
              size="large"
            >
              Upload Document
            </Button>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={handleGeneralChat}
              size="large"
            >
              General Chat
            </Button>
            <Button
              variant="outlined"
              startIcon={<CompareIcon />}
              onClick={handleCompareDocuments}
              disabled={docs.length < 2}
              size="large"
            >
              Compare Documents
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Documents Grid */}
      {isLoading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 3,
          }}
        >
          {[...Array(6)].map((_, index) => (
            <Paper key={index} sx={{ p: 2 }}>
              <Skeleton variant="text" height={40} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
            </Paper>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {q || statusFilter !== "all"
              ? "No documents match your filters"
              : "No documents yet"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {q || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Upload your first document to get started"}
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Document
          </Button>
        </Paper>
      ) : (
        <Fade in timeout={300}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            {filtered.map((d) => (
              <DocumentCard
                key={d.id}
                document={d}
                onChat={() => handleChatWithDocument(d.id)}
                onDelete={handleDeleteDocument}
                onRefetch={refetchDocs}
              />
            ))}
          </Box>
        </Fade>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Upload Document
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {uploadError && (
              <Alert severity="error" sx={{ borderRadius: 1 }}>
                {uploadError}
              </Alert>
            )}

            <Box
              sx={{
                border: "2px dashed",
                borderColor: file ? "primary.main" : "grey.300",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: file ? "primary.50" : "grey.50",
                transition: "all 0.2s ease-in-out",
                cursor: "pointer",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary.50",
                },
              }}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <UploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {file ? file.name : "Choose PDF file or drag and drop"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Only PDF files are supported
              </Typography>
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
            </Box>

            {uploading && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Processing document...
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || uploading}
            startIcon={uploading ? undefined : <UploadIcon />}
          >
            {uploading ? "Processing..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog
        open={chatDialogOpen}
        onClose={() => setChatDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "85vh",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={600}>
              {selectedDocumentId
                ? `Chat with "${
                    docs.find((d) => d.id === selectedDocumentId)
                      ?.original_name || `Document ${selectedDocumentId}`
                  }"`
                : "AI Chat Assistant"}
            </Typography>
            <IconButton onClick={() => setChatDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
          <Box sx={{ height: "100%", display: "flex" }}>
            <Box sx={{ width: 300, borderRight: 1, borderColor: "divider" }}>
              <ConversationList
                documentId={selectedDocumentId || undefined}
                onSelectConversation={setSelectedConversationId}
                selectedConversationId={selectedConversationId}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Chatbot
                documentId={selectedDocumentId || undefined}
                conversationId={selectedConversationId}
                onConversationChange={setSelectedConversationId}
              />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            height: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={600}>
              Document Comparison
            </Typography>
            <IconButton onClick={() => setCompareDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: "100%" }}>
          <DocumentComparison
            documents={(docs || []).map((d) => ({
              id: d.id,
              name: d.original_name,
            }))}
            onClose={() => setCompareDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
