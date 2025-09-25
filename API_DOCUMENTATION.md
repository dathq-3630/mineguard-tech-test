# API Documentation - New Endpoints

## Overview

The API has been enhanced with new chatbot and document comparison functionality to support:

1. **General Chatbot Interface**: Chat without requiring specific document IDs in URL
2. **Document-Aware Chatbot**: Chat with document context
3. **Document Comparison**: Gap analysis, similarity analysis, and difference detection
4. **Existing Summarization**: Already implemented via `generateSummaryAndKeyPoints()`

## New Endpoints

### 0. Health Check - `/health`

**GET** `/health`

**Purpose**: Health check endpoint to verify API server status.

**Response**:

```json
{
  "ok": true,
  "timestamp": "2025-01-24T20:41:30.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

**Use Cases**:

- ✅ **Load balancer health checks**
- ✅ **Monitoring and alerting**
- ✅ **Service discovery**
- ✅ **Development testing**

---

### 1. General Chatbot - `/api/documents/chat`

**POST** `/api/documents/chat`

**Purpose**: General chatbot interface that can work with or without document context.

**Request Body**:

```json
{
  "message": "What are the safety requirements for working at height?",
  "documentId": 123, // Optional - if provided, uses document as context
  "conversationId": "chat_abc123" // Optional - for maintaining conversation history
}
```

**Response**:

```json
{
  "response": "Based on the document, the safety requirements for working at height include...",
  "usage": {
    "model": "claude-3-haiku-20240307",
    "inputTokens": 150,
    "outputTokens": 200
  },
  "costUsd": 0.0045,
  "conversationId": "chat_abc123"
}
```

**Key Features**:

- ✅ No document ID required in URL
- ✅ Optional document context via `documentId` in body
- ✅ **Document Association**: When `documentId` is provided, the conversation is linked to that document
- ✅ Conversation history support with persistent storage
- ✅ Cost tracking and usage statistics
- ✅ **Automatic conversation creation**: If no `conversationId` provided, creates a new one

---

### 2. Conversation Management

#### List Conversations - `/api/documents/conversations`

**GET** `/api/documents/conversations`

**Purpose**: Get all conversations, optionally filtered by document ID.

**Query Parameters**:

- `documentId` (optional): Filter conversations for a specific document
- `limit` (optional): Maximum number of conversations to return (default: 20)

**Request Examples**:

```bash
# Get all conversations
GET /api/documents/conversations

# Get conversations for a specific document
GET /api/documents/conversations?documentId=7

