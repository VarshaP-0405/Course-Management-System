# Course Management Backend

The Express service provides the API used by the React app and persists collection records in `mockapi/db.json`.

## Start

```bash
cd /workspaces/Course-Management-System/backend
npm install
npm start
```

The service listens on `http://localhost:3002` by default. Copy `.env.example` to `.env` to customize `PORT`, `HOST`, `CORS_ORIGIN`, or `DATA_FILE`.

## Routes

- `GET /` reports that the server is running.
- `GET /api/health` reports API health.
- `POST /api/auth/login` validates the email, password, and role for local demo accounts.
- Collection routes support `GET`, `POST`, `GET /:id`, `PATCH`, `PUT`, and `DELETE` for the collections in the JSON data file.

## Structure

- `src/config`: environment configuration
- `src/controllers`: request handling
- `src/middleware`: CORS/error boundary integration
- `src/routes`: route definitions
- `src/services`: JSON persistence and business data access
- `src/app.js`: Express middleware and route composition
- `src/server.js`: HTTP server entry point

This is an educational local backend. It uses a writable JSON file and demo passwords; it is not suitable for production deployment.
