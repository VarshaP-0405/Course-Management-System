from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Student(db.Model):
    __tablename__ = "students"
    Sid = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )
    first_name = db.Column(db.String(30), nullable=False)
    last_name = db.Column(db.String(30), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    address = db.Column(db.String(150))
    phone = db.Column(db.String(15))
    dob = db.Column(db.String(20))
    department = db.Column(db.String(100))
    blacklisted = db.Column(db.String(2), default="N")

class Course(db.Model):
    __tablename__ = "courses"
    Cid = db.Column(db.Integer, primary_key=True)
    cname = db.Column(db.String(100), nullable=False)
    instructor = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.String(50))
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    credits = db.Column(db.Integer)

class Module(db.Model):
    __tablename__ = "modules"
    Mid = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(
        db.Integer,
        db.ForeignKey('courses.Cid'),
        nullable=False
    )
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    module_number = db.Column(db.Integer)
    video_link = db.Column(db.String(300))
    notes = db.Column(db.String(300))

class Enrollment(db.Model):
    __tablename__ = "enrollments"
    Eid = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey('students.Sid'),
        nullable=False
    )
    course_id = db.Column(
        db.Integer,
        db.ForeignKey('courses.Cid'),
        nullable=False
    )
    enrollment_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    status = db.Column(
        db.String(20),
        default="Enrolled"
    )

class Progress(db.Model):
    __tablename__ = "progress"
    Pid = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey('students.Sid'),
        nullable=False
    )
    course_id = db.Column(
        db.Integer,
        db.ForeignKey('courses.Cid'),
        nullable=False
    )
    completed_modules = db.Column(
        db.Integer,
        default=0
    )
    total_modules = db.Column(
        db.Integer,
        default=0
    )
    progress_percentage = db.Column(
        db.Float,
        default=0
    )
    last_updated = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

class Notification(db.Model):
    __tablename__ = "notifications"
    Nid = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey('students.Sid'),
        nullable=False
    )
    title = db.Column(db.String(100))
    message = db.Column(db.Text)
    is_read = db.Column(
        db.Boolean,
        default=False
    )
    
class Review(db.Model):
    __tablename__ = "reviews"
    Rid = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey('students.Sid'),
        nullable=False
    )
    course_id = db.Column(
        db.Integer,
        db.ForeignKey('courses.Cid'),
        nullable=False
    )
    rating = db.Column(db.Integer)
    review = db.Column(db.Text)
    