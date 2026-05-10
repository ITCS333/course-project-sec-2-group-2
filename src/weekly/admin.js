/*
  Requirement: Make the "Manage Weekly Breakdown" page interactive.

  Instructions:
  1. This file is already linked to `admin.html` via:
         <script src="admin.js" defer></script>

  2. In `admin.html`:
     - The form has id="week-form".
     - The submit button has id="add-week".
     - The <tbody> has id="weeks-tbody".
     - Columns rendered per row: Week Title | Start Date | Description | Actions.

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  All requests and responses use JSON.
  Successful list response shape: { success: true, data: [ ...week objects ] }
  Each week object shape:
    {
      id:          number,   // integer primary key from the weeks table
      title:       string,
      start_date:  string,   // "YYYY-MM-DD"
      description: string,
      links:       string[]  // decoded array of URL strings
    }
*/

// --- Global Data Store ---
// Holds the weeks currently displayed in the table.
let weeks = [];

// --- Element Selections ---
const weekForm = document.getElementById('week-form');
const weeksTbody = document.getElementById('weeks-tbody');

// --- Functions ---

function createWeekRow(week) {
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>${week.title}</td>
    <td>${week.start_date}</td>
    <td>${week.description}</td>
    <td>
      <button class="edit-btn" data-id="${week.id}">Edit</button>
      <button class="delete-btn" data-id="${week.id}">Delete</button>
    </td>
  `;

  return tr;
}

function renderTable() {
  weeksTbody.innerHTML = '';

  weeks.forEach(week => {
    const row = createWeekRow(week);
    weeksTbody.appendChild(row);
  });
}
async function handleAddWeek(event) {
  event.preventDefault();

  const title = document.getElementById('week-title').value;
  const start_date = document.getElementById('week-start-date').value;
  const description = document.getElementById('week-description').value;
  const links = document
    .getElementById('week-links')
    .value
    .split('\n')
    .filter(link => link.trim() !== '');

  const submitBtn = document.getElementById('add-week');
  const editId = submitBtn.dataset.editId;

  if (editId) {
    await handleUpdateWeek(editId, { title, start_date, description, links });
    return;
  }

  const response = await fetch('./api/index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, start_date, description, links })
  });

  const result = await response.json();

  if (result.success) {
    weeks.push({
      id: result.id,
      title,
      start_date,
      description,
      links
    });

    renderTable();
    weekForm.reset();
  }
}

async function handleAddWeek(event) {
  event.preventDefault();

  const title = document.getElementById('week-title').value;
  const start_date = document.getElementById('week-start-date').value;
  const description = document.getElementById('week-description').value;
  const links = document
    .getElementById('week-links')
    .value
    .split('\n')
    .filter(link => link.trim() !== '');

  const submitBtn = document.getElementById('add-week');
  const editId = submitBtn.dataset.editId;

  if (editId) {
    await handleUpdateWeek(editId, { title, start_date, description, links });
    return;
  }

  const response = await fetch('./api/index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, start_date, description, links })
  });

  const result = await response.json();

  if (result.success) {
    weeks.push({
      id: result.id,
      title,
      start_date,
      description,
      links
    });

    renderTable();
    weekForm.reset();
  }
}

async function handleUpdateWeek(id, fields) {
  const response = await fetch('./api/index.php', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, ...fields })
  });

  const result = await response.json();

  if (result.success) {
    const index = weeks.findIndex(w => w.id == id);

    if (index !== -1) {
      weeks[index] = { id: Number(id), ...fields };
    }

    renderTable();
    weekForm.reset();

    const submitBtn = document.getElementById('add-week');
    submitBtn.textContent = 'Add Week';
    delete submitBtn.dataset.editId;
  }
}

async function handleTableClick(event) {
  const target = event.target;

  if (target.classList.contains('delete-btn')) {
    const id = target.dataset.id;

    const response = await fetch(`./api/index.php?id=${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      weeks = weeks.filter(w => w.id != id);
      renderTable();
    }
  }

  if (target.classList.contains('edit-btn')) {
    const id = target.dataset.id;
    const week = weeks.find(w => w.id == id);

    if (!week) return;

    document.getElementById('week-title').value = week.title;
    document.getElementById('week-start-date').value = week.start_date;
    document.getElementById('week-description').value = week.description;
    document.getElementById('week-links').value = week.links.join('\n');

    const submitBtn = document.getElementById('add-week');
    submitBtn.textContent = 'Update Week';
    submitBtn.dataset.editId = id;
  }
}

async function loadAndInitialize() {
  const response = await fetch('./api/index.php');
  const result = await response.json();

  if (result.success) {
    weeks = result.data;
    renderTable();
  }

  weekForm.addEventListener('submit', handleAddWeek);
  weeksTbody.addEventListener('click', handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();
