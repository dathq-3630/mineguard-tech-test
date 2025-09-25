import { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Stack,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useChat, useConversationHistory } from "../hooks/useDocuments";

interface ChatbotProps {
  documentId?: number;
  conversationId?: string;
  onConversationChange?: (conversationId: string) => void;
}

export default function Chatbot({
  documentId,
  conversationId,
  onConversationChange,
}: ChatbotProps) {
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // React Query hooks
  const chatMutation = useChat();
  const { data: conversationData } = useConversationHistory(
    currentConversationId || ""
  );

  const messages = conversationData?.messages || [];
  const loading = chatMutation.isPending;
  const error = chatMutation.error?.message || undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      onConversationChange?.(conversationId);
    }
  }, [conversationId, currentConversationId, onConversationChange]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const messageText = message.trim();
    setMessage("");

    try {
      const data = await chatMutation.mutateAsync({
        message: messageText,
        documentId: documentId,
        conversationId: currentConversationId || undefined,
      });

      if (
        data.conversationId &&
        data.conversationId !== currentConversationId
      ) {
        setCurrentConversationId(data.conversationId);
        onConversationChange?.(data.conversationId);
      }
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    onConversationChange?.("");
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Paper
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              {documentId ? "Document Chat" : "General Chat"}
            </Typography>
            <Stack direction="row" spacing={1}>
              {currentConversationId && (
                <Chip
                  label={`Conversation: ${currentConversationId.slice(-8)}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <IconButton
                size="small"
                onClick={startNewConversation}
                title="New Conversation"
              >
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {documentId
                  ? "Ask questions about this document..."
                  : "Start a conversation about compliance and safety..."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      maxWidth: "80%",
                      flexDirection:
                        msg.role === "user" ? "row-reverse" : "row",
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor:
                          msg.role === "user"
                            ? "primary.main"
                            : "secondary.main",
                        width: 32,
                        height: 32,
                      }}
                    >
                      {msg.role === "user" ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor:
                          msg.role === "user" ? "primary.light" : "grey.100",
                        color:
                          msg.role === "user"
                            ? "primary.contrastText"
                            : "text.primary",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        {msg.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 1,
                          opacity: 0.7,
                          fontSize: "0.75rem",
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </Typography>
                    </Paper>
                  </Stack>
                </Box>
              ))}
              {loading && (
                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <Stack direction="row" spacing={1}>
                    <Avatar
                      sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}
                    >
                      <BotIcon />
                    </Avatar>
                    <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                      <CircularProgress size={16} />
                    </Paper>
                  </Stack>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          )}
        </Box>

        {/* Error Display */}
        {error && (
          <Box sx={{ px: 2 }}>
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={
                documentId
                  ? "Ask about this document..."
                  : "Ask about compliance, safety, or procedures..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              size="small"
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={!message.trim() || loading}
              sx={{ minWidth: "auto", px: 2 }}
            >
              <SendIcon />
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
