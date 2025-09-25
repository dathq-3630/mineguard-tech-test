import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Stack,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import {
  Chat as ChatIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Description as FileIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import StatusBadge from "./StatusBadge";
import { useDocumentStatus } from "../hooks/useDocumentStatus";
import { downloadDocument } from "../utils/download";

interface DocumentCardProps {
  document: {
    id: number;
    original_name: string;
    size_bytes: number;
    created_at: string;
    processing_status: string;
    summary?: string | null;
  };
  onChat: (documentId: number) => void;
  onDelete: (documentId: number) => void;
  onRefetch: () => void;
}

export default function DocumentCard({
  document,
  onChat,
  onDelete,
  onRefetch,
}: DocumentCardProps) {
  const { status, isConnected } = useDocumentStatus(
    document.id,
    document.processing_status,
    onRefetch
  );

  const currentStatus = status?.processing_status || document.processing_status;
  const isProcessing = currentStatus === "processing";
  const isCompleted = currentStatus === "completed";
  const isFailed = currentStatus === "failed";

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getSummaryPreview = () => {
    if (!document.summary) return "No summary available";
    if (document.summary.length <= 100) return document.summary;
    return document.summary.substring(0, 100) + "...";
  };

  const handleDownload = async () => {
    try {
      await downloadDocument(document.id);
    } catch (error) {
      console.error("Failed to download document:", error);
      // You could add a toast notification here
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
        minHeight: 280, // Ensure minimum height for consistency
      }}
    >
      <CardContent
        sx={{ flexGrow: 1, pb: 1, display: "flex", flexDirection: "column" }}
      >
        <Stack spacing={2} sx={{ flexGrow: 1 }}>
          {/* Header with file icon and name */}
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <FileIcon color="primary" sx={{ mt: 0.5, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {document.original_name}
              </Typography>
            </Box>
          </Stack>

          {/* Status and metadata */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <StatusBadge
              status={currentStatus}
              isStreaming={isConnected && isProcessing}
            />
            <Chip
              label={formatFileSize(document.size_bytes)}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
            <Typography variant="caption" color="text.secondary">
              {formatDate(document.created_at)}
            </Typography>
          </Stack>

          {/* Summary preview */}
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                flexGrow: 1,
              }}
            >
              {getSummaryPreview()}
            </Typography>
          </Box>

          {/* Processing indicator */}
          {isProcessing && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="warning.main">
                AI analysis in progress...
              </Typography>
            </Box>
          )}

          {isFailed && (
            <Typography variant="caption" color="error.main">
              Processing failed - please try uploading again
            </Typography>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2, mt: "auto" }}>
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
          <Button
            component={Link}
            to="/doc/$id"
            params={{ id: document.id.toString() }}
            variant="contained"
            size="small"
            startIcon={<ViewIcon />}
            sx={{ flexGrow: 1 }}
          >
            View
          </Button>

          <Tooltip title="Download document">
            <IconButton onClick={handleDownload} color="primary" size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Chat with this document">
            <IconButton
              onClick={() => onChat(document.id)}
              disabled={!isCompleted}
              color="primary"
              size="small"
            >
              <ChatIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete document">
            <IconButton
              onClick={() => onDelete(document.id)}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardActions>
    </Card>
  );
}
