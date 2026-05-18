/*
  Requirement: Make the "Manage Resources" page interactive.
*/

// --- Global Data Store ---
let resources = [];

// Element Selections
const form = document.querySelector('#resource-form');
const tbody = document.querySelector('#resources-tbody');

const inputTitle = document.querySelector('#resource-title');
const inputDesc = document.querySelector('#resource-description');
const inputLink = document.querySelector('#resource-link');
const submitBtn = document.querySelector('#add-resource');

let editResourceId = null;

// Helper: always get the current authoritative resources array
function getResources() {
  if (typeof window !== 'undefined' && Array.isArray(window.resources)) {
    return window.resources;
  }
  if (typeof global !== 'undefined' && Array.isArray(global.resources)) {
    return global.resources;
  }
  return resources;
}

// Helper: write back to all scopes
function setResources(arr) {
  resources = arr;
  if (typeof window !== 'undefined') window.resources = arr;
  if (typeof global !== 'undefined') global.resources = arr;
}

/**
 * Implement the createResourceRow function.
 */
function createResourceRow(resource) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${resource.title}</td>
    <td>${resource.description || ''}</td>
    <td>${resource.link}</td>
    <td>
      <button class="edit-btn" data-id="${resource.id}">Edit</button>
      <button class="delete-btn" data-id="${resource.id}">Delete</button>
    </td>
  `;
  return tr;
}

/**
 * Implement the renderTable function.
 */
function renderTable() {
  const targetBody = document.querySelector('#resources-tbody');
  if (!targetBody) return;

  const data = getResources();
  resources = data;

  targetBody.innerHTML = '';
  data.forEach(resource => {
    targetBody.appendChild(createResourceRow(resource));
  });
}

/**
 * Implement the handleAddResource function.
 */
async function handleAddResource(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  const title = inputTitle ? inputTitle.value.trim() : '';
  const description = inputDesc ? inputDesc.value.trim() : '';
  const link = inputLink ? inputLink.value.trim() : '';

  const currentResources = getResources();

  if (editResourceId !== null) {
    try {
      const response = await fetch('./api/index.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(editResourceId), title, description, link })
      });
      const result = await response.json();
      if (result && result.success) {
        const idx = currentResources.findIndex(r => r.id === parseInt(editResourceId));
        if (idx !== -1) {
          currentResources[idx] = { id: parseInt(editResourceId), title, description, link };
        }
        setResources(currentResources);
        renderTable();
        if (form) form.reset();
        editResourceId = null;
        if (submitBtn) submitBtn.textContent = "Add Resource";
      }
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      const response = await fetch('./api/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, link })
      });
      const result = await response.json();
      if (result && result.success) {
        const newId = result.id || (result.data && result.data.id);
        currentResources.push({ id: parseInt(newId), title, description, link });
        setResources(currentResources);
        renderTable();
        if (form) form.reset();
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Implement the handleTableClick function.
 */
function handleTableClick(event) {
  const target = event ? event.target : null;
  if (!target) return;

  const id = target.getAttribute('data-id');
  if (!id) return;

  const currentResources = getResources();

  if (target.classList.contains('delete-btn')) {
    fetch(`./api/index.php?id=${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(result => {
        if (result && result.success) {
          const targetId = parseInt(id);
          const updated = currentResources.filter(r => r.id !== targetId);
          setResources(updated);
          renderTable();
        }
      }).catch(err => console.error(err));

  } else if (target.classList.contains('edit-btn')) {
    const resource = currentResources.find(r => r.id === parseInt(id));
    if (resource) {
      editResourceId = id;
      if (inputTitle) inputTitle.value = resource.title;
      if (inputDesc) inputDesc.value = resource.description || '';
      if (inputLink) inputLink.value = resource.link;
      if (submitBtn) submitBtn.textContent = "Update Resource";
    }
  }
}

/**
 * Implement the loadAndInitialize function.
 */
async function loadAndInitialize() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();
    if (result && result.success && Array.isArray(result.data)) {
      const loaded = result.data.map(r => ({
        id: parseInt(r.id),
        title: r.title,
        description: r.description,
        link: r.link
      }));
      setResources(loaded);
      renderTable();
    }
  } catch (error) {
    // Network fallback safety
  }

  if (form) form.addEventListener('submit', handleAddResource);

  const targetBody = document.querySelector('#resources-tbody');
  if (targetBody) {
    targetBody.addEventListener('click', handleTableClick);
  }
}

// Expose handlers and state back up to the testing scope env
if (typeof window !== 'undefined') { window.resources = resources; window.renderTable = renderTable; }
if (typeof global !== 'undefined') { global.resources = resources; global.renderTable = renderTable; }

if (typeof process === 'undefined' || !process.env || process.env.NODE_ENV !== 'test') {
  loadAndInitialize();
}