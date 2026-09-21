# Course Management System

A full-stack student course management and learning progress tracking system built with Flask, SQLAlchemy, and static HTML/CSS/JavaScript frontend pages.

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

## Problem Statement
Educational systems often rely on disconnected tools for registration, content access, and progress tracking. This leads to poor visibility, duplicate work, and slower administrative processes. This project centralizes those tasks into a simple web application.

## Features
- User registration and login
- Role-based dashboard access
- Course listing and course detail pages
- Add, edit, and view courses
- Student profile and registration forms
- Learning progress tracking
- Notifications and certificate pages
- Responsive HTML/CSS frontend
- Flask backend with SQLAlchemy models
- Password hashing and secure admin setup

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript
- Backend: Python, Flask
- Database: SQLite (via Flask-SQLAlchemy)
- Authentication: Flask-JWT-Extended and password hashing
- Security: bcrypt / Werkzeug password hashing
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
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── admin-dashboard.html
│   ├── student-dashboard.html
│   ├── faculty-dashboard.html
│   ├── browse-courses.html
│   ├── course-details.html
│   ├── edit-course.html
│   ├── add-course.html
│   ├── common.css
│   ├── responsive.css
│   ├── form-validation.js
│   ├── page-app.js
│   └── course-data.json
├── tests/
│   └── test_routes.py
├── requirements.txt
├── README.md
└── coursevenv/
```

## Prerequisites
- Python 3.10+
- pip
- Git

## Setup Instructions
From the project root, run:

```bash
cd /workspaces/Course-Management-System
python3 -m pip install -r backend/requirements.txt
```

If you want to use a virtual environment:

```bash
cd /workspaces/Course-Management-System
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## Run the Application
Start the Flask server from the project root:

```bash
cd /workspaces/Course-Management-System
. .venv/bin/activate
python backend/app.py
```

Then open your browser at:

```text
http://localhost:5001/
```

If port 5001 is already in use, run the app on another port:

```bash
PORT=5002 python backend/app.py
```

Then open the matching URL, such as:

```text
http://localhost:5002/
```

The application will serve the frontend pages through Flask templates. Common pages include:
- Home: http://localhost:5001/
- Login: http://localhost:5001/login
- Register: http://localhost:5001/register
- Student Dashboard: http://localhost:5001/student/dashboard
- Admin Dashboard: http://localhost:5001/admin/dashboard
- Browse Courses: http://localhost:5001/browse-courses
- Add Faculty: http://localhost:5001/add-faculty (use after opening the admin dashboard)

## Default Admin Account
The app creates a default admin automatically when it starts.

```text
Email: courseadmin123@gmail.com
Password: courseadmin123
```

Faculty accounts are created by an administrator from the Admin Dashboard. Each faculty member receives a role-specific login and profile containing an employee ID, department, qualification, specialization, phone number, and email address.

## Testing
Run the route tests with:

```bash
cd /workspaces/Course-Management-System
python3 -m unittest tests/test_routes.py
```

This project has been verified to pass the current route tests.

## Production Configuration
Set application secrets before deploying instead of using the local development defaults:

```bash
export SECRET_KEY="replace-with-a-long-random-value"
export JWT_SECRET_KEY="replace-with-another-long-random-value"
```

The application now uses sessions and role checks. Students can access only their own profile, enrollments, progress, notifications, and certificates. Faculty accounts are created by administrators, and courses are assigned to faculty during course creation.

For production deployment, use PostgreSQL, database migrations, HTTPS, a production WSGI server such as Gunicorn, backups, centralized logs, CSRF protection for all forms, and rate limiting on authentication endpoints.

## Notes
- The app uses SQLite for local development.
- The frontend is static but is served by Flask templates.
- You can extend the system with JWT-based APIs and a full React frontend later.

## Future Improvements
- Add JWT-protected APIs for students and admin
- Add real-time notifications using Socket.IO
- Convert frontend into React components with routing
- Deploy front-end and backend to cloud hosting

## License
This project is intended for educational and academic use.

