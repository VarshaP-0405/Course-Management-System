# Course Management Backend

The Express service provides the API used by every React page, with a writable JSON file for local development and an optional MongoDB provider for hosted environments.

## Start

```bash
cd /workspaces/Course-Management-System/backend
npm install
```

Create the local environment file and generate a signing secret:

```bash
cp .env.example .env
openssl rand -base64 32
```

Paste the generated output after `JWT_SECRET=` in `.env`, save the file, then start the backend:

```bash
npm start
```

The service listens on `http://localhost:3002` by default. The backend refuses to start without a sufficiently long secret. `.env` is local-only and ignored by Git. `DATABASE_PROVIDER=file` is the default; set `DATABASE_PROVIDER=mongodb` and `MONGO_URI` to use MongoDB. `JWT_EXPIRES_IN` defaults to `1h`; `PORT`, `HOST`, `CORS_ORIGIN`, and `DATA_FILE` can also be customized.

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for collection fields, constraints, relationships, and the ER diagram.

## Routes

- `GET /` reports that the server is running.
- `GET /api/health` reports API health.
- `POST /api/auth/register` creates a student login and profile in one request. Required fields: a valid `email`, a `password` of 12-72 characters (at most 72 UTF-8 bytes), `first_name`, and `last_name`; `phone` and `department` are optional. Registration hashes passwords with bcrypt before storing them.
- `POST /api/auth/login` validates `email` and `password`, with optional `role` (`1` admin, `2` faculty, `3` student), and returns a signed JWT in `token` with `tokenType` and `expiresIn` metadata.
- `GET /api/auth/me` verifies the bearer token and returns the signed-in account.
- `GET /api/messages/:userId` (also `/api/v1/messages/:userId`) returns at most 100 messages between the signed-in user and the selected account. A user can only retrieve their own conversation.
- Authenticated Socket.IO clients connect at `/socket.io` with their JWT in handshake `auth.token`. Emit `send_message` with `recipientId` and `text`; successful messages are persisted and delivered to the participants' private rooms. Student recipients receive a persisted notification and `new_notification` event. Messages are limited to 2,000 characters and 10 per minute per user per backend process.
- `GET /api/notifications` returns the signed-in student's own most recent notifications; `PATCH /api/notifications/:id/read` marks one of that student's notifications as read. Admins and faculty can view the 50 newest notifications.
- `POST /api/learning/courses/:courseId/modules/:moduleId/complete` records an enrolled student's lesson completion, updates course progress, and marks the enrollment complete when all published modules are done. Repeating a completion is safe.
- Lesson completion is stored in `module_completions`; progress is recalculated from completed lessons and the current published module count.
- `GET /api/v1/enrollments/my-courses` returns the signed-in student's current and completed enrollments, including their course details. `DELETE /api/v1/enrollments/:courseId` marks an active enrollment as `Unenrolled` without deleting learning history; completed courses cannot be unenrolled. Re-enrolling restores the existing enrollment and keeps saved progress.
- Send `Authorization: Bearer <token>` on authenticated requests. Tokens are signed with HS256, expire after one hour by default, and invalid, missing, or expired tokens receive `401 Unauthorized`.
- Student endpoints: `GET/POST /api/students`, `GET/PUT/PATCH/DELETE /api/students/:id`.
- Course endpoints: `GET/POST /api/courses`, `GET/PUT/PATCH/DELETE /api/courses/:id`.
- The same collection operations are available for `users`, `faculty`, `course_faculty`, `modules`, `enrollments`, `progress`, `notifications`, `messages`, and `reviews`, supporting the dashboards and admin tools. Conversation history remains participant-scoped through the dedicated endpoint.
- Course and module reads are public for course discovery. Other collection requests require authentication. Admins can manage collections; faculty can manage modules; only students can create enrollments or unenroll, and they can do so only for their own profile and courses. Students can only read their own student-related records.
- Collection routes return JSON, use `201` for creates, `200` for reads/updates, `204` for deletes, and JSON errors with appropriate `4xx` status codes. Password fields are never included in user API responses.
- Collection validation enforces required fields and types, password length limits, unique keys, and foreign-key references. Passwords created or changed through user CRUD are also bcrypt-hashed. Deletion of referenced records returns `409 Conflict`.
- Add `page` and optional `limit` to collection reads for paginated data: `GET /api/courses?page=1&limit=20` returns `{ records, pagination }`. The page is validated, the limit defaults to 20 and is capped at 100, and existing unpaginated requests retain their array response.
- CORS and Socket.IO accept only the comma-separated origins in `CORS_ORIGIN`; Helmet security headers, login rate limiting, and query-safe request logging are enabled. Login is limited to 10 attempts per 15 minutes per process.
- Legacy collection paths such as `/courses` remain available for compatibility.
- Versioned aliases under `/api/v1` are also available for auth and collection endpoints.

All collection create/update requests must be JSON objects. Creates validate required fields and field types; `PUT` replaces a record, while `PATCH` updates only the supplied fields.

## Test

```bash
npm test
```

The API tests use a temporary copy of the JSON data file and do not alter the demo data. They cover authentication, ownership, CRUD, Socket.IO delivery, persistence, notification read status, and login rate limits.

## Postman

Set a Postman environment variable named `baseUrl` to `http://localhost:3002`. Send JSON bodies with `Content-Type: application/json`. Register a student and log in:

```http
POST {{baseUrl}}/api/auth/register
{
  "email": "student@example.test",
  "password": "demo1234Strong",
  "first_name": "Example",
  "last_name": "Student",
  "phone": "555-0100",
  "department": "Science"
}
```

Then send `POST {{baseUrl}}/api/auth/login` with that email and password. Save the returned `token` as a Postman environment variable and configure subsequent protected requests with `Authorization: Bearer {{token}}`. Verify `GET {{baseUrl}}/api/auth/me`, student-owned data, and the course CRUD paths above. Also try `GET {{baseUrl}}/api/students` without a token to confirm it returns `401`.

The frontend logout action removes the stored token and session. JWTs are stateless and remain valid until expiry, so use a short expiry and protect the signing secret. Demo accounts still use the documented `demo123` password, but the JSON seed stores its bcrypt hash. `scripts/seedMongo.js` hashes plaintext seed passwords before importing them.

## Structure

- `src/config`: environment configuration
- `src/controllers`: request handling
- `src/middleware`: authentication, rate limiting, and error boundary integration
- `src/routes`: route definitions
- `src/services`: JSON persistence and business data access
- `src/app.js`: Express middleware and route composition
- `src/server.js`: HTTP server entry point

## Deployment configuration

The backend is ready to run behind a hosting platform that supplies `PORT`. Configure `NODE_ENV=production`, a randomly generated `JWT_SECRET`, `DATABASE_PROVIDER=mongodb`, `MONGO_URI`, and `CORS_ORIGIN` as the deployed frontend origin. The production app trusts one reverse-proxy hop for correct client IP handling. Keep database network access restricted to the hosting environment where possible. Do not put database credentials or JWT secrets in frontend variables.

The Render Blueprint is in `render.yaml`; provide its `MONGO_URI` and frontend `CORS_ORIGIN` values when creating the service. The Vercel SPA fallback is in `frontend-react/vercel.json`. Set `VITE_API_URL` to the backend origin (or its `/api/v1` prefix) and `VITE_SOCKET_URL` to the backend origin before building the frontend. The application has not been deployed to hosting services; production URLs and credentials must be supplied by the repository owner.

The file provider and included demo accounts are for local education and testing, not production storage or account provisioning.
