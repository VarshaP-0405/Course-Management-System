from flask import Blueprint, render_template, request, redirect, url_for, flash
from pymongo import auth
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User,Student, Course, Module, Enrollment


api = Blueprint("api", __name__)


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
            return redirect(url_for("api.reset_password"))

        flash("Email not found.", "danger")

    return render_template("forgot-password.html")


# ===============================
# Reset Password
# ===============================
@api.route("/reset-password", methods=["GET", "POST"])
def reset_password():

    if request.method == "POST":

        email = request.form.get("email")
        new_password = request.form.get("password")

        user = User.query.filter_by(email=email).first()

        if user:

            user.password = generate_password_hash(new_password)

            db.session.commit()

            flash("Password Updated Successfully!", "success")

            return redirect(url_for("api.login"))

        flash("User not found.", "danger")

    return render_template("reset-password.html")


# ===============================
# Logout
# ===============================
@api.route("/logout")
def logout():

    flash("Logged Out Successfully", "success")

    return redirect(url_for("api.login"))