# Limit results
GET /api/documents/conversations?limit=10&documentId=7
```

**Response**:

```json
{
  "conversations": [
    {
      "conversation_id": "chat_1758746490105_ivrfc0uw7",
      "document_id": 7,
      "created_at": "2025-09-24 20:41:30",
      "updated_at": "2025-09-24 20:41:33",
      "message_count": 2
    }
  ],
  "count": 1
}
```

#### Get Conversation History - `/api/documents/conversations/:conversationId`

**GET** `/api/documents/conversations/:conversationId`

**Purpose**: Get the message history for a specific conversation.

**Query Parameters**:

- `limit` (optional): Maximum number of messages to return (default: 50)

**Request Example**:

```bash
GET /api/documents/conversations/chat_1758746490105_ivrfc0uw7?limit=20
```

**Response**:

```json
{
  "conversationId": "chat_1758746490105_ivrfc0uw7",
  "messages": [
    {
      "role": "user",
      "content": "What safety measures are mentioned in this mining document?",
      "created_at": "2025-09-24 20:41:30"
    },
    {
      "role": "assistant",
      "content": "The key safety measures mentioned include...",
      "created_at": "2025-09-24 20:41:33"
    }
  ],
  "count": 2
}
```

---

### 3. Document Comparison - `/api/documents/compare`

**POST** `/api/documents/compare`

**Purpose**: Compare two documents for gap analysis, similarities, or differences.

**Request Body**:

```json
{
  "document1Id": 123,
  "document2Id": 456,
  "comparisonType": "gap_analysis" // Options: "gap_analysis", "similarity", "differences"
}
```

**Response**:

```json
{
  "comparison": "Detailed analysis comparing the two documents...",
  "keyFindings": [
    "Document 1 lacks specific PPE requirements found in Document 2",
    "Training protocols differ significantly between documents",
    "Risk assessment procedures need alignment"
  ],
  "score": 75, // Only for similarity analysis
  "usage": {
    "model": "claude-3-sonnet-20240229",
    "inputTokens": 2500,
    "outputTokens": 800
  },
  "costUsd": 0.0234,
  "documents": {
    "document1": { "id": 123, "name": "Site Safety Procedures.pdf" },
    "document2": { "id": 456, "name": "Industry Standards.pdf" }
  },
  "comparisonType": "gap_analysis"
}
```

**Comparison Types**:

- **`gap_analysis`**: Identifies missing requirements and compliance gaps
- **`similarity`**: Finds overlaps and common elements (includes similarity score 0-100%)
- **`differences`**: Highlights conflicts and contradictions

---

## Existing Endpoints (Enhanced)

### Document Upload with Auto-Summarization

**POST** `/api/documents/upload`

- ✅ **Already implemented**: Automatic summarization via `generateSummaryAndKeyPoints()`
- ✅ Background AI analysis generates summary and key points
- ✅ Summary stored in database `summary` field

### Document-Specific Q&A

**POST** `/api/documents/:id/ask`

- ✅ **Now integrated with conversation system** - creates conversations automatically
- ✅ **Smart caching** - searches conversation history for similar questions
- ✅ **Returns conversation ID** - can be used to continue the conversation
- ✅ Uses document ID in URL (traditional approach)

**Enhanced Response Format**:

```json
{
  "answer": "The safety requirements include...",
  "usage": {
    "model": "claude-3-haiku-20240307",
    "inputTokens": 16,
    "outputTokens": 221
  },
  "costUsd": 0.0003,
  "cached": false,
  "conversationId": "qa_1758747141461_i0by6zup6"
}
```

### Document Details

**GET** `/api/documents/:id`

- ✅ Returns document with summary and key_points
- ✅ Summary field populated by auto-summarization

### Document Processing Status

**GET** `/api/documents/:id/status`

**Purpose**: Get the current processing status of a document.

**Response**:

```json
{
  "id": 6,
  "processing_status": "processing",
  "has_summary": false,
  "has_key_points": false,
  "timestamp": "2025-01-24T20:41:30.000Z"
}
```

**Status Values**:

- `uploaded`: Document uploaded, waiting for processing
- `processing`: AI analysis in progress
- `completed`: Processing finished successfully
- `failed`: Processing encountered an error

### Real-Time Status Updates

**GET** `/api/documents/:id/status/stream`

**Purpose**: Server-Sent Events (SSE) endpoint for real-time document processing status updates.

**Features**:

- ✅ **Real-time updates**: Streams status changes as they happen
- ✅ **Auto-close**: Connection closes when processing completes or fails
- ✅ **Timeout protection**: Auto-closes after 5 minutes
- ✅ **CORS enabled**: Works with frontend applications

**Response Format** (Server-Sent Events):

```
data: {"id":6,"processing_status":"processing","has_summary":false,"has_key_points":false,"timestamp":"2025-01-24T20:41:30.000Z"}

data: {"id":6,"processing_status":"completed","has_summary":true,"has_key_points":true,"timestamp":"2025-01-24T20:41:45.000Z"}
```

**Frontend Integration**:

```javascript
// Real-time status monitoring
const eventSource = new EventSource(
  `/api/documents/${documentId}/status/stream`
);

eventSource.onmessage = (event) => {
  const status = JSON.parse(event.data);
  console.log("Status update:", status);

  if (status.processing_status === "completed") {
    // Processing finished, update UI
    eventSource.close();
  }
};

