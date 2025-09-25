import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface Document {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  summary: string | null;
  key_points: string[] | null;
  processing_status: string;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  document_id: number | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  documentId?: number;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
  costUsd: number;
  conversationId: string;
}

export interface CompareRequest {
  document1Id: number;
  document2Id: number;
  comparisonType: "gap_analysis" | "similarity" | "differences";
}

export interface CompareResponse {
  comparison: string;
  keyFindings: string[];
  score?: number;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
  costUsd: number;
  documents: {
    document1: { id: number; name: string };
    document2: { id: number; name: string };
  };
  comparisonType: string;
}

// Documents queries
export const useDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async (): Promise<Document[]> => {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DOCUMENTS.LIST}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      // Handle the actual API response structure with 'items' property
      const documents = Array.isArray(data) ? data : data.items || [];
      return documents;
    },
  });
};

export const useDocument = (id: string) => {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: async (): Promise<Document> => {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DOCUMENTS.GET(id)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }
      return response.json();
    },
    enabled: !!id,
  });
};

// Conversations queries
export const useConversations = (documentId?: number) => {
  return useQuery({
    queryKey: ["conversations", documentId],
    queryFn: async (): Promise<{
      conversations: Conversation[];
      count: number;
    }> => {
      const url = documentId
        ? `${API_BASE_URL}${API_ENDPOINTS.CONVERSATIONS.LIST}?documentId=${documentId}`
        : `${API_BASE_URL}${API_ENDPOINTS.CONVERSATIONS.LIST}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      return response.json();
    },
  });
};

export const useConversationHistory = (conversationId: string) => {
  return useQuery({
    queryKey: ["conversations", conversationId, "history"],
    queryFn: async (): Promise<{
      conversationId: string;
      messages: Message[];
      count: number;
    }> => {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.CONVERSATIONS.GET(conversationId)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch conversation history");
      }
      return response.json();
    },
    enabled: !!conversationId,
  });
};

// Chat mutation
export const useChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChatRequest): Promise<ChatResponse> => {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.CHAT.SEND}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate conversations to refresh the list
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // If this is a document-specific chat, also invalidate document conversations
      if (variables.documentId) {
        queryClient.invalidateQueries({
          queryKey: ["conversations", variables.documentId],
        });
      }
    },
  });
};

// Document comparison mutation
export const useDocumentComparison = () => {
  return useMutation({
    mutationFn: async (data: CompareRequest): Promise<CompareResponse> => {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.COMPARE.COMPARE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to compare documents");
      }

      return response.json();
    },
  });
};
