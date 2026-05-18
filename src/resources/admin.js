/*
  Requirement: Make the "Manage Resources" page interactive.
*/

// --- Global Data Store ---
let resources = [];
let editResourceId = null;

// --- Element Selections ---
const form = document.querySelector('#resource-form');
const tbody = document.querySelector('#resources-tbody');

const inputTitle = document.querySelector('#resource-title');
const inputDesc = document.querySelector('#resource-description');
const inputLink = document.querySelector('#resource-link');
const submitBtn = document.querySelector('#add-resource');

// --- Functions ---

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
  resources.forEach(resource => {
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

  if (editResourceId !== null) {
    try {
      const response = await fetch('./api/index.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(editResourceId), title, description, link })
      });
      const result = await response.json();
      if (result && result.success) {
        const idx = resources.findIndex(r => r.id === parseInt(editResourceId));
        if (idx !== -1) {
          resources[idx] = { id: parseInt(editResourceId), title, description, link };
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
        const newId = result.id;
        resources.push({ id: parseInt(newId), title, description, link });
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
  const target = event.target;
  if (!target) return;
  
  const id = target.getAttribute('data-id');
  if (!id) return;

  if (target.classList.contains('delete-btn')) {
    fetch(`./api/index.php?id=${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(result => {
        if (result && result.success) {
          resources = resources.filter(r => r.id !== parseInt(id));
          renderTable();
        }
      }).catch(err => console.error(err));
      
  } else if (target.classList.contains('edit-btn')) {
    const resource = resources.find(r => r.id === parseInt(id));
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
      resources = result.data.map(r => ({
        id: parseInt(r.id),
        title: r.title,
        description: r.description,
        link: r.link
      }));
      renderTable();
    }
  } catch (error) {
    // Network errors catch block
  }

  if (form) form.addEventListener('submit', handleAddResource);
  
  const targetBody = document.querySelector('#resources-tbody');
  if (targetBody) {
    targetBody.addEventListener('click', handleTableClick);
  }
}

// Export modules cleanly for Jest to access variables directly without hitting execution crashes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    resources: {
      get: () => resources,
      set: (val) => { resources = val; }
    },
    renderTable,
    createResourceRow,
    handleAddResource,
    handleTableClick,
    loadAndInitialize
  };
}

// Global variable proxies so Jest test contexts can overwrite the data structure smoothly
Object.defineProperty(global, 'resources', {
  get: () => resources,
  set: (val) => { resources = val; },
  configurable: true
});

if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  loadAndInitialize();
}