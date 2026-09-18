"""
Task Manager - Flask Backend
=============================
Exposes a REST API for CRUD operations on tasks and serves the
static frontend (HTML/CSS/JS).

Database:
    Uses SQLAlchemy so it can talk to MySQL (via PyMySQL) in
    production, but defaults to a local SQLite file so the app
    runs out-of-the-box with zero external setup. Switch databases
    purely via the DATABASE_URL environment variable (see README).
"""

import os
from datetime import datetime

from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy

# ---------------------------------------------------------------------
# App & Database configuration
# ---------------------------------------------------------------------
app = Flask(__name__)

# Example MySQL URL (set this as an env var to use MySQL instead of SQLite):
#   mysql+pymysql://<user>:<password>@<host>:3306/<db_name>
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///tasks.db")

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

VALID_PRIORITIES = ("Low", "Medium", "High")
VALID_STATUSES = ("Pending", "Completed")


# ---------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------
class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    status = db.Column(db.String(20), nullable=False, default="Pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


# ---------------------------------------------------------------------
# Frontend route
# ---------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """GET /api/tasks?status=All|Pending|Completed"""
    status_filter = request.args.get("status", "All")

    query = Task.query
    if status_filter and status_filter != "All":
        if status_filter not in VALID_STATUSES:
            return jsonify({"error": f"Invalid status filter '{status_filter}'"}), 400
        query = query.filter_by(status=status_filter)

    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks]), 200


@app.route("/api/tasks", methods=["POST"])
def create_task():
    """POST /api/tasks  body: {title, description, priority}"""
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Task 'title' is required"}), 400

    priority = data.get("priority", "Medium")
    if priority not in VALID_PRIORITIES:
        return jsonify({"error": f"'priority' must be one of {VALID_PRIORITIES}"}), 400

    task = Task(
        title=title,
        description=(data.get("description") or "").strip(),
        priority=priority,
        status="Pending",
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    """PUT /api/tasks/<id>  body: any of {title, description, priority, status}"""
    task = Task.query.get_or_404(task_id)
    data = request.get_json(silent=True) or {}

    if "title" in data:
        new_title = (data["title"] or "").strip()
        if not new_title:
            return jsonify({"error": "Task 'title' cannot be empty"}), 400
        task.title = new_title

    if "description" in data:
        task.description = (data["description"] or "").strip()

    if "priority" in data:
        if data["priority"] not in VALID_PRIORITIES:
            return jsonify({"error": f"'priority' must be one of {VALID_PRIORITIES}"}), 400
        task.priority = data["priority"]

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return jsonify({"error": f"'status' must be one of {VALID_STATUSES}"}), 400
        task.status = data["status"]

    db.session.commit()
    return jsonify(task.to_dict()), 200


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    """DELETE /api/tasks/<id>"""
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": f"Task {task_id} deleted"}), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404


# ---------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
