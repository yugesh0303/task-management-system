# Task Manager

A simple full-stack To-Do / Task Management web app.

- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks)
- **Backend:** Python + Flask (REST API)
- **Database:** MySQL (via SQLAlchemy + PyMySQL), with automatic fallback to SQLite for zero-setup local development

## Features

- Add a task with title, description, and priority (Low / Medium / High)
- View all tasks
- Mark a task Pending ↔ Completed
- Edit a task's title, description, priority, and status
- Delete a task
- Filter tasks by All / Pending / Completed

## Project Structure

```
task-manager/
├── app.py                 # Flask app: routes, models, REST API
├── requirements.txt        # Python dependencies
├── .env.example             # Sample environment variables
├── .gitignore
├── templates/
│   └── index.html          # Main page
└── static/
    ├── css/style.css
    └── js/script.js        # Calls the REST API, renders the UI
```

## Prerequisites

- Python 3.9+
- pip
- (Optional, for MySQL) A running MySQL server. If you skip MySQL setup, the app
  automatically uses a local SQLite file (`tasks.db`) — nothing else to install.

## Setup & Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/task-manager.git
   cd task-manager
   ```

2. **Create and activate a virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate       # Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure the database (optional)**

   By default the app uses SQLite and needs no configuration — skip to step 5.

   To use MySQL instead:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   ```
   DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/task_manager
   ```
   Then create the database in MySQL first:
   ```sql
   CREATE DATABASE task_manager;
   ```
   The app will auto-create the `tasks` table on first run.

5. **Run the app**
   ```bash
   python app.py
   ```

6. **Open in browser**
   ```
   http://127.0.0.1:5000
   ```

## REST API Reference

| Method | Endpoint             | Description                          | Body (JSON)                                              |
|--------|-----------------------|---------------------------------------|------------------------------------------------------------|
| GET    | `/api/tasks`           | List all tasks. Optional `?status=Pending\|Completed\|All` filter | –                                                           |
| POST   | `/api/tasks`           | Create a task                        | `{"title": "...", "description": "...", "priority": "Low\|Medium\|High"}` |
| PUT    | `/api/tasks/<id>`      | Update a task (any subset of fields) | `{"title": "...", "description": "...", "priority": "...", "status": "Pending\|Completed"}` |
| DELETE | `/api/tasks/<id>`      | Delete a task                        | –                                                           |

### Example requests (curl)

```bash
# Create a task
curl -X POST http://127.0.0.1:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","description":"Milk, eggs, bread","priority":"High"}'

# List all tasks
curl http://127.0.0.1:5000/api/tasks

# List only pending tasks
curl "http://127.0.0.1:5000/api/tasks?status=Pending"

# Mark a task completed
curl -X PUT http://127.0.0.1:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"Completed"}'

# Delete a task
curl -X DELETE http://127.0.0.1:5000/api/tasks/1
```

## Data Model

| Field       | Type     | Notes                                   |
|-------------|----------|-------------------------------------------|
| id          | Integer  | Primary key, auto-increment               |
| title       | String   | Required                                  |
| description | Text     | Optional                                  |
| priority    | String   | One of `Low`, `Medium`, `High`            |
| status      | String   | One of `Pending`, `Completed` (default `Pending`) |
| created_at  | DateTime | Set automatically on creation             |

## Design Decisions

- **SQLAlchemy ORM** is used instead of raw SQL/`mysql-connector` so the same
  codebase can target MySQL in production and SQLite in local dev/tests just by
  changing the `DATABASE_URL` environment variable — no code changes needed.
- **Server-side validation** for `title` (required, non-empty) and for
  `priority` / `status` (must be one of the allowed enum values) happens in
  `app.py`, independent of the frontend, since the API should never trust
  client input.
- **Vanilla JS** (no framework) keeps the frontend dependency-free and easy to
  audit, appropriate for the app's scope.
- **Filtering** is done server-side via a query parameter (`GET /api/tasks?status=...`)
  rather than fetching everything and filtering in the browser, so the same
  API supports larger datasets without change.

## Future Improvements

- Add user authentication so tasks are scoped per user
- Add due dates and sorting/search
- Add pagination for large task lists
- Add automated tests (pytest) for the API layer
- Containerize with Docker Compose (Flask + MySQL)

## License

MIT
