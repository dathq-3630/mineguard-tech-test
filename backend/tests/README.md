# Backend Testing Documentation

This directory contains comprehensive unit and integration tests for the Mineguard backend API.

## Test Structure

```
tests/
├── setup.ts                    # Jest setup and global mocks
├── repositories/
│   └── documents.test.ts      # Repository layer tests
├── services/
│   └── ai.test.ts             # AI service tests
├── middleware/
│   ├── validation.test.ts     # Validation middleware tests
│   └── errorHandler.test.ts   # Error handling tests
├── utils/
│   └── errors.test.ts         # Error class tests
├── routes/
│   └── documents.test.ts     # API route integration tests
└── integration/
    └── database.test.ts      # Database integration tests
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### CI Mode

```bash
npm run test:ci
```

## Test Categories

### Unit Tests

- **Repository Tests**: Test database operations with mocked database
- **Service Tests**: Test AI service functions with mocked AI API
- **Middleware Tests**: Test validation and error handling middleware
- **Utility Tests**: Test error classes and utility functions

### Integration Tests

- **Route Tests**: Test API endpoints with mocked dependencies
- **Database Tests**: Test database operations with real SQLite database

## Test Configuration

The tests use the following configuration:

- **Jest**: Testing framework with TypeScript support
- **Supertest**: HTTP assertion library for API testing
- **In-memory SQLite**: For database integration tests
- **Mocked Dependencies**: AI services and external APIs are mocked

## Mock Strategy

### AI Services

- Anthropic SDK is mocked to return predictable responses
- Mock mode is enabled for AI services to avoid API calls
- Cost estimation is tested with mock pricing data

### Database

- Repository tests use mocked database operations
- Integration tests use in-memory SQLite database
- Database schema is created fresh for each test

### File System

- File operations are mocked to avoid actual file I/O
- PDF parsing is mocked to return test content

## Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Test Data

Tests use consistent test data patterns:

- **Documents**: Mock PDF documents with safety content
- **Conversations**: Sample chat conversations
- **AI Responses**: Structured mock AI responses
- **Error Cases**: Various error scenarios and edge cases

## Best Practices

1. **Isolation**: Each test is independent and doesn't affect others
2. **Mocking**: External dependencies are properly mocked
3. **Cleanup**: Test data is cleaned up after each test
4. **Assertions**: Comprehensive assertions for all test cases
5. **Error Testing**: Both success and failure scenarios are tested

## Adding New Tests

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Mock external dependencies appropriately
3. Test both success and error scenarios
4. Include edge cases and boundary conditions
5. Update this documentation if needed

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is properly initialized
2. **Mock Issues**: Check that mocks are properly configured
3. **Async Tests**: Use proper async/await patterns
4. **Cleanup**: Ensure test data is cleaned up between tests

### Debug Mode

Run tests with debug output:

```bash
DEBUG=* npm test
```

### Test Specific Files

Run tests for specific files:

```bash
npm test -- --testPathPattern=documents.test.ts
```
