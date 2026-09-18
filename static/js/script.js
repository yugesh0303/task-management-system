const API_BASE = "/api/tasks";

let currentFilter = "All";

const taskForm = document.getElementById("task-form");
const taskListEl = document.getElementById("task-list");
const emptyMsg = document.getElementById("empty-msg");
const formError = document.getElementById("form-error");
const filterButtons = document.querySelectorAll(".filter-btn");

const editModal = document.getElementById("edit-modal");
const editId = document.getElementById("edit-id");
const editTitle = document.getElementById("edit-title");
const editDescription = document.getElementById("edit-description");
const editPriority = document.getElementById("edit-priority");
const editStatus = document.getElementById("edit-status");

// ---------------------------------------------------------------
// Fetch & render
// ---------------------------------------------------------------
async function fetchTasks() {
  emptyMsg.textContent = "Loading tasks…";
  try {
    const res = await fetch(`${API_BASE}?status=${encodeURIComponent(currentFilter)}`);
    if (!res.ok) throw new Error("Failed to load tasks");
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    emptyMsg.textContent = "Could not load tasks. Is the server running?";
    console.error(err);
  }
}

function renderTasks(tasks) {
  taskListEl.querySelectorAll(".task-item").forEach(el => el.remove());

  if (tasks.length === 0) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = "No tasks here yet.";
    return;
  }
  emptyMsg.style.display = "none";

  tasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-item" + (task.status === "Completed" ? " completed" : "");
    item.innerHTML = `
      <div class="task-main">
        <p class="task-title">${escapeHtml(task.title)}</p>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
        <div class="task-meta">
          <span class="badge badge-priority-${task.priority}">${task.priority}</span>
          <span class="badge badge-status-${task.status}">${task.status}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn toggle-btn" data-id="${task.id}" data-status="${task.status}">
          ${task.status === "Pending" ? "Mark done" : "Reopen"}
        </button>
        <button class="icon-btn edit-btn" data-id="${task.id}">Edit</button>
        <button class="icon-btn danger delete-btn" data-id="${task.id}">Delete</button>
      </div>
    `;
    taskListEl.appendChild(item);
  });

  taskListEl.querySelectorAll(".toggle-btn").forEach(btn =>
    btn.addEventListener("click", onToggleStatus)
  );
  taskListEl.querySelectorAll(".edit-btn").forEach(btn =>
    btn.addEventListener("click", onEditClick)
  );
  taskListEl.querySelectorAll(".delete-btn").forEach(btn =>
    btn.addEventListener("click", onDeleteClick)
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const priority = document.getElementById("priority").value;

  if (!title) {
    formError.textContent = "Task name is required.";
    return;
  }

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create task");

    taskForm.reset();
    document.getElementById("priority").value = "Medium";
    await fetchTasks();
  } catch (err) {
    formError.textContent = err.message;
  }
});

// ---------------------------------------------------------------
// Update status (toggle)
// ---------------------------------------------------------------
async function onToggleStatus(e) {
  const id = e.target.dataset.id;
  const currentStatus = e.target.dataset.status;
  const newStatus = currentStatus === "Pending" ? "Completed" : "Pending";

  await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  await fetchTasks();
}

// ---------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------
async function onEditClick(e) {
  const id = e.target.dataset.id;
  const res = await fetch(API_BASE);
  const tasks = await res.json();
  const task = tasks.find(t => String(t.id) === String(id));
  if (!task) return;

  editId.value = task.id;
  editTitle.value = task.title;
  editDescription.value = task.description || "";
  editPriority.value = task.priority;
  editStatus.value = task.status;
  editModal.classList.remove("hidden");
}

document.getElementById("cancel-edit-btn").addEventListener("click", () => {
  editModal.classList.add("hidden");
});

document.getElementById("save-edit-btn").addEventListener("click", async () => {
  const id = editId.value;
  const title = editTitle.value.trim();
  if (!title) return;

  await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description: editDescription.value.trim(),
      priority: editPriority.value,
      status: editStatus.value,
    }),
  });
  editModal.classList.add("hidden");
  await fetchTasks();
});

// ---------------------------------------------------------------
// Delete
// ---------------------------------------------------------------
async function onDeleteClick(e) {
  const id = e.target.dataset.id;
  if (!confirm("Delete this task?")) return;

  await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  await fetchTasks();
}

// ---------------------------------------------------------------
// Filters
// ---------------------------------------------------------------
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    fetchTasks();
  });
});

// Initial load
fetchTasks();
