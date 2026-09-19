document.addEventListener("DOMContentLoaded", () => {
  const taskForm = document.getElementById("task-form");
  const taskList = document.getElementById("task-list");
  const emptyMsg = document.getElementById("empty-msg");
  const formError = document.getElementById("form-error");
  const filterBtns = document.querySelectorAll(".filter-btn");

  const editModal = document.getElementById("edit-modal");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  let tasks = [];  // initial as empty 
  let currentFilter = "All"; // default filter 

  // 1 date format function 
  function formatDate(dateInput) {
    if (!dateInput) return "Just now";

    let date;
    if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else {
      let str = String(dateInput).trim().replace(" ", "T");
      if (!str.includes("Z") && !str.includes("+") && !str.includes("-", 10)) {
        str += "Z";
      }
      date = new Date(str);
    }

    if (isNaN(date.getTime())) {
      return "Just now";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  // Fetch first initial taskss
  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to load tasks");
      tasks = await res.json();  // json data to tasks array
      renderTasks();
    } catch (err) {
      if (emptyMsg) emptyMsg.textContent = "Error loading tasks.";
    }
  }

  // Render tasks list using filter 
  function renderTasks() {
    taskList.innerHTML = ""; // clear previous tasks 

    const filteredTasks = tasks.filter(task => {
      if (currentFilter === "Pending") return task.status === "Pending";
      if (currentFilter === "Completed") return task.status === "Completed";
      return true;
    });

    if (filteredTasks.length === 0) {
      taskList.innerHTML = `<p class="empty-msg">No ${currentFilter !== 'All' ? currentFilter.toLowerCase() : ''} tasks found.</p>`;
      return;
    }

    // creating div for each task 
    filteredTasks.forEach(task => {
      const card = document.createElement("div");
      card.className = `task-item ${task.status.toLowerCase()}`;

      const createdDate = formatDate(task.created_at);
      const isCompleted = task.status === "Completed";

      card.innerHTML = `
        <div class="task-main">
          <h3 class="task-title ${isCompleted ? 'strikethrough' : ''}">${escapeHtml(task.title)}</h3>
          ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            <span class="badge badge-priority-${task.priority}">${task.priority}</span>
            <span class="badge badge-status-${task.status}">${task.status}</span>
            <span class="task-date">📅 Created ${createdDate}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn success" onclick="toggleTaskStatus('${task.id}')">
            ${isCompleted ? 'Mark Pending' : 'Mark Done'}
          </button>
          <button class="icon-btn" onclick="openEditModal('${task.id}')">Edit</button>
          <button class="icon-btn danger" onclick="deleteTask('${task.id}')">Delete</button>
        </div>
      `;
      taskList.appendChild(card);
    });
  }

  // 2. TOGGLE MARK DONE / MARK PENDING
  window.toggleTaskStatus = async (id) => {
    const task = tasks.find(t => String(t.id) === String(id));
    if (!task) return;

    const newStatus = task.status === "Completed" ? "Pending" : "Completed";

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: newStatus
        })
      });

      if (!res.ok) throw new Error("Failed to update task status.");

      task.status = newStatus;
      renderTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. CREATE TASK (REAL-TIME TIMESTAMP GENERATION)
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formError) formError.textContent = "";

    const currentIsoTimestamp = new Date().toISOString();

    const newTaskData = {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      priority: document.getElementById("priority").value,
      status: "Pending",
      created_at: currentIsoTimestamp
    };

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTaskData)
      });

      if (!res.ok) throw new Error("Could not add task.");

      const createdTask = await res.json();

      if (!createdTask.created_at) {
        createdTask.created_at = currentIsoTimestamp;
      }

      tasks.unshift(createdTask);
      taskForm.reset();
      renderTasks();
    } catch (err) {
      if (formError) formError.textContent = err.message;
    }
  });

  // Open Edit Modal
  window.openEditModal = (id) => {
    const task = tasks.find(t => String(t.id) === String(id));
    if (!task) return;

    document.getElementById("edit-id").value = task.id;
    document.getElementById("edit-title").value = task.title;
    document.getElementById("edit-description").value = task.description || "";
    document.getElementById("edit-priority").value = task.priority;
    document.getElementById("edit-status").value = task.status;

    editModal.classList.remove("hidden");
  };

  // Save Edit Modal
  saveEditBtn.addEventListener("click", async () => {
    const id = document.getElementById("edit-id").value;
    const updatedData = {
      title: document.getElementById("edit-title").value.trim(),
      description: document.getElementById("edit-description").value.trim(),
      priority: document.getElementById("edit-priority").value,
      status: document.getElementById("edit-status").value
    };

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) throw new Error("Failed to update task.");

      const index = tasks.findIndex(t => String(t.id) === String(id));
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updatedData };
      }

      editModal.classList.add("hidden");
      renderTasks();
    } catch (err) {
      alert(err.message);
    }
  });

  // Delete Task
  window.deleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task.");

      tasks = tasks.filter(t => String(t.id) !== String(id));
      renderTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  // Close Modal
  cancelEditBtn.addEventListener("click", () => {
    editModal.classList.add("hidden");
  });

  // Filters
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Helper: Escape HTML
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[match]);
  }

  fetchTasks();
});