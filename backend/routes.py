from flask import Blueprint, render_template, request, redirect, url_for, flash
from pymongo import auth
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Student, Course, Module, Enrollment
import datetime
import json
import os


api = Blueprint("api", __name__)


def get_course_data_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "course-data.json")


def read_courses():
    path = get_course_data_path()
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_courses(courses):
    path = get_course_data_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(courses, handle, indent=2)


# ===============================
# Home Page
# ===============================
@api.route("/")
def home():
    return render_template("index.html")

# Admin Dashboard
@api.route("/admin/dashboard")
def admin_dashboard():
    return render_template("admin-dashboard.html")


# Faculty Dashboard
@api.route("/faculty/dashboard")
def faculty_dashboard():
    return render_template("faculty-dashboard.html")


# Student Dashboard
@api.route("/student/dashboard")
def student_dashboard():
    return render_template("student-dashboard.html")


# ===============================
# Register
# ===============================
@api.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        try:

            first_name = request.form.get("first_name")
            last_name = request.form.get("last_name")
            email = request.form.get("email")
            password = request.form.get("password")
            confirm_password = request.form.get("confirm_password")

            age = request.form.get("age")
            gender = request.form.get("gender")
            phone = request.form.get("phone")
            address = request.form.get("address")
            dob = request.form.get("dob")
            department = request.form.get("department")


            # Check existing user

            existing = User.query.filter_by(email=email).first()

            if existing:
                flash(
                    "Email already registered!",
                    "danger"
                )
                return redirect(url_for("api.register"))



            # Password check

            if password != confirm_password:

                flash(
                    "Passwords do not match!",
                    "danger"
                )

                return redirect(url_for("api.register"))



            # Create User

            new_user = User(

                email=email,

                password=generate_password_hash(password),

                role=3

            )


            db.session.add(new_user)

            db.session.commit()



            # Create Student Profile

            new_student = Student(

                user_id=new_user.id,

                first_name=first_name,

                last_name=last_name,

                age=age,

                gender=gender,

                address=address,

                phone=phone,

                dob=dob,

                department=department

            )


            db.session.add(new_student)

            db.session.commit()
            
            return redirect(
                url_for("api.login")
            )


        except Exception as e:

            db.session.rollback()

            print("REGISTER ERROR:", e)

            flash(
                "Registration failed",
                "danger"
            )



    return render_template("register.html")


# ===============================
# Login
# ===============================
@api.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form.get("email")
        password = request.form.get("password")
        role = request.form.get("role")

        print("EMAIL:", email)
        print("ROLE:", role)

        user = User.query.filter_by(
            email=email
        ).first()

        print("USER:", user)


        if user and check_password_hash(user.password, password):

            print("LOGIN SUCCESS")
            print("DATABASE ROLE:", user.role)


            if user.role == 1:
                return redirect(url_for("api.admin_dashboard"))

            elif user.role == 2:
                return redirect(url_for("api.faculty_dashboard"))

            elif user.role == 3:
                return redirect(url_for("api.student_dashboard"))


        flash("Invalid Login", "danger")


    return render_template("login.html")


# ===============================
# Forgot Password
# ===============================
@api.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():

    if request.method == "POST":

        email = request.form.get("email")

        user = User.query.filter_by(email=email).first()

        if user:

            flash("Reset your password below.", "info")
            return redirect(url_for("api.reset_password", email=email))

        flash("Email not found.", "danger")

    return render_template("forgot-password.html")


# ===============================
# Reset Password
# ===============================
@api.route("/reset-password", methods=["GET", "POST"])
def reset_password():

    email = request.args.get("email") or request.form.get("email")

    if request.method == "POST":

        new_password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        if new_password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("reset-password.html", email=email)

        user = User.query.filter_by(email=email).first()

        if user:

            user.password = generate_password_hash(new_password)

            db.session.commit()

            flash("Password Updated Successfully!", "success")

            return redirect(url_for("api.login"))

        flash("User not found.", "danger")

    return render_template("reset-password.html", email=email)


# ===============================
# Logout
# ===============================
@api.route("/logout")
def logout():

    flash("Logged Out Successfully", "success")

    return redirect(url_for("api.login"))

@api.route('/course/<int:course_id>')
def course_details(course_id):
    courses = read_courses()

    course = next((item for item in courses if item.get('id') == course_id), None)
    if course is None:
        return redirect(url_for('api.browse_courses'))
    return render_template("course-details.html", course=course)


@api.route('/course/<int:course_id>/content')
def course_content(course_id):
    courses = read_courses()

    course = next((item for item in courses if item.get('id') == course_id), None)
    modules = []
    progress = 0
    return render_template("course-content.html", course=course, modules=modules, progress=progress)




@api.route('/add-course', methods=['GET', 'POST'])
def add_course():
    if request.method == 'POST':
        course_name = request.form.get('course_name')
        course_code = request.form.get('course_code')
        instructor = request.form.get('instructor')
        duration = request.form.get('duration')
        credits = request.form.get('credits')
        description = request.form.get('description')

        courses = read_courses()

        courses.append({
            'id': len(courses) + 1,
            'course_name': course_name,
            'course_code': course_code,
            'instructor': instructor,
            'duration': duration,
            'credits': credits,
            'description': description
        })

        write_courses(courses)

        flash('Course added successfully!', 'success')
        return redirect(url_for('api.admin_dashboard'))

    return render_template('add-course.html')