eventSource.onerror = (error) => {
  console.error("SSE error:", error);
  eventSource.close();
};
```

### Mock Upload (Development)

**POST** `/api/documents/mock-upload`

**Purpose**: Mock upload endpoint for testing without actual file processing.

**Request**: Same as regular upload
**Response**: Same as regular upload but with `processing_status: "completed"` immediately

**Usage**: Set `MOCK_AI=1` environment variable to enable mock mode.

---

## Frontend Integration Examples

### 1. Chatbot Component (Document-Aware)

```javascript
// Chat with document context
const response = await fetch("/api/documents/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What PPE is required for this procedure?",
    documentId: currentDocument.id,
    conversationId: chatSession.id,
  }),
});
```

### 2. General Chatbot (No Document Context)

```javascript
// General chat without specific document
const response = await fetch("/api/documents/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What are general safety best practices?",
    conversationId: chatSession.id,
  }),
});
```

### 3. Conversation Management

```javascript
// Get all conversations for a document
const conversations = await fetch(
  `/api/documents/conversations?documentId=${documentId}`
);
const { conversations: convList } = await conversations.json();

// Get conversation history
const history = await fetch(`/api/documents/conversations/${conversationId}`);
const { messages } = await history.json();

// Continue existing conversation
const response = await fetch("/api/documents/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Follow-up question...",
    conversationId: existingConversationId,
    documentId: currentDocument.id,
  }),
});
```

### 4. Document Comparison

```javascript
// Compare two selected documents
const response = await fetch("/api/documents/compare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    document1Id: selectedDocs[0].id,
    document2Id: selectedDocs[1].id,
    comparisonType: "gap_analysis",
  }),
});
```

---

## Database Schema Updates

**Simplified, consolidated schema**:

```sql
-- Document storage with processing status
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  text_content TEXT,
  summary TEXT,
  key_points TEXT,
  processing_status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Conversation sessions (handles both chat and Q&A)
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL UNIQUE,
  document_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Individual messages in conversations (unified system)
CREATE TABLE conversation_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);
```

**Key Improvements**:

- ✅ **Eliminated redundancy**: Removed `qa_messages` table
- ✅ **Unified system**: Both `/chat` and `/:id/ask` use the same conversation system
- ✅ **Better caching**: Searches conversation history instead of exact-match lookup
- ✅ **Consistent UX**: All Q&A interactions create conversation threads

---

### 6. Document File Download - `/api/documents/:id/download`

**GET** `/api/documents/:id/download`

**Purpose**: Download the original document file that was uploaded.

**Parameters**:

- `id` (path): Document ID

**Response**: Binary file stream with appropriate headers

**Headers Set**:

- `Content-Disposition`: `attachment; filename="original_filename.pdf"`
- `Content-Type`: Document's MIME type (e.g., `application/pdf`)
- `Content-Length`: File size in bytes

**Use Cases**:

- ✅ **Document backup and archival**
- ✅ **Offline access to original files**
- ✅ **Compliance and audit requirements**
- ✅ **File sharing and distribution**

**Example**:

```bash
curl -O http://localhost:3001/api/documents/1/download
# Downloads the original PDF file
```

---

### 7. Conversation Download - `/api/documents/conversations/:conversationId/download`

**GET** `/api/documents/conversations/:conversationId/download`

**Purpose**: Export a conversation as a readable text file for backup, sharing, or compliance.

**Parameters**:

- `conversationId` (path): Conversation ID

**Response**: Text file with formatted conversation

**File Format**:

```
Conversation Export
Conversation ID: chat_1234567890_abc123
Exported: 2025-01-24T20:41:30.000Z

==================================================

[1/24/2025, 2:41:30 PM] User:
What are the safety requirements for working at height?

---

[1/24/2025, 2:41:32 PM] Assistant:
Based on the compliance framework, working at height requires...

---

[1/24/2025, 2:42:15 PM] User:
Can you provide more details about PPE requirements?

---

