import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from models import db, User, Student, Faculty, Course, CourseFaculty, Enrollment, Module
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

    def test_api_courses_endpoint_returns_json(self):
        course = Course(cname='React Basics', instructor='Maya Patel', course_code='RE101', duration='4 Weeks', description='Intro to React', category='Frontend', credits=3)
        db.session.add(course)
        db.session.commit()

        response = self.client.get('/api/courses')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsInstance(payload, list)
        self.assertGreater(len(payload), 0)
        self.assertEqual(payload[0]['course_name'], 'React Basics')

    def test_api_enroll_adds_course_to_logged_in_student(self):
        user = User(email='student@example.com', password=generate_password_hash('secret123'), role=3)
        db.session.add(user)
        db.session.commit()
        student = Student(user_id=user.id, first_name='Alice', last_name='Johnson')
        course = Course(cname='React Basics', instructor='Maya Patel', course_code='RE101')
        db.session.add_all([student, course])
        db.session.commit()

        self.client.post('/api/login', json={'email': 'student@example.com', 'password': 'secret123', 'role': '3'})
        response = self.client.post(f'/api/enroll/{course.Cid}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Enrollment.query.filter_by(student_id=student.Sid, course_id=course.Cid).count(), 1)

        duplicate = self.client.post(f'/api/enroll/{course.Cid}')
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(Enrollment.query.filter_by(student_id=student.Sid, course_id=course.Cid).count(), 1)

    def test_api_course_content_returns_notes_and_videos(self):
        user = User(email='student@example.com', password=generate_password_hash('secret123'), role=3)
        db.session.add(user)
        db.session.commit()
        db.session.add(Student(user_id=user.id, first_name='Alice', last_name='Johnson'))
        course = Course(cname='Python Basics', instructor='Maya Patel', course_code='CS101')
        db.session.add(course)
        db.session.commit()
        db.session.add(Module(course_id=course.Cid, title='Introduction', notes='Read the introduction.', video_link='https://example.com/video'))
        db.session.commit()

        self.client.post('/api/login', json={'email': 'student@example.com', 'password': 'secret123', 'role': '3'})
        response = self.client.get(f'/api/courses/{course.Cid}/content')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['course']['course_name'], 'Python Basics')
        self.assertGreaterEqual(len(payload['modules']), 1)
        self.assertIn('notes', payload['modules'][0])
        self.assertIn('video_link', payload['modules'][0])

    def test_api_student_dashboard_and_profile_return_data(self):
        user = User(email='student@example.com', password=generate_password_hash('secret123'), role=3)
        db.session.add(user)
        db.session.commit()
        student = Student(user_id=user.id, first_name='Alice', last_name='Johnson', department='Computer Science')
        course = Course(cname='Python Basics', instructor='Maya Patel', course_code='CS101', duration='4 Weeks', description='Intro', category='Programming', credits=3)
        db.session.add_all([student, course])
        db.session.commit()
        db.session.add(Enrollment(student_id=student.Sid, course_id=course.Cid, status='Enrolled'))
        db.session.commit()

        self.client.post('/api/login', json={'email': 'student@example.com', 'password': 'secret123', 'role': '3'})

        dashboard = self.client.get('/api/student/dashboard')
        self.assertEqual(dashboard.status_code, 200)
        dashboard_data = dashboard.get_json()
        self.assertGreaterEqual(dashboard_data['enrolled_count'], 1)

        profile = self.client.get('/api/profile')
        self.assertEqual(profile.status_code, 200)
        profile_data = profile.get_json()
        self.assertEqual(profile_data['email'], 'student@example.com')

    def test_api_faculty_dashboard_returns_faculty_data(self):
        user = User(email='faculty@example.com', password=generate_password_hash('secret123'), role=2)
        db.session.add(user)
        db.session.commit()
        faculty = Faculty(
            user_id=user.id,
            first_name='Maya',
            last_name='Patel',
            department='Computer Science',
            qualification='Ph.D.',
            specialization='AI',
            employee_id='FAC-001',
        )
        course = Course(cname='Python Basics', instructor='Maya Patel', course_code='CS101')
        db.session.add_all([faculty, course])
        db.session.commit()
        db.session.add(CourseFaculty(course_id=course.Cid, faculty_id=faculty.Fid))
        db.session.commit()

        self.client.post('/api/login', json={'email': 'faculty@example.com', 'password': 'secret123', 'role': '2'})
        response = self.client.get('/api/faculty/dashboard')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['faculty']['name'], 'Maya Patel')
        self.assertEqual(payload['course_count'], 1)
        self.assertEqual(payload['assigned_courses'][0]['course_name'], 'Python Basics')

    def test_api_admin_summary_returns_metrics(self):
        admin = User(email='admin@example.com', password=generate_password_hash('secret123'), role=1)
        student = User(email='registeredstudent@example.com', password=generate_password_hash('secret123'), role=3)
        faculty = User(email='faculty@example.com', password=generate_password_hash('secret123'), role=2)
        db.session.add_all([admin, student, faculty])
        db.session.commit()
        db.session.add(Student(user_id=student.id, first_name='Alice', last_name='Smith', department='Computer Science'))
        db.session.add(Faculty(user_id=faculty.id, first_name='Maya', last_name='Patel', department='CS', qualification='PhD', specialization='AI', employee_id='FAC-999'))
        db.session.add(Course(cname='React Basics', instructor='Maya Patel', course_code='RE101', duration='4 Weeks', description='Intro to React', category='Frontend', credits=3))
        db.session.commit()

        self.client.post('/api/login', json={'email': 'admin@example.com', 'password': 'secret123', 'role': '1'})
        response = self.client.get('/api/admin/summary')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertGreaterEqual(payload['total_students'], 1)
        self.assertGreaterEqual(payload['total_faculty'], 1)
        self.assertGreaterEqual(payload['total_courses'], 1)

    def test_admin_can_manage_people_and_faculty_can_publish_module(self):
        admin = User(email='admin@example.com', password=generate_password_hash('secret123'), role=1)
        faculty_user = User(email='faculty@example.com', password=generate_password_hash('secret123'), role=2)
        student_user = User(email='student@example.com', password=generate_password_hash('secret123'), role=3)
        db.session.add_all([admin, faculty_user, student_user])
        db.session.commit()
        faculty = Faculty(user_id=faculty_user.id, first_name='Maya', last_name='Patel', department='CS', qualification='PhD', specialization='AI', employee_id='FAC-001')
        student = Student(user_id=student_user.id, first_name='Alice', last_name='Smith')
        course = Course(cname='React Basics', instructor='Maya Patel', course_code='RE101')
        db.session.add_all([faculty, student, course])
        db.session.commit()
        db.session.add(CourseFaculty(course_id=course.Cid, faculty_id=faculty.Fid))
        db.session.commit()

        self.client.post('/api/login', json={'email': 'admin@example.com', 'password': 'secret123', 'role': '1'})
        blacklist = self.client.post(f'/api/admin/students/{student.Sid}/blacklist', json={'blacklisted': True})
        self.assertEqual(blacklist.status_code, 200)
        self.client.get('/logout')
        blocked = self.client.post('/api/login', json={'email': 'student@example.com', 'password': 'secret123', 'role': '3'})
        self.assertEqual(blocked.status_code, 403)

        self.client.post('/api/login', json={'email': 'faculty@example.com', 'password': 'secret123', 'role': '2'})
        module = self.client.post(f'/api/faculty/courses/{course.Cid}/modules', json={
            'title': 'Hooks', 'description': 'React hooks', 'notes': 'Review useState.', 'video_link': 'https://example.com/video'
        })
        self.assertEqual(module.status_code, 201)
        self.assertEqual(Module.query.filter_by(course_id=course.Cid).count(), 1)

    def test_protected_api_returns_json_when_not_logged_in(self):
        response = self.client.post('/api/admin/faculty', json={})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()['message'], 'Please log in to continue.')


if __name__ == '__main__':
    unittest.main()
