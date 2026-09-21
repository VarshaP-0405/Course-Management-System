# Course Management System

A full-stack student course management and learning progress tracking system built with Flask, SQLAlchemy, and a React frontend using client-side routing.

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
- Flask REST API and database models
- Password hashing and secure admin setup

## Tech Stack
- Frontend: React, Vite, React Router
- Backend: Python, Flask
- Database: SQLite (via Flask-SQLAlchemy)
- Authentication: Flask session-based auth + password hashing
- Security: Werkzeug password hashing
- Version control: Git and GitHub

## Project Structure

```text
Course-Management-System/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── routes.py
│   ├── requirements.txt
│   └── __init__.py
├── frontend-react/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── tests/
│   └── test_routes.py
├── requirements.txt
├── README.md
├── coursevenv/
└── frontend/
    └── legacy static pages
```

## React Routing Setup
The React frontend uses React Router for navigation between pages.

The actual flow matches the original CMS behavior:

1. User opens the login page
2. User enters email, password, and role
3. The app posts to the backend login API
4. The backend verifies the credentials and role
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
- Python 3.10+
- Node.js 18+
- npm
- Git

## Setup Instructions
From the project root, install backend dependencies:

```bash
cd /workspaces/Course-Management-System
python3 -m pip install -r backend/requirements.txt
```

Install React frontend dependencies:

```bash
cd /workspaces/Course-Management-System/frontend-react
npm install
```

## Run the Application
Start the Flask backend:

```bash
cd /workspaces/Course-Management-System
python3 backend/app.py
```

Start the React frontend in a second terminal:

```bash
cd /workspaces/Course-Management-System/frontend-react
npm run dev
```

Open the frontend in the browser:

```text
http://localhost:5173
```

The backend API is served at:

```text
http://localhost:5001
```

## Default Admin Account
The app creates a default admin automatically when it starts.

```text
Email: courseadmin123@gmail.com
Password: courseadmin123
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

## Testing
Run the backend route tests with:

```bash
cd /workspaces/Course-Management-System
python3 -m unittest tests/test_routes.py
```

Run the frontend lint and build checks with:

```bash
cd /workspaces/Course-Management-System/frontend-react
npm run lint
npm run build
```

## Production Configuration
Set application secrets before deploying instead of using local development defaults:

```bash
export SECRET_KEY="replace-with-a-long-random-value"
export JWT_SECRET_KEY="replace-with-another-long-random-value"
```

## Notes
- The React app calls the Flask backend through API routes, such as /api/courses and /api/login.
- The frontend is no longer a static HTML-only app; it is a client-side React SPA with navigation handled by React Router.
- SQLite is used for local development.

## Future Improvements
- Add more protected API endpoints for faculty and course management
- Connect the remaining forms to live backend submission endpoints
- Add JWT-based authentication
- Deploy frontend and backend separately to production

## License
This project is intended for educational and academic use.

