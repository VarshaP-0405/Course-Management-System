from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Student, Faculty, Course, CourseFaculty, Module, Enrollment, Notification, Progress
import datetime
import json
import os


api = Blueprint("api", __name__)


def current_user():
    user_id = session.get('user_id')
    return db.session.get(User, user_id) if user_id else None


def current_student():
    user = current_user()
    return Student.query.filter_by(user_id=user.id).first() if user else None


def require_role(*roles):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if user is None:
                flash('Please log in to continue.', 'warning')
                return redirect(url_for('api.login', next=request.path))
            if user.role not in roles:
                flash('You do not have permission to access that page.', 'danger')
                return redirect(url_for('api.home'))
            return view(*args, **kwargs)
        return wrapped
    return decorator


def get_course_data_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "course-data.json")


def read_courses():
    courses = Course.query.order_by(Course.Cid).all()
    if not courses:
        path = get_course_data_path()
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as handle:
                seed_courses = json.load(handle)
            for item in seed_courses:
                db.session.add(Course(
                    cname=item.get('course_name', 'Untitled Course'),
                    course_code=item.get('course_code'),
                    instructor=item.get('instructor', 'Faculty'),
                    duration=item.get('duration'),
                    description=item.get('description'),
                    category=item.get('category', 'General'),
                    credits=int(item.get('credits') or 0),
                ))
            db.session.commit()
            courses = Course.query.order_by(Course.Cid).all()
    return [
        {
            'id': course.Cid,
            'course_name': course.cname,
            'course_code': course.course_code,
            'instructor': course.instructor,
            'duration': course.duration,
            'credits': course.credits,
            'description': course.description,
        }
        for course in courses
    ]


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
@require_role(1)
def admin_dashboard():
    total_students = User.query.filter(User.role == 3).count()
    total_faculty = User.query.filter(User.role == 2).count()
    total_courses = Course.query.count()
    total_enrollments = Enrollment.query.count()
    return render_template(
        "admin-dashboard.html",
        total_students=total_students,
        total_faculty=total_faculty,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
    )


# Faculty Dashboard
@api.route("/faculty/dashboard")
@require_role(2)
def faculty_dashboard():
    total_students = User.query.filter(User.role == 3).count()
    total_courses = Course.query.count()
    faculty = Faculty.query.first()
    faculty_details = None
    if faculty:
        user = db.session.get(User, faculty.user_id)
        faculty_details = {
            'name': f'{faculty.first_name} {faculty.last_name}',
            'email': user.email if user else '',
            'phone': faculty.phone,
            'department': faculty.department,
            'qualification': faculty.qualification,
            'specialization': faculty.specialization,
            'employee_id': faculty.employee_id,
        }
    assigned_courses = []
    if faculty:
        assigned_courses = db.session.query(Course).join(
            CourseFaculty, CourseFaculty.course_id == Course.Cid
        ).filter(CourseFaculty.faculty_id == faculty.Fid).all()
    return render_template(
        "faculty-dashboard.html",
        total_students=total_students,
        total_courses=total_courses,
        faculty=faculty_details,
        assigned_courses=assigned_courses,
    )