@api.route('/edit-course/<int:course_id>', methods=['GET', 'POST'])
def edit_course(course_id):
    courses = read_courses()

    course = next((item for item in courses if item.get('id') == course_id), None)

    if course is None:
        flash('Course not found.', 'danger')
        return redirect(url_for('api.admin_dashboard'))

    if request.method == "POST":
        course['course_name'] = request.form.get('course_name', course['course_name'])
        course['course_code'] = request.form.get('course_code', course['course_code'])
        course['instructor'] = request.form.get('instructor', course['instructor'])
        course['duration'] = request.form.get('duration', course['duration'])
        course['credits'] = request.form.get('credits', course['credits'])
        course['description'] = request.form.get('description', course['description'])

        write_courses(courses)

        flash("Course Updated Successfully!", "success")
        return redirect(url_for("api.admin_dashboard"))

    return render_template("edit-course.html", course=course)
@api.route('/courses')
def courses():
    return render_template('courses.html')


@api.route('/about')
def about():
    return render_template('about.html')


@api.route('/contact')
def contact():
    return render_template('contact.html')


@api.route('/profile')
def profile():
    return render_template('profile.html')


@api.route('/students')
def students():
    return render_template('students.html')


@api.route('/reports')
def reports():
    return render_template('reports.html')


@api.route('/browse-courses')
def browse_courses():
    courses = read_courses()
    return render_template('browse-courses.html', courses=courses)


@api.route('/enroll/<int:course_id>')
def enroll_course(course_id):
    try:
        course = Course.query.get_or_404(course_id)
    except Exception:
        course = None

    if course is None:
        return redirect(url_for('api.browse_courses'))

    return render_template(
        'enrollment-success.html',
        course=course
    )


@api.route('/my-courses')
def my_courses():
    courses = read_courses()
    return render_template(
        'my-courses.html',
        courses=courses
    )


@api.route('/notifications')
def notifications():
    items = [
        {'title': 'New module released', 'message': 'A new lesson is now available for your active course.', 'time': '10 mins ago', 'type': 'course', 'is_read': False},
        {'title': 'Assignment reminder', 'message': 'Please review the latest assignment instructions.', 'time': '1 hr ago', 'type': 'assignment', 'is_read': False},
        {'title': 'Certificate ready', 'message': 'Your completion certificate is ready to view.', 'time': 'Yesterday', 'type': 'certificate', 'is_read': True},
    ]
    return render_template('notifications.html', notifications=items)


@api.route('/progress')
def progress():
    courses = [
        {'course_name': 'Python Basics', 'completed_modules': 3, 'total_modules': 5, 'progress': 60},
        {'course_name': 'Web Development', 'completed_modules': 4, 'total_modules': 4, 'progress': 100},
    ]
    overall_progress = 80
    return render_template(
        'progress.html',
        courses=courses,
        total_courses=len(courses),
        completed_courses=sum(1 for c in courses if c['progress'] >= 100),
        ongoing_courses=sum(1 for c in courses if c['progress'] < 100),
        certificates=1,
        overall_progress=overall_progress,
    )


@api.route('/certificate')
def certificate():
    return render_template(
        'certificate.html',
        student_name='Alex Morgan',
        course_name='Python Basics',
        instructor='Dr. Nisha Rao',
        completion_date='July 26, 2026',
        certificate_id='CMS-2026-001'
    )


@api.route('/materials/<int:module_id>')
def materials(module_id):
    module = {'id': module_id, 'title': 'Module Overview', 'description': 'Helpful references and downloadable resources.'}
    materials_list = [
        {'title': 'Lecture Notes', 'description': 'PDF guide for the module.', 'file_type': 'pdf', 'file_name': 'notes.pdf'},
        {'title': 'Practice Worksheet', 'description': 'Exercises to reinforce the topic.', 'file_type': 'docx', 'file_name': 'worksheet.docx'},
    ]
    return render_template('materials.html', module=module, materials=materials_list)


@api.route('/module/<int:module_id>')
def module(module_id):
    course = {'course_name': 'Python Basics'}
    module = {'id': module_id, 'title': 'Getting Started', 'description': 'A beginner-friendly introduction to the course.', 'course': course, 'duration': '30 Minutes', 'course_id': 1}
    return render_template('module.html', module=module)


@api.route('/video-player/<int:module_id>')
def video_player(module_id):
    course = {'instructor': 'Dr. Nisha Rao'}
    module = {'id': module_id, 'title': 'Intro Lecture', 'description': 'A short introduction to the module.', 'video_url': 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'duration': '15 Minutes', 'course': course}
    return render_template('video-player.html', module=module, progress=75)


@api.route('/mark-all-read')
def mark_all_read():
    flash('All notifications marked as read.', 'success')
    return redirect(url_for('api.notifications'))


@api.route('/mark-completed/<int:module_id>')
def mark_completed(module_id):
    flash(f'Module {module_id} marked as completed.', 'success')
    return redirect(url_for('api.module', module_id=module_id))


@api.route('/next-module/<int:module_id>')
def next_module(module_id):
    return redirect(url_for('api.module', module_id=module_id + 1))
