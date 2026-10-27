# CourseHub React App

The frontend uses React Context for authentication, student/course data, and enrollments. Every page reads and writes records through the Express `/api` endpoints, which persist the local dataset in `mockapi/db.json`. Login stores the short-lived JWT with the client session, authenticated requests send it as a bearer token, and logout removes it. On page load, the app verifies an existing token with `/api/auth/me`.

Start the backend in one terminal:

```bash
cd /workspaces/Course-Management-System/backend
npm install
npm start
```

Start the frontend in another terminal:

```bash
cd frontend-react
npm install
npm run dev
```

The frontend is at `http://localhost:5173`; Express listens at `http://localhost:3002` and is reached through Vite's same-origin `/mock-api` proxy. The frontend maps its requests to `/mock-api/api/...`. Set `VITE_API_BASE` to override the API URL.

Before starting the backend, set `JWT_SECRET` in `backend/.env` to a generated secret. See [backend/README.md](../backend/README.md) for setup and protected endpoint roles.

Seeded demo users all use password `demo123`. See [mockapi/README.md](../mockapi/README.md) for account emails and limitations.