@api.route('/add-faculty', methods=['GET', 'POST'])
@require_role(1)
def add_faculty():
    if request.method == 'POST':
        first_name = request.form.get('first_name', '').strip()
        last_name = request.form.get('last_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        phone = request.form.get('phone', '').strip()
        department = request.form.get('department', '').strip()
        qualification = request.form.get('qualification', '').strip()
        specialization = request.form.get('specialization', '').strip()
        employee_id = request.form.get('employee_id', '').strip()

        required = [first_name, last_name, email, password, department,
                    qualification, specialization, employee_id]
        if not all(required):
            flash('Please complete all required faculty details.', 'danger')
            return render_template('add-faculty.html')

        if User.query.filter_by(email=email).first():
            flash('That email is already registered.', 'danger')
            return render_template('add-faculty.html')
        if Faculty.query.filter_by(employee_id=employee_id).first():
            flash('That employee ID is already in use.', 'danger')
            return render_template('add-faculty.html')

        user = User(email=email, password=generate_password_hash(password), role=2)
        db.session.add(user)
        db.session.flush()
        faculty = Faculty(
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            department=department,
            qualification=qualification,
            specialization=specialization,
            employee_id=employee_id,
        )
        db.session.add(faculty)
        db.session.commit()
        flash('Faculty account created successfully.', 'success')
        return redirect(url_for('api.admin_dashboard'))

    return render_template('add-faculty.html')


# Student Dashboard
@api.route("/student/dashboard")
@require_role(3)
def student_dashboard():
    courses = read_courses()
    student = current_student()
    enrolled = []
    if student:
        enrolled = db.session.query(Course, Progress).join(
            Enrollment, Enrollment.course_id == Course.Cid
        ).outerjoin(
            Progress,
            (Progress.course_id == Course.Cid) & (Progress.student_id == student.Sid)
        ).filter(
            Enrollment.student_id == student.Sid,
            Enrollment.status == 'Enrolled'
        ).all()
    progress_list = [
        {
            'id': course.Cid,
            'course_name': course.cname,
            'progress': round(progress.progress_percentage if progress else 0),
        }
        for course, progress in enrolled
    ]
    return render_template(
        "student-dashboard.html",
        enrolled_count=len(progress_list),
        total_courses=len(courses),
        student_courses=progress_list,
    )


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

        if not email or not password:
            flash("Please enter your email and password.", "danger")
            return render_template("login.html")

        user = User.query.filter_by(email=email).first()

        if not user:
            flash("No account found for this email. Please register first.", "warning")
            return redirect(url_for("api.register"))

        if not check_password_hash(user.password, password):
            flash("Incorrect password. Please try again.", "danger")
            return render_template("login.html")

        if role and str(user.role) != str(role):
            flash("Selected role does not match your account. Please choose the correct role.", "danger")
            return render_template("login.html")

        session.clear()
        session['user_id'] = user.id
        session['role'] = user.role

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
    session.clear()
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
@require_role(3, 2)
def course_content(course_id):
    courses = read_courses()

    course = next((item for item in courses if item.get('id') == course_id), None)
    if course is None:
        course = {'id': course_id, 'course_name': 'Course', 'course_code': 'GEN', 'instructor': 'Faculty', 'duration': 'N/A', 'credits': 0, 'description': 'Course content available.'}

    modules = [
        {'id': 1, 'title': 'Introduction', 'description': 'Overview of the course and learning objectives.'},
        {'id': 2, 'title': 'Core Concepts', 'description': 'Key principles, examples, and practical exercises.'},
        {'id': 3, 'title': 'Assessment', 'description': 'Review tasks and final challenge for the module.'},
    ]
    progress = 65
    return render_template("course-content.html", course=course, modules=modules, progress=progress)




@api.route('/add-course', methods=['GET', 'POST'])
@require_role(1)
def add_course():
    if request.method == 'POST':
        course_name = request.form.get('course_name')
        course_code = request.form.get('course_code')
        instructor = request.form.get('instructor')
        duration = request.form.get('duration')
        credits = request.form.get('credits')
        description = request.form.get('description')
        faculty_id = request.form.get('faculty_id', type=int)

        if not all([course_name, course_code, instructor, duration]):
            flash('Please fill in all required course details.', 'danger')
            return render_template(
                'add-course.html',
                faculty_members=Faculty.query.order_by(Faculty.last_name).all(),
            )

        course = Course(
            cname=course_name,
            course_code=course_code,
            instructor=instructor,
            duration=duration,
            credits=int(credits or 0),
            description=description,
            category='General'
        )
        db.session.add(course)
        db.session.flush()
        if faculty_id:
            faculty = db.session.get(Faculty, faculty_id)
            if faculty:
                db.session.add(CourseFaculty(course_id=course.Cid, faculty_id=faculty.Fid))
                course.instructor = f'{faculty.first_name} {faculty.last_name}'
        db.session.commit()

        courses = read_courses()
        courses.append({
            'id': course.Cid,
            'course_name': course_name,
            'course_code': course_code,
            'instructor': instructor,
            'duration': duration,
            'credits': int(credits or 0),
            'description': description
        })
        write_courses(courses)

        flash('Course added successfully!', 'success')
        return redirect(url_for('api.admin_dashboard'))

    return render_template('add-course.html', faculty_members=Faculty.query.order_by(Faculty.last_name).all())

@api.route('/edit-course/<int:course_id>', methods=['GET', 'POST'])
@require_role(1, 2)
def edit_course(course_id):
    db_course = db.session.get(Course, course_id)
    courses = read_courses()
    course = next((item for item in courses if item.get('id') == course_id), None)

    if course is None and db_course is None:
        flash('Course not found.', 'danger')
        return redirect(url_for('api.admin_dashboard'))

    if request.method == "POST":
        if db_course is not None:
            db_course.cname = request.form.get('course_name', db_course.course_name or db_course.cname)
            db_course.course_code = request.form.get('course_code', db_course.course_code)
            db_course.instructor = request.form.get('instructor', db_course.instructor)
            db_course.duration = request.form.get('duration', db_course.duration)
            db_course.credits = request.form.get('credits', db_course.credits)
            db_course.description = request.form.get('description', db_course.description)
            db.session.commit()

        if course is not None:
            course['course_name'] = request.form.get('course_name', course['course_name'])
            course['course_code'] = request.form.get('course_code', course['course_code'])
            course['instructor'] = request.form.get('instructor', course['instructor'])
            course['duration'] = request.form.get('duration', course['duration'])
            course['credits'] = request.form.get('credits', course['credits'])
            course['description'] = request.form.get('description', course['description'])
            write_courses(courses)

        flash("Course Updated Successfully!", "success")
        return redirect(url_for("api.admin_dashboard"))

    if db_course is not None:
        course = {
            'id': db_course.Cid,
            'course_name': db_course.course_name or db_course.cname,
            'course_code': db_course.course_code,
            'instructor': db_course.instructor,
            'duration': db_course.duration,
            'credits': db_course.credits,
            'description': db_course.description,
        }
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


@api.route('/profile', methods=['GET', 'POST'])
@require_role(3)
def profile():
    user = current_user()
    student = current_student()
    if request.method == 'POST' and student:
        full_name = request.form.get('full_name', '').strip().split(maxsplit=1)
        if len(full_name) == 2:
            student.first_name, student.last_name = full_name
        student.phone = request.form.get('phone', '').strip()
        student.department = request.form.get('department', '').strip()
        db.session.commit()
        flash('Profile updated successfully.', 'success')
        return redirect(url_for('api.profile'))
    profile = {
        'full_name': f"{student.first_name} {student.last_name}" if student else 'Alex Morgan',
        'email': user.email if user else 'student@example.com',
        'phone': student.phone if student else '+1 234 567 8900',
        'department': student.department if student else 'Computer Science',
    }
    return render_template('profile.html', profile=profile)


@api.route('/students')
@require_role(1)
def students():
    student_rows = []
    rows = db.session.query(Student, User).join(User, Student.user_id == User.id).all()
    for student, user in rows:
        student_rows.append({
            'id': student.Sid,
            'first_name': student.first_name,
            'last_name': student.last_name,
            'email': user.email,
            'role': user.role,
            'status': 'Active'
        })
    return render_template('students.html', students=student_rows)


@api.route('/reports')
@require_role(1, 2)
def reports():
    student_count = User.query.filter(User.role == 3).count()
    course_count = Course.query.count()
    enrollment_count = Enrollment.query.count()
    completed_lessons = min(25, max(0, enrollment_count * 3))
    return render_template(
        'reports.html',
        student_count=student_count,
        course_count=course_count,
        enrollment_count=enrollment_count,
        completed_lessons=completed_lessons,
    )


@api.route('/browse-courses')
def browse_courses():
    courses = read_courses()
    return render_template('browse-courses.html', courses=courses)


@api.route('/enroll/<int:course_id>')
@require_role(3)
def enroll_course(course_id):
    db_course = db.session.get(Course, course_id)
    student = current_student()
    if db_course is None or student is None:
        flash('Course not found.', 'danger')
        return redirect(url_for('api.browse_courses'))

    enrollment = Enrollment.query.filter_by(
        student_id=student.Sid,
        course_id=db_course.Cid,
    ).first()
    if enrollment is None:
        db.session.add(Enrollment(student_id=student.Sid, course_id=db_course.Cid))
        db.session.add(Progress(
            student_id=student.Sid,
            course_id=db_course.Cid,
            total_modules=Module.query.filter_by(course_id=db_course.Cid).count(),
        ))
        db.session.commit()
    course = {
        'id': db_course.Cid,
        'course_name': db_course.cname,
        'course_code': db_course.course_code,
        'instructor': db_course.instructor,
        'duration': db_course.duration,
        'credits': db_course.credits,
        'description': db_course.description,
    }

    return render_template('enrollment-success.html', course=course)


@api.route('/my-courses')
@require_role(3)
def my_courses():
    student = current_student()
    courses = []
    if student:
        rows = db.session.query(Course, Enrollment).join(
            Enrollment, Enrollment.course_id == Course.Cid
        ).filter(
            Enrollment.student_id == student.Sid,
            Enrollment.status == 'Enrolled'
        ).all()
        courses = [
            {
                'id': course.Cid,
                'course_name': course.cname,
                'course_code': course.course_code,
                'instructor': course.instructor,
                'duration': course.duration,
                'credits': course.credits,
            }
            for course, _ in rows
        ]
    return render_template(
        'my-courses.html',
        courses=courses
    )


@api.route('/notifications')
@require_role(3)
def notifications():
    student = current_student()
    notifications = Notification.query.filter_by(student_id=student.Sid).order_by(Notification.Nid.desc()).all()
    items = []
    if notifications:
        for n in notifications:
            items.append({
                'title': n.title or 'Course Update',
                'message': n.message or 'New update available.',
                'time': 'Recently',
                'type': 'course',
                'is_read': bool(n.is_read),
            })
    else:
        items = []
    return render_template('notifications.html', notifications=items)


@api.route('/progress')
@require_role(3)
def progress():
    student = current_student()
    courses = []
    if student:
        rows = db.session.query(Course, Progress).join(
            Enrollment, Enrollment.course_id == Course.Cid
        ).outerjoin(
            Progress,
            (Progress.course_id == Course.Cid) & (Progress.student_id == student.Sid)
        ).filter(Enrollment.student_id == student.Sid).all()
        courses = [
            {
                'course_name': course.cname,
                'completed_modules': progress.completed_modules if progress else 0,
                'total_modules': progress.total_modules if progress else 0,
                'progress': round(progress.progress_percentage if progress else 0),
            }
            for course, progress in rows
        ]
    overall_progress = int(sum(item['progress'] for item in courses) / max(len(courses), 1)) if courses else 0
    return render_template(
        'progress.html',
        courses=courses,
        total_courses=len(courses),
        completed_courses=sum(1 for c in courses if c['progress'] >= 100),
        ongoing_courses=sum(1 for c in courses if c['progress'] < 100),
        certificates=1 if overall_progress >= 100 else 0,
        overall_progress=overall_progress,
    )


@api.route('/certificate')
@require_role(3)
def certificate():
    student = current_student()
    return render_template(
        'certificate.html',
        student_name=f'{student.first_name} {student.last_name}' if student else 'Student',
        course_name='Course completion certificate',
        instructor='Assigned Faculty',
        completion_date=datetime.date.today().strftime('%B %d, %Y'),
        certificate_id=f'CMS-{datetime.date.today().year}-{student.Sid:04d}' if student else 'CMS-PENDING'
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
@require_role(3)
def mark_all_read():
    student = current_student()
    Notification.query.filter_by(student_id=student.Sid).update({'is_read': True})
    db.session.commit()
    flash('All notifications marked as read.', 'success')
    return redirect(url_for('api.notifications'))


@api.route('/mark-completed/<int:module_id>')
@require_role(3)
def mark_completed(module_id):
    student = current_student()
    module_record = db.session.get(Module, module_id)
    if module_record:
        progress_record = Progress.query.filter_by(
            student_id=student.Sid,
            course_id=module_record.course_id,
        ).first()
        if progress_record:
            progress_record.completed_modules = min(
                progress_record.total_modules,
                progress_record.completed_modules + 1,
            )
            progress_record.progress_percentage = (
                progress_record.completed_modules / progress_record.total_modules * 100
                if progress_record.total_modules else 0
            )
            db.session.commit()
    flash(f'Module {module_id} marked as completed.', 'success')
    return redirect(url_for('api.module', module_id=module_id))


@api.route('/next-module/<int:module_id>')
def next_module(module_id):
    return redirect(url_for('api.module', module_id=module_id + 1))
