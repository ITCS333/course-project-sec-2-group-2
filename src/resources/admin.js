let resources = [];
const form = document.querySelector('#resource-form');
const tbody = document.querySelector('#resources-tbody');
const submitBtn = document.querySelector('#add-resource');

const inputId = document.querySelector('#hidden-resource-id');
const inputTitle = document.querySelector('#resource-title');
const inputDesc = document.querySelector('#resource-description');
const inputLink = document.querySelector('#resource-link');

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

function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';
  resources.forEach(res => {
    tbody.appendChild(createResourceRow(res));
  });
}

async function handleAddResource(event) {
  event.preventDefault();
  const id = inputId ? inputId.value : '';
  const title = inputTitle.value;
  const description = inputDesc.value;
  const link = inputLink.value;

  const payload = { title, description, link };
  let method = 'POST';

  if (id) {
    method = 'PUT';
    payload.id = parseInt(id);
  }

  try {
    const response = await fetch('./api/index.php', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.success) {
      if (form) form.reset();
      if (inputId) inputId.value = '';
      if (submitBtn) submitBtn.textContent = "Add Resource";
      await loadAndInitialize();
    }
  } catch (error) {
    console.error(error);
  }
}

function handleTableClick(event) {
  const id = event.target.dataset.id;
  if (!id) return;

  if (event.target.classList.contains('delete-btn')) {
    if (confirm('Are you sure you want to delete this resource?')) {
      fetch(`./api/index.php?id=${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(result => {
          if (result.success) loadAndInitialize();
        });
    }
  } else if (event.target.classList.contains('edit-btn')) {
    const resource = resources.find(r => r.id == id);
    if (resource) {
      if (inputId) inputId.value = resource.id;
      if (inputTitle) inputTitle.value = resource.title;
      if (inputDesc) inputDesc.value = resource.description || '';
      if (inputLink) inputLink.value = resource.link;
      if (submitBtn) submitBtn.textContent = "Update Resource";
    }
  }
}

async function loadAndInitialize() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();
    if (result.success) {
      resources = result.data;
      renderTable();
    }
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAndInitialize().then(() => {
    if (form) form.addEventListener('submit', handleAddResource);
    if (tbody) tbody.addEventListener('click', handleTableClick);
  });
});