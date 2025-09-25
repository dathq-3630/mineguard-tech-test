import { useEffect, useState } from "react";

export interface DocumentStatus {
  id: number;
  processing_status: "uploaded" | "processing" | "completed" | "failed";
  has_summary: boolean;
  has_key_points: boolean;
  timestamp: string;
}

export function useDocumentStatus(
  documentId: number,
  initialStatus?: string,
  onComplete?: () => void
) {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    // Don't connect if document is already completed or failed
    if (initialStatus === "completed" || initialStatus === "failed") {
      return;
    }

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
    const eventSource = new EventSource(
      `${baseUrl}/api/documents/${documentId}/status/stream`
    );

    // Set a timeout to close the connection after 5 minutes to prevent hanging
    const timeout = setTimeout(() => {
      console.log("Closing EventSource connection due to timeout");
      eventSource.close();
      setIsConnected(false);
    }, 300000); // 5 minutes

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: DocumentStatus = JSON.parse(event.data);
        setStatus(data);

        // Close connection immediately when processing is complete
        if (
          data.processing_status === "completed" ||
          data.processing_status === "failed"
        ) {
          clearTimeout(timeout);
          eventSource.close();
          setIsConnected(false);

          // Trigger refetch to get latest document data
          if (onComplete) {
            onComplete();
          }
        }
      } catch (err) {
        console.error("Failed to parse status update:", err);
        setError("Failed to parse status update");
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      setError("Connection failed");
      setIsConnected(false);
      clearTimeout(timeout);
      eventSource.close();
    };

    return () => {
      clearTimeout(timeout);
      eventSource.close();
      setIsConnected(false);
    };
  }, [documentId, initialStatus]);

  return {
    status,
    isConnected,
    error,
  };
}
