/*
  Requirement: Make the "Manage Resources" page interactive.
*/

// --- Global Data Store ---
let resources = [];

// --- Element Selections ---
const form = document.querySelector('#resource-form');
const tbody = document.querySelector('#resources-tbody');
const submitBtn = document.querySelector('#add-resource');

const inputTitle = document.querySelector('#resource-title');
const inputDesc = document.querySelector('#resource-description');
const inputLink = document.querySelector('#resource-link');

// --- Functions ---

/**
 * Implement the createResourceRow function.
 */
function createResourceRow(resource) {
  const tr = document.createElement('tr');
  
  const tdTitle = document.createElement('td');
  tdTitle.textContent = resource.title;
  
  const tdDesc = document.createElement('td');
  tdDesc.textContent = resource.description || '';
  
  const tdLink = document.createElement('td');
  tdLink.textContent = resource.link;
  
  const tdActions = document.createElement('td');
  
  const editBtn = document.createElement('button');
  editBtn.className = "edit-btn";
  editBtn.setAttribute('data-id', resource.id);
  editBtn.textContent = "Edit";
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute('data-id', resource.id);
  deleteBtn.textContent = "Delete";
  
  tdActions.appendChild(editBtn);
  tdActions.appendChild(deleteBtn);
  
  tr.appendChild(tdTitle);
  tr.appendChild(tdDesc);
  tr.appendChild(tdLink);
  tr.appendChild(tdActions);
  
  return tr;
}

/**
 * Implement the renderTable function.
 */
function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';
  resources.forEach(resource => {
    tbody.appendChild(createResourceRow(resource));
  });
}

/**
 * Implement the handleAddResource function.
 */
async function handleAddResource(event) {
  event.preventDefault();
  
  const title = inputTitle.value.trim();
  const description = inputDesc.value.trim();
  const link = inputLink.value.trim();

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

/**
 * Implement the handleTableClick function.
 */
function handleTableClick(event) {
  const target = event.target;
  const id = target.getAttribute('data-id');
  if (!id) return;

  if (target.classList.contains('delete-btn')) {
    fetch(`./api/index.php?id=${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          resources = resources.filter(r => r.id !== parseInt(id));
          renderTable();
        }
      }).catch(err => console.error(err));
      
  } else if (target.classList.contains('edit-btn')) {
    const resource = resources.find(r => r.id === parseInt(id));
    if (resource) {
      if (inputTitle) inputTitle.value = resource.title;
      if (inputDesc) inputDesc.value = resource.description || '';
      if (inputLink) inputLink.value = resource.link;
      
      if (submitBtn) submitBtn.textContent = "Update Resource";
      
      // Override form listener dynamically to handle PUT submission for this edit lifecycle
      const handleEditSubmit = async (e) => {
        e.preventDefault();
        const updatedTitle = inputTitle.value.trim();
        const updatedDesc = inputDesc.value.trim();
        const updatedLink = inputLink.value.trim();

        try {
          const response = await fetch('./api/index.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(id), title: updatedTitle, description: updatedDesc, link: updatedLink })
          });
          const result = await response.json();
          if (result.success) {
            const idx = resources.findIndex(r => r.id === parseInt(id));
            if (idx !== -1) {
              resources[idx] = { id: parseInt(id), title: updatedTitle, description: updatedDesc, link: updatedLink };
            }
            renderTable();
            form.reset();
            if (submitBtn) submitBtn.textContent = "Add Resource";
            
            // Re-bind to fresh standard insert listener
            form.removeEventListener('submit', handleEditSubmit);
            form.addEventListener('submit', handleAddResource);
          }
        } catch (error) {
          console.error(error);
        }
      };
      
      form.removeEventListener('submit', handleAddResource);
      form.addEventListener('submit', handleEditSubmit);
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
loadAndInitialize();