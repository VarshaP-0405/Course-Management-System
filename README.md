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
- Notifications and certificate pages
- Responsive React-based frontend with routing
- Context-managed authentication, course, enrollment, and student state
- JSON Server collections for local API-backed data

## Tech Stack
- Frontend: React, Vite, React Router
- Backend: Node.js and Express (`backend/src`)
- Local data store: JSON file (`mockapi/db.json`)
- State: React Context API
- Authentication: local demo login backed by mock user records
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

## React Routing Setup
The React frontend uses React Router for navigation between pages.

The React app reads users, students, courses, enrollments, modules, and progress from JSON Server. Context stores the signed-in user and fetched collections so dashboard data updates when mock records change.

1. User opens the login page
2. User enters email, password, and role
3. The app checks the mock user collection for matching credentials and role
4. The session is stored centrally and persisted in local storage
5. React redirects the user to their dashboard:
   - Admin -> /admin/dashboard
   - Faculty -> /faculty/dashboard
   - Student -> /student/dashboard

Example route structure:

```jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={[3]}><StudentDashboardPage /></ProtectedRoute>} />
    <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={[2]}><FacultyDashboardPage /></ProtectedRoute>} />
    <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={[1]}><AdminDashboardPage /></ProtectedRoute>} />
  </Routes>
</BrowserRouter>
```

This means the user does not reload the page and each role is redirected automatically to the correct dashboard after login.

## Prerequisites
- Node.js 18+
- npm

## Setup Instructions
Install the backend dependencies:

```bash
cd /workspaces/Course-Management-System/backend
npm install
```

Install React dependencies:

```bash
cd /workspaces/Course-Management-System/frontend-react
npm install
```

## Run the Application
First install dependencies once by following Setup Instructions. Then open two terminals. Run the backend in terminal 1:

```bash
cd /workspaces/Course-Management-System/backend
npm start
```

Run the React app in terminal 2:

```bash
cd /workspaces/Course-Management-System/frontend-react
npm run dev
```

Open the frontend URL printed by Vite, normally:

```text
http://localhost:5173
```

If port 5173 is already in use, Vite will choose another port and print that URL in terminal 2.

The backend API is served at:

```text
http://localhost:3002
```

Health endpoints are available at `GET /` and `GET /api/health`. The backend exposes the app's collection routes and `POST /api/auth/login`.

## Demo Accounts
All seeded accounts use the local mock password `demo123`.

```text
Student: varsha@gmail.com
Faculty: thangam@gmail.com
Admin: courseadmin123@gmail.com
```

## Login Flow by Role
This is the same flow as the older version of the application:

- Student logs in -> redirected to /student/dashboard
- Faculty logs in -> redirected to /faculty/dashboard
- Admin logs in -> redirected to /admin/dashboard

The React app uses a protected route check to stop users from visiting a dashboard that does not match their assigned role.

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
Run the frontend lint and build checks from `frontend-react`:

```bash
cd /workspaces/Course-Management-System/frontend-react
npm run lint
npm run build
```

## Notes
- Express exposes collection endpoints such as `/courses`, `/students`, and `/enrollments`.
- `db.json` is writable mock storage, not suitable for production or real credentials.
- The app uses a client-side React SPA with navigation handled by React Router.

## Future Improvements
- Replace the mock API and demo authentication with a production backend before deployment.

## License
This project is intended for educational and academic use.

