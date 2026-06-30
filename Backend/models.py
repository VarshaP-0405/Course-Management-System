from flask import Flask, render_template, request, redirect, session, flash, url_for
from flask_sqlalchemy import SQLAlchemy
import sqlalchemy
from datetime import datetime, time

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Integer)  # 1=Admin, 2=Doctor, 3=Patient

class Student(db.Model):
    Sid = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(30), nullable=False)
    last_name = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    address = db.Column(db.String(100))
    phone = db.Column(db.String(15))
    dob = db.Column(db.String, nullable=False)
    department = db.Column(db.String(50))
    blacklisted = db.Column(db.String(2), default="N")

class Course(db.Model):
    Cid = db.Column(db.Integer, primary_key=True)
    cname = db.Column(db.String(100), nullable=False)
    instructor = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), nullable=False)
    credits = db.Column(db.Integer, nullable=False)


    