# Course Management System

A course management and learning progress application built with React, Context API, and a modular Express backend backed by a writable JSON data file. No SQL database is required.

## Project Overview
This project helps universities and training institutions manage student accounts, course information, enrollments, progress tracking, and admin operations from a single platform.

Students can:
- register and log in
- browse available courses
- view course details
- enroll in courses
- track progress and completed modules
- view notifications and certificates

Admins can:
- manage courses
- create faculty accounts with professional details
- review student information
- monitor dashboard data
- add and update course records

## Features
- User registration and login
- Role-based dashboard access
- Course listing and course detail pages
- Add, edit, and view courses
- Student profile and registration forms
- Learning progress tracking
- Lesson video playback and completion-based course progress
- Faculty course workspaces with student progress monitoring
- Downloadable PNG certificates after course completion
- Notifications and certificate pages
- Responsive React-based frontend with routing
- Context-managed authentication, course, enrollment, and student state
- JSON-backed collections served through the Express API
- Documented collection schema, relationships, and integrity constraints

## Tech Stack
- Frontend: React, Vite, React Router
- Backend: Node.js and Express (`backend/src`)
- Local data store: JSON file (`mockapi/db.json`)
- State: React Context API
- Authentication: Express API with JWT sessions
- Version control: Git and GitHub

## Project Structure

```text
Course-Management-System/
├── mockapi/
│   ├── db.json
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── frontend-react/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── README.md
└── frontend/
    └── legacy static pages
```

## Run Locally

### Prerequisites

- Node.js 20.19 or later, or 22.12 or later, and npm
- OpenSSL to generate a local JWT secret (or another secure random secret generator)

No separate SQL or MongoDB server is needed. The backend stores application data in `mockapi/db.json`.

### 1. Install backend dependencies

From the repository root:

```bash
cd backend
npm install
```

### 2. Configure the backend

While in `backend/`, create your local environment file:

```bash
cp .env.example .env
```

Generate a signing secret:

```bash
openssl rand -base64 32
```

Open `backend/.env`, paste the generated value after `JWT_SECRET=`, and save the file. The backend will not start without a secret of at least 32 bytes. Keep `.env` private; it is ignored by Git. The other example values use port `3002`, allow the local Vite origin, and point to the checked-in demo data file.

### 3. Start and check the backend

In terminal 1, from the `backend/` directory:

```bash
npm start
```

Leave this terminal running. In a browser, visit <http://localhost:3002/api/health>. A healthy response confirms the API is ready. The root endpoint <http://localhost:3002/> is also available.

For automatic server restarts while developing, use `npm run dev` instead of `npm start`.

### 4. Install frontend dependencies

Open terminal 2 at the repository root:

```bash
cd frontend-react
npm install
```

You only need to install dependencies again when the package files change.

### 5. Start the frontend

In terminal 2, from `frontend-react/`:

```bash
npm run dev
```

Open the local URL printed by Vite, normally <http://localhost:5173>. Keep both terminals running while using the app. Vite proxies API requests to the backend on port `3002`.

### 6. Sign in

Seeded demo accounts all use the password `demo123`:

| Role | Email |
|---|---|
| Student | `varsha@gmail.com` |
| Faculty | `thangam@gmail.com` |
| Admin | `courseadmin123@gmail.com` |

You can also register a student from the app. The admin and faculty accounts above are pre-seeded demo accounts.

### Stop or troubleshoot

- Stop either server with **Ctrl+C** in its terminal.
- If the backend reports that `JWT_SECRET` is missing or too short, check that `backend/.env` exists and contains the generated secret.
- If the frontend cannot load data, make sure the backend is still running and that <http://localhost:3002/api/health> responds.
- If port `3002` is already in use, stop the other process or change `PORT` in `backend/.env`. Keep the frontend proxy configuration in sync if you change the backend port.
- If port `5173` is busy, Vite prints a different frontend URL; open the URL it reports.

For backend environment settings, API endpoints, authorization, and data constraints, see [backend/README.md](backend/README.md). For the local collections and their relationships, see [backend/DATABASE_SCHEMA.md](backend/DATABASE_SCHEMA.md).

## API Overview

The backend is served at `http://localhost:3002`. Health endpoints are `GET /` and `GET /api/health`. Authentication endpoints include `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/auth/me`. Login returns a JWT used for protected endpoints; student records are scoped to the signed-in student and collection writes are role-restricted. Course and module reads remain public for course discovery. Collection CRUD endpoints are available for the collections used by the React pages. See [backend/README.md](backend/README.md) for endpoint details, request fields, permissions, and API tests.

## Available Routes in React
- Home: /
- Login: /login
- Register: /register
- Browse Courses: /browse-courses
- Student Dashboard: /student/dashboard
- Faculty Dashboard: /faculty/dashboard
- Admin Dashboard: /admin/dashboard
- Reports: /reports
- Profile: /profile
- Notifications: /notifications
- Progress: /progress
- Certificate: /certificate
- Faculty Courses: /faculty/courses
- Faculty Course Workspace: /faculty/courses/:id
- Faculty Profile: /faculty/profile

## Testing
From the repository root, run the API test suite:

```bash
cd backend
npm test
```

Run the frontend lint and production build checks:

```bash
cd frontend-react
npm run lint
npm run build
```

## Notes
- Express exposes collection endpoints such as `/api/courses`, `/api/students`, and `/api/enrollments`, along with legacy and versioned aliases.
- `db.json` is writable mock storage, not suitable for production or real credentials.
- The app uses a client-side React SPA with navigation handled by React Router.

## Future Improvements
- Replace local JSON-file storage and seeded demo accounts with production-grade storage and account provisioning before deployment.

## License
This project is intended for educational and academic use.
