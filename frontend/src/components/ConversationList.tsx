import {
  Box,
  Paper,
  Typography,
  List,
  ListItemText,
  ListItemButton,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useConversations } from "../hooks/useDocuments";
import { downloadConversation } from "../utils/download";

interface Conversation {
  conversation_id: string;
  document_id: number | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ConversationListProps {
  documentId?: number;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export default function ConversationList({
  documentId,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useConversations(documentId);
  const conversations = data?.conversations || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString();
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString();
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    const shortId = conversation.conversation_id.slice(-8);
    return `Chat ${shortId}`;
  };

  const handleDownloadConversation = async (
    conversationId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent triggering the conversation selection
    try {
      await downloadConversation(conversationId);
    } catch (error) {
      console.error("Failed to download conversation:", error);
      // You could add a toast notification here
    }
  };

  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">
            {documentId ? "Document Conversations" : "All Conversations"}
          </Typography>
          <IconButton size="small" onClick={() => refetch()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
            <Button variant="outlined" onClick={() => refetch()} fullWidth>
              Retry
            </Button>
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <ChatIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No conversations found
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {conversations.map((conversation, index) => (
              <div key={conversation.conversation_id}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() =>
                      onSelectConversation(conversation.conversation_id)
                    }
                    selected={
                      selectedConversationId === conversation.conversation_id
                    }
                    sx={{
                      flex: 1,
                      "&.Mui-selected": {
                        bgcolor: "primary.light",
                        "&:hover": {
                          bgcolor: "primary.light",
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="subtitle2">
                            {getConversationTitle(conversation)}
                          </Typography>
                          <Chip
                            label={conversation.message_count}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(conversation.updated_at)}
                          </Typography>
                          {conversation.document_id && (
                            <Chip
                              label={`Document ${conversation.document_id}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: "0.7rem", height: 20 }}
                            />
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                  <Tooltip title="Download conversation">
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        handleDownloadConversation(
                          conversation.conversation_id,
                          e
                        )
                      }
                      sx={{ mr: 1 }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {index < conversations.length - 1 && <Divider />}
              </div>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}
