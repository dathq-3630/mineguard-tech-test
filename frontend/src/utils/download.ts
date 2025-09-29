/**
 * Utility functions for downloading files and conversations
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Download a document file
 */
export async function downloadDocument(documentId: number): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/documents/${documentId}/download`
    );

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `document_${documentId}.pdf`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading document:", error);
    throw error;
  }
}

/**
 * Download a conversation as a text file
 */
export async function downloadConversation(
  conversationId: string
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/documents/conversations/${conversationId}/download`
    );

    if (!response.ok) {
      throw new Error(`Failed to download conversation: ${response.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `conversation_${conversationId}.txt`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading conversation:", error);
    throw error;
  }
}
