# Mobile Attribution Backend

A production-ready Node.js/Express.js backend service for mobile app attribution tracking.

## Features

- Express.js REST API framework
- Environment-based configuration (.env)
- JSON-only responses
- Global error handling
- CORS support
- Security headers (Helmet)
- Health check endpoints
- Attribution event tracking
- Statistics and analytics
- Graceful shutdown handling

## Project Structure

```
mobile-attribution-backend/
├── config/              # Configuration files
├── controllers/         # Business logic controllers
├── middleware/          # Express middleware
│   ├── errorHandler.js # Global error handling
│   └── validation.js   # Request validation
├── routes/             # API route definitions
│   ├── health.js       # Health check routes
│   └── attribution.js  # Attribution endpoints
├── utils/              # Utility functions
├── .env                # Environment variables
├── .env.example        # Example environment variables
├── app.js              # Express app configuration
├── server.js           # Server entry point
└── package.json        # Dependencies and scripts
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (optional for development)

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### Health Check
- `GET /api/v1/health` - General health status
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/live` - Liveness check

### Attribution Tracking
- `POST /api/v1/attribution/track` - Track a new attribution event
- `GET /api/v1/attribution/events` - Get all events (paginated)
- `GET /api/v1/attribution/events/:id` - Get event by ID
- `PUT /api/v1/attribution/events/:id` - Update an event
- `DELETE /api/v1/attribution/events/:id` - Delete an event
- `GET /api/v1/attribution/stats` - Get attribution statistics

## Example Requests

### Track Attribution Event
```bash
curl -X POST http://localhost:3000/api/v1/attribution/track \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device_123",
    "appName": "MyApp",
    "source": "google_ads",
    "campaign": "summer_2024",
    "userId": "user_456"
  }'
```

### Get Statistics
```bash
curl "http://localhost:3000/api/v1/attribution/stats?appName=MyApp&source=google_ads"
```

### Get Events with Pagination
```bash
curl "http://localhost:3000/api/v1/attribution/events?limit=20&offset=0"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Node environment |
| `PORT` | 3000 | Server port |
| `HOST` | localhost | Server host |
| `API_PREFIX` | /api/v1 | API URL prefix |
| `LOG_LEVEL` | info | Logging level |
| `CORS_ORIGIN` | * | CORS allowed origins |

## Error Handling

All errors are returned in JSON format with the following structure:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "path": "/api/v1/attribution/track",
  "method": "POST",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

Stack traces are only included in development mode.

## Production Considerations

Before deploying to production:

1. **Database Integration**: Replace in-memory storage with a real database (PostgreSQL, MongoDB, etc.)
2. **Authentication**: Add JWT or OAuth authentication
3. **Rate Limiting**: Implement rate limiting middleware
4. **Logging**: Use a production logging service (Winston, Bunyan, etc.)
5. **Monitoring**: Set up application monitoring (New Relic, DataDog, etc.)
6. **Security**: 
   - Use environment variables for sensitive data
   - Implement input validation and sanitization
   - Use HTTPS/TLS
   - Set appropriate CORS policies
   - Implement API key authentication
7. **Testing**: Add comprehensive unit and integration tests
8. **Documentation**: Generate API documentation (Swagger/OpenAPI)

## Dependencies

- **express**: Web framework
- **dotenv**: Environment variable management
- **cors**: Cross-Origin Resource Sharing middleware
- **helmet**: Security headers middleware
- **nodemon**: Development auto-reload (dev only)

## License

MIT

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.
