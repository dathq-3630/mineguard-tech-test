const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  DOCUMENTS: {
    LIST: "/api/documents",
    UPLOAD: "/api/documents/upload",
    GET: (id: string) => `/api/documents/${id}`,
    DELETE: (id: string) => `/api/documents/${id}`,
    ASK: (id: string) => `/api/documents/${id}/ask`,
  },
  CHAT: {
    SEND: "/api/documents/chat",
  },
  CONVERSATIONS: {
    LIST: "/api/documents/conversations",
    GET: (id: string) => `/api/documents/conversations/${id}`,
  },
  COMPARE: {
    COMPARE: "/api/documents/compare",
  },
};

export { API_BASE_URL };
