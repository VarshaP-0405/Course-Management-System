from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

import models


def create_app():
    app = Flask(
        __name__,
        template_folder="../frontend",
        static_folder="../frontend"
    )

    # Database
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hospital.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Security
    app.config["SECRET_KEY"] = "varsupersecretkeydha"
    app.config["JWT_SECRET_KEY"] = "this_is_a_super_secure_jwt_secret_key_2026_very_long"

    return app


# Create Flask App
app = create_app()
from flask_migrate import Migrate



# JWT
jwt = JWTManager(app)



# CORS
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:5170",
                "http://127.0.0.1:5170",
            ]
        }
    },
    supports_credentials=True,
)

# Import Routes AFTER app creation
from routes import api

app.register_blueprint(api)

from models import db

migrate = Migrate(app, db)
# Database Initialization
models.db.init_app(app)
from werkzeug.security import generate_password_hash


def create_admin():

    admin = models.User.query.filter_by(
        email="courseadmin123@gmail.com"
    ).first()


    if not admin:

        new_admin = models.User(

            email="courseadmin123@gmail.com",

            password=generate_password_hash(
                "courseadmin123"
            ),

            role=1

        )


        models.db.session.add(new_admin)

        models.db.session.commit()


        print("✅ Default Admin Created")


    else:

        print("ℹ️ Admin Already Exists")


if __name__ == "__main__":

    with app.app_context():

        # Create all tables
        models.db.create_all()

        # Create admin
        create_admin()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )