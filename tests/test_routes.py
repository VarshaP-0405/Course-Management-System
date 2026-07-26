import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_faculty_dashboard_route(self):
        response = self.client.get('/faculty/dashboard')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Faculty Dashboard', response.get_data(as_text=True))

    def test_browse_courses_route(self):
        response = self.client.get('/browse-courses')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Available Courses', response.get_data(as_text=True))


if __name__ == '__main__':
    unittest.main()
