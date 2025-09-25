# Mineguard AI-Powered Compliance Document Analyzer

A comprehensive document analysis platform that uses AI to process, summarize, and analyze compliance documents with intelligent chatbot capabilities and document comparison features.

## 🚀 Features

- **Document Upload & Processing**: Upload PDF documents with automatic AI-powered summarization
- **Intelligent Chatbot**: Chat with documents or ask general questions about compliance
- **Document Comparison**: Compare documents for gap analysis, similarities, and differences
- **Conversation Management**: Persistent chat history with document context
- **Real-time Status Updates**: Live processing status with Server-Sent Events
- **File Downloads**: Download original documents and export conversations
- **Cost Tracking**: Monitor AI usage and costs across all operations

## 🏗️ Architecture

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite + Material-UI
- **Database**: SQLite with better-sqlite3
- **AI**: Anthropic Claude API
- **File Processing**: PDF parsing with pdf-parse-new

## 📋 Prerequisites

- Node.js >= 18
- npm or yarn
- Anthropic API key

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Mineguard_tech_test
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required: Get your API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Set to "1" for testing without API costs
MOCK_AI=0

# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/app.db

# AI Models (optional - defaults provided)
AI_SUMMARY_MODEL=claude-3-haiku-20240307
AI_QA_MODEL=claude-3-haiku-20240307
AI_SYNTHESIS_MODEL=claude-3-5-sonnet-latest

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS (should match your frontend URL)
CORS_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Backend API URL
VITE_API_URL=http://localhost:3001

# Optional: Enable debug logging
VITE_DEBUG=false
```

Start the frontend:

```bash
npm run dev
```

## 🚀 Running the Application

### Development Mode

1. **Start Backend** (Terminal 1):

```bash
cd backend
npm run dev
```

2. **Start Frontend** (Terminal 2):

```bash
cd frontend
npm run dev
```

3. **Access the Application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Production Mode

1. **Build Backend**:

```bash
cd backend
npm run build
npm start
```

2. **Build Frontend**:

```bash
cd frontend
npm run build
```

## 📖 Usage Guide

### 1. Document Upload

- Navigate to the dashboard
- Click "Upload Document" to upload PDF files
- Documents are automatically processed with AI summarization
- Monitor processing status in real-time

### 2. Chat with Documents

- Click on any document to open the detail view
- Use the chatbot to ask questions about the document
- Conversations are automatically saved and can be continued later

### 3. General Chat

- Use the general chatbot for compliance questions without specific document context
- All conversations are persistent and searchable

### 4. Document Comparison

- Select two documents from the dashboard
- Choose comparison type: Gap Analysis, Similarity, or Differences
- Get detailed analysis with key findings and recommendations

### 5. Conversation Management

- View all conversations in the conversation list
- Download conversations as text files for backup
- Continue existing conversations seamlessly

## 🔧 Configuration

### Environment Variables

#### Backend (.env)

- `ANTHROPIC_API_KEY`: Required - Your Anthropic API key
- `MOCK_AI`: Set to "1" for testing without API costs
- `PORT`: Backend server port (default: 3001)
- `CORS_ORIGIN`: Frontend URL for CORS (default: http://localhost:5173)

#### Frontend (.env)

- `VITE_API_URL`: Backend API URL (default: http://localhost:3001)
- `VITE_DEBUG`: Enable debug logging (default: false)

### AI Model Configuration

The system supports different Claude models for different tasks:

- **Summary**: claude-3-haiku-20240307 (fast, cost-effective)
- **Q&A**: claude-3-haiku-20240307 (fast, cost-effective)
- **Synthesis**: claude-3-5-sonnet-latest (high-quality analysis)

## 🗄️ Database Schema

The application uses SQLite with three main tables:

- **documents**: Stores document metadata, content, and AI-generated summaries
- **conversations**: Manages chat sessions and document associations
- **conversation_messages**: Stores individual messages in conversations

## 📊 API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `GET /api/documents/` - List documents
- `POST /api/documents/upload` - Upload document
- `POST /api/documents/mock-upload` - Mock upload for testing
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/status` - Get document processing status
- `GET /api/documents/:id/status/stream` - Real-time status updates (SSE)

### Chat & AI

- `POST /api/documents/chat` - General chatbot
- `POST /api/documents/:id/ask` - Document-specific Q&A
- `POST /api/documents/compare` - Compare documents

### Conversation Management

- `GET /api/documents/conversations` - List conversations
- `GET /api/documents/conversations/:id` - Get conversation history

### File Operations

- `GET /api/documents/:id/download` - Download original document
- `GET /api/documents/conversations/:id/download` - Download conversation as text

### Document Management

- `DELETE /api/documents/:id` - Soft delete document

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## 🧪 Testing

### Mock Mode

Set `MOCK_AI=1` in your backend `.env` to enable mock mode:

- No API calls to Anthropic
- Instant responses for testing
- No costs incurred

### Development Testing

```bash
# Backend tests
cd backend
npm run lint

# Frontend tests
cd frontend
npm run lint
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**

   - Ensure `CORS_ORIGIN` in backend matches your frontend URL
   - Check that both servers are running on correct ports

2. **API Key Issues**

   - Verify your Anthropic API key is correct
   - Check API key has sufficient credits
   - Use mock mode for testing: `MOCK_AI=1`

3. **File Upload Issues**

   - Check file size limits (default: 10MB)
   - Ensure uploads directory exists and is writable
   - Verify file is a valid PDF

4. **Database Issues**
   - Database is automatically created on first run
   - Check database path permissions
   - Delete `data/app.db` to reset database

### Debug Mode

Enable debug logging in frontend:

```env
VITE_DEBUG=true
```

Check backend logs for detailed error information.

## 📁 Project Structure

```
Mineguard_tech_test/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── middleware/     # Express middleware
│   │   ├── repositories/   # Database operations
│   │   ├── routes/         # API routes
│   │   ├── services/       # AI and business logic
│   │   └── utils/          # Utilities and helpers
│   ├── data/               # SQLite database
│   ├── uploads/            # Uploaded files
│   └── .env.example        # Backend environment template
├── frontend/               # React + TypeScript SPA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Frontend utilities
│   │   └── config/         # Frontend configuration
│   └── .env.example        # Frontend environment template
├── Documents/              # Sample documents
├── API_DOCUMENTATION.md    # Complete API reference
└── README.md              # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check the application logs
4. Create an issue with detailed information

---

**Note**: This application requires an Anthropic API key for AI functionality. Ensure you have sufficient API credits for your usage patterns.
