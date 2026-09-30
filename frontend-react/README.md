# CourseHub React App

The frontend uses React Context for authentication, student/course data, and enrollments. It reads and writes records through the Express backend, which persists the local dataset in `mockapi/db.json`.

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

The frontend is at `http://localhost:5173`; Express listens at `http://localhost:3002` and is reached through Vite's same-origin `/mock-api` proxy. Set `VITE_API_BASE` to override the API URL.

Seeded demo users all use password `demo123`. See [mockapi/README.md](../mockapi/README.md) for account emails and limitations.