[1/24/2025, 2:42:18 PM] Assistant:
Certainly! The PPE requirements include...
```

**Use Cases**:

- ✅ **Conversation backup and archival**
- ✅ **Compliance documentation**
- ✅ **Knowledge sharing and training**
- ✅ **Audit trail preservation**
- ✅ **Offline reference**

**Example**:

```bash
curl -O http://localhost:3001/api/documents/conversations/chat_1234567890_abc123/download
# Downloads conversation_chat_1234567890_abc123_2025-01-24.txt
```

---

### 8. Soft Delete Document - `/api/documents/:id`

**DELETE** `/api/documents/:id`

**Purpose**: Soft delete a document (preserves data but hides from listings).

**Parameters**:

- `id` (path): Document ID

**Response**:

```json
{
  "message": "Document deleted successfully",
  "id": 123
}
```

**Behavior**:

- Sets `deleted_at` timestamp instead of removing record
- Document becomes invisible to all queries
- All related data (conversations, analysis) is preserved
- Can be restored by clearing `deleted_at` field

**Use Cases**:

- ✅ **Data preservation for compliance**
- ✅ **Accidental deletion recovery**
- ✅ **Audit trail maintenance**
- ✅ **Temporary document hiding**

---

## Implementation Status

✅ **Completed**:

- [x] **Health check endpoint** (`/health`) - Server status monitoring
- [x] **Document listing** (`GET /api/documents/`) - List all documents
- [x] **Document details** (`GET /api/documents/:id`) - Get document with summary
- [x] **Document status** (`GET /api/documents/:id/status`) - Check processing status
- [x] **Real-time status streaming** (`GET /api/documents/:id/status/stream`) - SSE updates
- [x] **Document upload** (`POST /api/documents/upload`) - Upload with auto-summarization
- [x] **Mock upload** (`POST /api/documents/mock-upload`) - Testing without AI processing
- [x] **Document Q&A** (`POST /api/documents/:id/ask`) - Ask questions about specific documents
- [x] **General chatbot** (`POST /api/documents/chat`) - Chat with/without document context
- [x] **Document comparison** (`POST /api/documents/compare`) - Gap analysis and similarity
- [x] **Conversation management** (`GET /api/documents/conversations`) - List conversations
- [x] **Conversation history** (`GET /api/documents/conversations/:id`) - Get message history
- [x] **Document file download** (`GET /api/documents/:id/download`) - Download original files
- [x] **Conversation download** (`GET /api/documents/conversations/:id/download`) - Export conversations
- [x] **Soft delete document** (`DELETE /api/documents/:id`) - Soft delete with data preservation
- [x] **Document-conversation association**: Chat messages properly linked to documents
- [x] **Unified Q&A system**: `/documents/:id/ask` now uses conversations (eliminates redundancy)
- [x] **Smart caching**: Conversation history-based caching instead of exact-match
- [x] **Database consolidation**: Removed redundant `qa_messages` table
- [x] **Summarization function**: Auto-generates summary and key points
- [x] **Clean database schema**: 3 core tables with proper relationships
- [x] **TypeScript types and validation**: Full type safety
- [x] **Error handling and logging**: Comprehensive error management
- [x] **Cost tracking**: All AI operations track usage and costs
- [x] **Soft delete functionality**: Documents are soft-deleted instead of hard-deleted
- [x] **File download**: Download original document files
- [x] **Conversation download**: Export chat conversations as text files

🔄 **Ready for Frontend Integration**:

- [ ] Frontend chatbot component with conversation history
- [ ] Document-specific chat interface
- [ ] Conversation list/management UI
- [ ] Document comparison UI
- [ ] **All backend functionality complete** - conversation persistence, document association, history retrieval

---

## Usage Notes

1. **Cost Management**: All endpoints track token usage and costs
2. **Mock Mode**: Set `MOCK_AI=1` for testing without API costs
3. **Error Handling**: Comprehensive validation and error responses
4. **Unified System**: Both `/chat` and `/:id/ask` create conversations - no separate caching tables
5. **Smart Caching**: Searches conversation history for similar questions instead of exact-match lookup
6. **Conversation Continuity**: All Q&A interactions can be continued as chat conversations

The API now provides a **fully unified conversation system** that handles both traditional document Q&A and modern chat interfaces seamlessly. Every interaction creates a conversation thread that can be retrieved, continued, and managed consistently.
