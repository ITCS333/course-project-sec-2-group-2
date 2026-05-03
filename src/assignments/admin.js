/*
Requirement: Make the "Manage Assignments" page interactive.
*/
// --- Global Data Store ---
let assignments = [];

// --- Element Selections ---
const assignmentForm = document.querySelector("#assignment-form");
const assignmentsTableBody = document.querySelector("#assignments-tbody");

// --- Functions ---

// Create a row <tr> for one assignment
function createAssignmentRow(assignment) {
  const { id, title, dueDate } = assignment;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${title}</td>
    <td>${dueDate}</td>
    <td>
        <button class="edit-btn" data-id="${id}">Edit</button>
        <button class="delete-btn" data-id="${id}">Delete</button>
    </td>
  `;
  return tr;
}

// Render the table by clearing and re-appending rows
function renderTable() {
  assignmentsTableBody.innerHTML = "";

  assignments.forEach(assignment => {
    const row = createAssignmentRow(assignment);
    assignmentsTableBody.appendChild(row);
  });
}

// Handle adding a new assignment
function handleAddAssignment(event) {
  event.preventDefault();

  const title = document.querySelector("#assignment-title").value.trim();
  const description = document.querySelector("#assignment-description").value.trim();
  const dueDate = document.querySelector("#assignment-due-date").value;
  const filesRaw = document.querySelector("#assignment-files").value.trim();

  const files = filesRaw ? filesRaw.split("\n") : [];

  const newAssignment = {
    id: `asg_${Date.now()}`,
    title,
    description,
    dueDate,
    files
  };

  assignments.push(newAssignment);
  renderTable();
  assignmentForm.reset();
}

// Handle delete button click (event delegation)
function handleTableClick(event) {
  if (!event.target.classList.contains("delete-btn")) return;

  const id = event.target.getAttribute("data-id");

  assignments = assignments.filter(a => a.id !== id);

  renderTable();
}

// Load initial JSON and initialize the page
async function loadAndInitialize() {
  try {
    const response = await fetch("assignments.json");
    assignments = await response.json();
  } catch (e) {
    console.log("⚠ Could not load assignments.json — starting empty.");
    assignments = [];
  }

  renderTable();

  assignmentForm.addEventListener("submit", handleAddAssignment);
  assignmentsTableBody.addEventListener("click", handleTableClick);
}

// Initial load
loadAndInitialize();
