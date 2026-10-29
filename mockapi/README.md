# Course Management Data Store

This directory contains the local JSON data file used by the Express backend. Collections are stored in `db.json`; edits made through the app are saved there.

## Start the API

```bash
cd /workspaces/Course-Management-System/backend
npm install
npm start
```

The Express API listens at `http://localhost:3002`. Example endpoints include `/users`, `/students`, `/courses`, `/enrollments`, and `/progress`.

## Demo accounts

All seeded accounts use the mock-only password `demo123`:

- Student: `varsha@gmail.com`
- Faculty: `thangam@gmail.com`
- Admin: `courseadmin123@gmail.com`

This is a local development data store, not production account provisioning or storage. Demo credentials are for local development only; passwords in the JSON file are bcrypt hashes.