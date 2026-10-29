# CourseHub React App

The frontend uses React Context for authentication, student/course data, and enrollments. Pages read and write records through the Express API, which defaults to `mockapi/db.json`. Login stores the short-lived JWT with the client session, authenticated HTTP and Socket.IO connections use that token, and logout removes it. On page load, the app verifies an existing token with `/api/auth/me`.

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

The frontend is at `http://localhost:5173`; Express listens at `http://localhost:3002` and is reached through Vite's same-origin `/mock-api` and `/socket.io` proxies. Copy `.env.example` to `.env` when configuring a direct API origin. `VITE_API_URL` can be a backend origin or an `/api/v1` API base; `VITE_SOCKET_URL` is the backend origin.

Before starting the backend, set `JWT_SECRET` in `backend/.env` to a generated secret. See [backend/README.md](../backend/README.md) for setup and protected endpoint roles.

Seeded demo users all use password `demo123`. See [mockapi/README.md](../mockapi/README.md) for account emails and limitations.

Faculty can publish course modules with YouTube or direct video links, review enrolled students' progress, and see updates refresh automatically every 10 seconds. Students can watch lesson videos, mark lessons complete, and download a PNG certificate after completing every module in a course.

Students can also unenroll from active courses on My Courses. Unenrolling preserves their lesson history and progress; completed courses remain in their records and cannot be unenrolled.

All authenticated roles can open Messages, enter another account's user ID, and load or exchange a private conversation. Student recipients receive persisted notifications in real time; each student can mark only their own notification as read.
