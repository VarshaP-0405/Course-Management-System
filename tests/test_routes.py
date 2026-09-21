import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from models import db, User, Student, Faculty, Course, Enrollment
from werkzeug.security import generate_password_hash


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.drop_all()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_faculty_dashboard_route(self):
        user = User(email='faculty@example.com', password=generate_password_hash('secret123'), role=2)
        db.session.add(user)
        db.session.commit()
        db.session.add(Faculty(
            user_id=user.id,
            first_name='Maya',
            last_name='Patel',
            department='Computer Science',
            qualification='Ph.D.',
            specialization='AI',
            employee_id='FAC-001',
        ))
        db.session.commit()
        self.client.post('/login', data={
            'role': '2', 'email': 'faculty@example.com', 'password': 'secret123'
        })
        response = self.client.get('/faculty/dashboard')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Faculty Dashboard', response.get_data(as_text=True))

    def test_browse_courses_route(self):
        response = self.client.get('/browse-courses')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Available Courses', response.get_data(as_text=True))

    def test_unregistered_user_redirects_to_register(self):
        response = self.client.post(
            '/login',
            data={
                'role': '3',
                'email': 'newstudent@example.com',
                'password': 'secret123'
            },
            follow_redirects=False
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn('/register', response.headers['Location'])

    def test_admin_students_route_lists_registered_students(self):
        admin = User(email='admin@example.com', password=generate_password_hash('secret123'), role=1)
        db.session.add(admin)
        db.session.commit()
        self.client.post('/login', data={
            'role': '1', 'email': 'admin@example.com', 'password': 'secret123'
        })
        user = User(email='registeredstudent@example.com', password='hashed', role=3)
        db.session.add(user)
        db.session.commit()

        student = Student(
            user_id=user.id,
            first_name='Alice',
            last_name='Johnson',
            age=20,
            gender='Female',
            phone='1234567890',
            department='Computer Science'
        )
        db.session.add(student)
        db.session.commit()

        response = self.client.get('/students')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Alice', response.get_data(as_text=True))
        self.assertIn('registeredstudent@example.com', response.get_data(as_text=True))

    def test_admin_can_create_faculty_account(self):
        admin = User(email='admin@example.com', password=generate_password_hash('secret123'), role=1)
        db.session.add(admin)
        db.session.commit()
        self.client.post('/login', data={
            'role': '1', 'email': 'admin@example.com', 'password': 'secret123'
        })
        response = self.client.post('/add-faculty', data={
            'first_name': 'Maya', 'last_name': 'Patel',
            'email': 'maya@example.com', 'password': 'faculty123',
            'department': 'Computer Science', 'qualification': 'Ph.D.',
            'specialization': 'Artificial Intelligence', 'employee_id': 'FAC-001',
        })
        self.assertEqual(response.status_code, 302)
        self.assertIsNotNone(User.query.filter_by(email='maya@example.com', role=2).first())
        self.assertIsNotNone(Faculty.query.filter_by(employee_id='FAC-001').first())

    def test_student_enrollment_belongs_to_logged_in_student(self):
        user = User(email='student@example.com', password=generate_password_hash('secret123'), role=3)
        db.session.add(user)
        db.session.commit()
        student = Student(user_id=user.id, first_name='Alice', last_name='Johnson')
        course = Course(cname='Python Basics', instructor='Maya Patel', course_code='CS101')
        db.session.add_all([student, course])
        db.session.commit()
        self.client.post('/login', data={
            'role': '3', 'email': 'student@example.com', 'password': 'secret123'
        })
        response = self.client.get(f'/enroll/{course.Cid}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Enrollment.query.filter_by(student_id=student.Sid, course_id=course.Cid).count(), 1)


if __name__ == '__main__':
    unittest.main()
