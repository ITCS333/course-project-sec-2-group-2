/*
  Requirement: Make the "Manage Resources" page interactive.
*/

// --- Global Data Store ---
let resources = [];
let isEditMode = false;
let editResourceId = null;

// --- Element Selections ---
const form = document.querySelector('#resource-form');
const tbody = document.querySelector('#resources-tbody');
const submitBtn = document.querySelector('#add-resource');

const inputTitle = document.querySelector('#resource-title');
const inputDesc = document.querySelector('#resource-description');
const inputLink = document.querySelector('#resource-link');

// --- Functions ---

/**
 * Generates a resource row element.
 */
function createResourceRow(resource) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${resource.title}</td>
    <td>${resource.description || ''}</td>
    <td><a href="${resource.link}" target="_blank">${resource.link}</a></td>
    <td>
      <button class="btn btn-sm btn-info edit-btn" data-id="${resource.id}">Edit</button>
      <button class="btn btn-sm btn-danger delete-btn" data-id="${resource.id}">Delete</button>
    </td>
  `;
  return tr;
}

/**
 * Renders the collection array to table layout.
 */
function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';
  resources.forEach(resource => {
    tbody.appendChild(createResourceRow(resource));
  });
}

/**
 * Handles adding or updating a resource.
 */
async function handleAddResource(event) {
  event.preventDefault();
  
  const title = inputTitle.value.trim();
  const description = inputDesc.value.trim();
  const link = inputLink.value.trim();

  if (isEditMode) {
    // Mode: Update Resource (PUT)
    try {
      const response = await fetch('./api/index.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(editResourceId), title, description, link })
      });
      const result = await response.json();
      if (result.success) {
        const index = resources.findIndex(r => r.id === parseInt(editResourceId));
        if (index !== -1) {
          resources[index] = { id: parseInt(editResourceId), title, description, link };
        }
        renderTable();
        form.reset();
        isEditMode = false;
        editResourceId = null;
        if (submitBtn) submitBtn.textContent = "Add Resource";
      }
    } catch (error) {
      console.error(error);
    }
  } else {
    // Mode: Add Resource (POST)
    try {
      const response = await fetch('./api/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, link })
      });
      const result = await response.json();
      if (result.success) {
        const newId = result.id;
        resources.push({ id: parseInt(newId), title, description, link });
        renderTable();
        form.reset();
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Handles table delegation click paths (Edit/Delete).
 */
function handleTableClick(event) {
  const target = event.target;
  const id = target.dataset.id;
  if (!id) return;

  if (target.classList.contains('delete-btn')) {
    if (confirm('Are you sure you want to delete this resource?')) {
      fetch(`./api/index.php?id=${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            resources = resources.filter(r => r.id !== parseInt(id));
            renderTable();
          }
        }).catch(err => console.error(err));
    }
  } else if (target.classList.contains('edit-btn')) {
    const resource = resources.find(r => r.id === parseInt(id));
    if (resource) {
      isEditMode = true;
      editResourceId = id;
      
      if (inputTitle) inputTitle.value = resource.title;
      if (inputDesc) inputDesc.value = resource.description || '';
      if (inputLink) inputLink.value = resource.link;
      
      if (submitBtn) submitBtn.textContent = "Update Resource";
    }
  }
}

/**
 * Mounts operational workflows on startup.
 */
async function loadAndInitialize() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();
    if (result.success) {
      resources = result.data.map(r => ({
        id: parseInt(r.id),
        title: r.title,
        description: r.description,
        link: r.link
      }));
      renderTable();
    }
  } catch (error) {
    console.error(error);
  }

  if (form) form.addEventListener('submit', handleAddResource);
  if (tbody) tbody.addEventListener('click', handleTableClick);
}

// --- Initial Page Load ---
document.addEventListener('DOMContentLoaded', loadAndInitialize);