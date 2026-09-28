import json
import os
import tempfile
import threading
from datetime import date, datetime

from flask import current_app, has_app_context
from sqlalchemy import event
from sqlalchemy.orm import Session

from models import (
    Course,
    CourseFaculty,
    Enrollment,
    Faculty,
    Module,
    Notification,
    Progress,
    Review,
    Student,
    User,
    db,
)


_write_lock = threading.Lock()


def _serialize_datetime(value):
    return value.isoformat() if isinstance(value, (date, datetime)) else value


def _serialize_records(session):
    users = session.query(User).order_by(User.id).all()
    students = session.query(Student).order_by(Student.Sid).all()
    faculty = session.query(Faculty).order_by(Faculty.Fid).all()
    courses = session.query(Course).order_by(Course.Cid).all()
    course_faculty = session.query(CourseFaculty).order_by(CourseFaculty.id).all()
    modules = session.query(Module).order_by(Module.Mid).all()
    enrollments = session.query(Enrollment).order_by(Enrollment.Eid).all()
    progress = session.query(Progress).order_by(Progress.Pid).all()
    notifications = session.query(Notification).order_by(Notification.Nid).all()
    reviews = session.query(Review).order_by(Review.Rid).all()

    return {
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "created_at": _serialize_datetime(user.created_at),
            }
            for user in users
        ],
        "students": [
            {
                "id": student.Sid,
                "Sid": student.Sid,
                "user_id": student.user_id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "age": student.age,
                "gender": student.gender,
                "address": student.address,
                "phone": student.phone,
                "dob": student.dob,
                "department": student.department,
                "blacklisted": student.blacklisted,
            }
            for student in students
        ],
        "faculty": [
            {
                "id": member.Fid,
                "Fid": member.Fid,
                "user_id": member.user_id,
                "first_name": member.first_name,
                "last_name": member.last_name,
                "phone": member.phone,
                "department": member.department,
                "qualification": member.qualification,
                "specialization": member.specialization,
                "employee_id": member.employee_id,
                "blacklisted": member.blacklisted,
            }
            for member in faculty
        ],
        "courses": [
            {
                "id": course.Cid,
                "course_name": course.cname,
                "course_code": course.course_code,
                "instructor": course.instructor,
                "duration": course.duration,
                "credits": course.credits,
                "category": course.category,
                "description": course.description,
            }
            for course in courses
        ],
        "course_faculty": [
            {
                "id": assignment.id,
                "course_id": assignment.course_id,
                "faculty_id": assignment.faculty_id,
                "assigned_at": _serialize_datetime(assignment.assigned_at),
            }
            for assignment in course_faculty
        ],
        "modules": [
            {
                "id": module.Mid,
                "Mid": module.Mid,
                "course_id": module.course_id,
                "title": module.title,
                "description": module.description,
                "module_number": module.module_number,
                "video_link": module.video_link,
                "notes": module.notes,
            }
            for module in modules
        ],
        "enrollments": [
            {
                "id": enrollment.Eid,
                "Eid": enrollment.Eid,
                "student_id": enrollment.student_id,
                "course_id": enrollment.course_id,
                "enrollment_date": _serialize_datetime(enrollment.enrollment_date),
                "status": enrollment.status,
            }
            for enrollment in enrollments
        ],
        "progress": [
            {
                "id": item.Pid,
                "Pid": item.Pid,
                "student_id": item.student_id,
                "course_id": item.course_id,
                "completed_modules": item.completed_modules,
                "total_modules": item.total_modules,
                "progress_percentage": item.progress_percentage,
                "last_updated": _serialize_datetime(item.last_updated),
            }
            for item in progress
        ],
        "notifications": [
            {
                "id": item.Nid,
                "Nid": item.Nid,
                "student_id": item.student_id,
                "title": item.title,
                "message": item.message,
                "is_read": item.is_read,
            }
            for item in notifications
        ],
        "reviews": [
            {
                "id": item.Rid,
                "Rid": item.Rid,
                "student_id": item.student_id,
                "course_id": item.course_id,
                "rating": item.rating,
                "review": item.review,
            }
            for item in reviews
        ],
    }


def sync_database_to_json(engine=None, path=None):
    if engine is None:
        engine = db.engine
    if path is None:
        path = current_app.config.get("MOCK_DATABASE_PATH")
    if path is None:
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mockapi", "db.json")

    with Session(engine) as read_session:
        data = _serialize_records(read_session)

    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)
    with _write_lock:
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "w", encoding="utf-8", dir=directory, delete=False
            ) as handle:
                temporary_path = handle.name
                json.dump(data, handle, indent=2)
                handle.write("\n")
            os.replace(temporary_path, path)
        finally:
            if temporary_path and os.path.exists(temporary_path):
                os.remove(temporary_path)


@event.listens_for(Session, "after_commit")
def _mirror_after_commit(session):
    if not has_app_context():
        return

    app = current_app._get_current_object()
    if app.testing or not app.config.get("MOCK_DATABASE_MIRROR_ENABLED", True):
        return
    if getattr(session.get_bind(), "engine", session.get_bind()) is not db.engine:
        return

    try:
        sync_database_to_json(db.engine, app.config.get("MOCK_DATABASE_PATH"))
    except Exception as error:
        app.extensions["mock_database_mirror_status"] = {
            "ok": False,
            "error": str(error),
        }
        app.logger.exception("Could not mirror the application database to db.json")
    else:
        app.extensions["mock_database_mirror_status"] = {"ok": True, "error": None}