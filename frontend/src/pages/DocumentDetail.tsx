import { useState } from "react";
import {
  Alert,
  Box,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useParams, useNavigate } from "@tanstack/react-router";
import Chatbot from "../components/Chatbot";
import ConversationList from "../components/ConversationList";
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useDocument } from "../hooks/useDocuments";
import { downloadDocument } from "../utils/download";
import StatusBadge from "../components/StatusBadge";

export default function DocumentDetail() {
  const params = useParams({ from: "/doc/$id" as any }) as { id: string };
  const navigate = useNavigate();
  const { data: doc, isLoading, error } = useDocument(params.id);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = async () => {
    try {
      await downloadDocument(doc!.id);
    } catch (error) {
      console.error("Failed to download document:", error);
      // You could add a toast notification here
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/documents/${doc!.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        navigate({ to: "/" });
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      // You could add a toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Loading document...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load document: {error.message}
      </Alert>
    );
  }

  if (!doc) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Document not found.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* Header Section */}
      <Card
        sx={{
          mb: 3,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={2}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <FileIcon sx={{ fontSize: 32 }} />
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 600, wordBreak: "break-word" }}
                >
                  {doc.original_name}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
              >
                <Chip
                  icon={<StorageIcon />}
                  label={formatFileSize(doc.size_bytes)}
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                />
                <Chip
                  icon={<ScheduleIcon />}
                  label={formatDate(doc.created_at)}
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                />
                <Chip
                  label={doc.processing_status.toUpperCase()}
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Download document">
                <IconButton
                  onClick={handleDownload}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  }}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Chat with document">
                <IconButton
                  onClick={() => setChatDialogOpen(true)}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  }}
                >
                  <ChatIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete document">
                <IconButton
                  onClick={handleDelete}
                  disabled={isDeleting}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  }}
                >
                  {isDeleting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <DeleteIcon />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Content Layout */}
      <Stack spacing={3}>
        {/* Summary and Key Points Row */}
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* Summary Section */}
          <Box sx={{ flex: 2 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <FileIcon color="primary" />
                  Summary
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  {doc.summary || "No summary available"}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Key Points Section */}
          {doc.key_points && doc.key_points.length > 0 && (
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <CheckCircleIcon color="primary" />
                    Key Points
                  </Typography>
                  <List dense>
                    {doc.key_points.map((point, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Typography
                            variant="body2"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          >
                            {index + 1}.
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={point}
                          sx={{
                            "& .MuiListItemText-primary": {
                              fontSize: "0.9rem",
                              lineHeight: 1.4,
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>

        {/* Document Information */}
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <StorageIcon color="primary" />
              Document Information
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  MIME Type
                </Typography>
                <Typography variant="body1">{doc.mime_type}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  File Size
                </Typography>
                <Typography variant="body1">
                  {formatFileSize(doc.size_bytes)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(doc.created_at)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Status
                </Typography>
                <StatusBadge
                  status={
                    doc.processing_status as
                      | "uploaded"
                      | "processing"
                      | "completed"
                      | "failed"
                  }
                  isStreaming={false}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* Chat Dialog */}
      <Dialog
        open={chatDialogOpen}
        onClose={() => setChatDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: "80vh" } }}
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Chat with "{doc.original_name}"
            </Typography>
            <IconButton onClick={() => setChatDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: "100%" }}>
          <Box sx={{ height: "100%", display: "flex" }}>
            <Box sx={{ width: 300, borderRight: 1, borderColor: "divider" }}>
              <ConversationList
                documentId={parseInt(params.id)}
                onSelectConversation={setSelectedConversationId}
                selectedConversationId={selectedConversationId}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Chatbot
                documentId={parseInt(params.id)}
                conversationId={selectedConversationId}
                onConversationChange={setSelectedConversationId}
              />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
