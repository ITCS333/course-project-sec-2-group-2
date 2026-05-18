/*
  Requirement: Make the "Manage Resources" page interactive.
*/

// --- Global Data Store ---
if (typeof window !== 'undefined' && !window.resources) { window.resources = []; }
if (typeof global !== 'undefined' && !global.resources) { global.resources = []; }

// Element Selections
const form = document.querySelector('#resource-form');
const tbody = document.querySelector('#resources-tbody');

const inputTitle = document.querySelector('#resource-title');
const inputDesc = document.querySelector('#resource-description');
const inputLink = document.querySelector('#resource-link');
const submitBtn = document.querySelector('#add-resource');

let editResourceId = null;

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
  
  targetBody.innerHTML = '';
  
  // Directly read from whatever global scope Jest or the browser populated
  let activeResources = [];
  if (typeof window !== 'undefined' && Array.isArray(window.resources)) {
    activeResources = window.resources;
  } else if (typeof global !== 'undefined' && Array.isArray(global.resources)) {
    activeResources = global.resources;
  }

  activeResources.forEach(resource => {
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

  let activeResources = typeof window !== 'undefined' && Array.isArray(window.resources) ? window.resources : (typeof global !== 'undefined' && Array.isArray(global.resources) ? global.resources : []);

  if (editResourceId !== null) {
    try {
      const response = await fetch('./api/index.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(editResourceId), title, description, link })
      });
      const result = await response.json();
      if (result && result.success) {
        const idx = activeResources.findIndex(r => r.id === parseInt(editResourceId));
        if (idx !== -1) {
          activeResources[idx] = { id: parseInt(editResourceId), title, description, link };
        }
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
        activeResources.push({ id: parseInt(newId), title, description, link });
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

  let activeResources = typeof window !== 'undefined' && Array.isArray(window.resources) ? window.resources : (typeof global !== 'undefined' && Array.isArray(global.resources) ? global.resources : []);

  if (target.classList.contains('delete-btn')) {
    fetch(`./api/index.php?id=${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(result => {
        if (result && result.success) {
          const targetId = parseInt(id);
          if (typeof window !== 'undefined' && Array.isArray(window.resources)) {
            window.resources = window.resources.filter(r => r.id !== targetId);
          }
          if (typeof global !== 'undefined' && Array.isArray(global.resources)) {
            global.resources = global.resources.filter(r => r.id !== targetId);
          }
          renderTable();
        }
      }).catch(err => console.error(err));
      
  } else if (target.classList.contains('edit-btn')) {
    const resource = activeResources.find(r => r.id === parseInt(id));
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
      const parsed = result.data.map(r => ({
        id: parseInt(r.id),
        title: r.title,
        description: r.description,
        link: r.link
      }));
      if (typeof window !== 'undefined') window.resources = parsed;
      if (typeof global !== 'undefined') global.resources = parsed;
      renderTable();
    }
  } catch (error) {
    // Graceful catch block
  }

  if (form) form.addEventListener('submit', handleAddResource);
  
  const targetBody = document.querySelector('#resources-tbody');
  if (targetBody) {
    targetBody.addEventListener('click', handleTableClick);
  }
}

// Support explicit exposure across environments
if (typeof window !== 'undefined') { window.renderTable = renderTable; window.handleTableClick = handleTableClick; window.handleAddResource = handleAddResource; }
if (typeof global !== 'undefined') { global.renderTable = renderTable; global.handleTableClick = handleTableClick; global.handleAddResource = handleAddResource; }

if (typeof process === 'undefined' || !process.env || process.env.NODE_ENV !== 'test') {
  loadAndInitialize();
}