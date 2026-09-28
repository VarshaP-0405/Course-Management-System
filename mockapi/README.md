# Database Mirror

The Flask application uses SQLite as its source of truth and mirrors committed records into `db.json`. Passwords and password hashes are never copied into the JSON file. The React admin database page reads and writes through Flask, so changes made elsewhere in the app appear there as well.

## Run the application

Start Flask from the repository root:

```bash
.venv/bin/python backend/app.py
```

In a second terminal, start the React app:

```bash
cd frontend-react
npm run dev
```

Sign in as an admin and open **Database** or visit `/admin/database`. The page has controls to get, add, update, and delete records from each collection. It refreshes automatically and shows whether the JSON mirror is synced.

In Codespaces, share the forwarded React port with staff. Keep the Flask and JSON ports private; the JSON endpoint is not an authenticated app interface.

## Inspect the JSON mirror over HTTP

```bash
cd mockapi
npm install
npm start
```

The local, read-only JSON endpoint listens at `http://localhost:3001`, for example `http://localhost:3001/courses`. Write requests are rejected so the mirror cannot drift from the SQLite database. Use the admin database page for CRUD operations.