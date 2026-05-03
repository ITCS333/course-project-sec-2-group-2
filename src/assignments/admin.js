// --- Global Data Store ---
let assignments = [];

// --- Element Selections ---
const assignmentForm = document.getElementById('assignment-form');
const assignmentsTbody = document.getElementById('assignments-tbody');
const submitBtn = document.getElementById('add-assignment');

// --- Functions ---

/**
 * Creates a table row for a single assignment.
 */
function createAssignmentRow(assignment) {
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>${assignment.title}</td>
    <td>${assignment.due_date}</td>
    <td>${assignment.description}</td>
    <td>
      <button class="edit-btn" data-id="${assignment.id}">Edit</button>
      <button class="delete-btn" data-id="${assignment.id}">Delete</button>
    </td>
  `;

  return tr;
}

/**
 * Clears and repopulates the assignments table.
 */
function renderTable() {
  assignmentsTbody.innerHTML = "";
  assignments.forEach(assignment => {
    const row = createAssignmentRow(assignment);
    assignmentsTbody.appendChild(row);
  });
}

/**
 * Handles form submission for both adding and updating assignments.
 */
async function handleAddAssignment(event) {
  event.preventDefault();

  const title = document.getElementById('assignment-title').value;
  const due_date = document.getElementById('assignment-due-date').value;
  const description = document.getElementById('assignment-description').value;
  const filesRaw = document.getElementById('assignment-files').value;
  
  // Split by newline and filter out empty strings
  const files = filesRaw.split('\n').map(f => f.trim()).filter(f => f !== "");

  const editId = submitBtn.getAttribute('data-edit-id');

  if (editId) {
    // Update Mode
    await handleUpdateAssignment(parseInt(editId), { title, due_date, description, files });
  } else {
    // Add Mode
    try {
      const response = await fetch('./api/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date, description, files })
      });
      const result = await response.json();

      if (result.success) {
        // Add new assignment to global store with returned ID
        assignments.push({ id: result.id, title, due_date, description, files });
        renderTable();
        assignmentForm.reset();
      }
    } catch (error) {
      console.error("Error adding assignment:", error);
    }
  }
}

/**
 * Sends a PUT request to update an existing assignment.
 */
async function handleUpdateAssignment(id, fields) {
  try {
    const response = await fetch('./api/index.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields })
    });
    const result = await response.json();

    if (result.success) {
      // Update entry in local array
      const index = assignments.findIndex(a => a.id === id);
      if (index !== -1) {
        assignments[index] = { id, ...fields };
      }

      renderTable();
      assignmentForm.reset();
      
      // Restore button state
      submitBtn.textContent = "Add Assignment";
      submitBtn.removeAttribute('data-edit-id');
    }
  } catch (error) {
    console.error("Error updating assignment:", error);
  }
}

/**
 * Handles clicks on the table body (Edit and Delete buttons).
 */
async function handleTableClick(event) {
  const id = parseInt(event.target.dataset.id);
  if (!id) return;

  if (event.target.classList.contains('delete-btn')) {
    // DELETE Logic
    try {
      const response = await fetch(`./api/index.php?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        assignments = assignments.filter(a => a.id !== id);
        renderTable();
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  } 
  
  else if (event.target.classList.contains('edit-btn')) {
    // EDIT Logic: Populate form
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      document.getElementById('assignment-title').value = assignment.title;
      document.getElementById('assignment-due-date').value = assignment.due_date;
      document.getElementById('assignment-description').value = assignment.description;
      document.getElementById('assignment-files').value = assignment.files.join('\n');

      submitBtn.textContent = "Update Assignment";
      submitBtn.setAttribute('data-edit-id', id);
    }
  }
}

/**
 * Fetches initial data and sets up event listeners.
 */
async function loadAndInitialize() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();

    if (result.success) {
      assignments = result.data;
      renderTable();
    }
  } catch (error) {
    console.error("Error loading assignments:", error);
  }

  // Attach Event Listeners
  assignmentForm.addEventListener('submit', handleAddAssignment);
  assignmentsTbody.addEventListener('click', handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();
