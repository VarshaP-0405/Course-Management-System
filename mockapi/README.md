# Mock API

This JSON Server exposes every collection in `db.json` as a writable REST resource. Changes made through the API are saved back to `db.json`.

## Start

```bash
cd mockapi
npm install
npm start
```

The API listens on `http://localhost:3001`. In Codespaces, forward port `3001` from the Ports tab to access it from a browser or share it with staff.

## CRUD examples

Use any collection name from `db.json`, such as `courses`, `students`, `faculty`, `modules`, or `enrollments`.

```bash
# Read a collection or one record
curl http://localhost:3001/courses
curl http://localhost:3001/courses/1

# Create a record
curl -X POST http://localhost:3001/courses \
  -H 'Content-Type: application/json' \
  -d '{"course_name":"Demo Course","course_code":"DM101","instructor":"Demo Instructor","duration":"4 weeks","credits":2,"category":"Demo","description":"Sample course"}'

# Replace a record
curl -X PUT http://localhost:3001/courses/1 \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"course_name":"Python Basics","course_code":"PY101","instructor":"Dr. Nisha Rao","duration":"6 Weeks","credits":3,"category":"Programming","description":"A beginner-friendly introduction to Python programming."}'

# Update selected fields
curl -X PATCH http://localhost:3001/courses/1 \
  -H 'Content-Type: application/json' \
  -d '{"description":"Updated demo description"}'

# Delete a record
curl -X DELETE http://localhost:3001/courses/1
```

All endpoints support the same CRUD methods: `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`. This mock API has no authentication; use only demo data and keep the forwarded port private when possible.