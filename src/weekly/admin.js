// --- Global Data Store ---
let weeks = [];

// --- Element Selections ---
// TODO: Select the week form by id 'week-form'.
const weekForm = document.getElementById('week-form');

// TODO: Select the weeks table body by id 'weeks-tbody'.
const weeksTbody = document.getElementById('weeks-tbody');

const submitBtn = document.getElementById('add-week');

// --- Functions ---

/**
 * TODO: Implement createWeekRow.
 */
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

/**
 * TODO: Implement renderTable.
 */
function renderTable() {
    // 1. Clear the table body
    weeksTbody.innerHTML = "";

    // 2. Loop and append
    weeks.forEach(week => {
        const row = createWeekRow(week);
        weeksTbody.appendChild(row);
    });
}

/**
 * TODO: Implement handleAddWeek (async).
 */
async function handleAddWeek(event) {
    event.preventDefault();

    // Read values
    const title = document.getElementById('week-title').value;
    const start_date = document.getElementById('week-start-date').value;
    const description = document.getElementById('week-description').value;
    const linksText = document.getElementById('week-links').value;
    
    // Process links: split by newline and filter out empty strings
    const links = linksText.split('\n').map(l => l.trim()).filter(l => l !== "");

    const editId = submitBtn.getAttribute('data-edit-id');

    if (editId) {
        // Mode: Update
        await handleUpdateWeek(parseInt(editId), { title, start_date, description, links });
    } else {
        // Mode: Create (POST)
        try {
            const response = await fetch('./api/index.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, start_date, description, links })
            });
            const result = await response.json();

            if (result.success) {
                // Add new week with returned ID
                weeks.push({ id: result.id, title, start_date, description, links });
                renderTable();
                weekForm.reset();
            }
        } catch (error) {
            console.error("Error adding week:", error);
        }
    }
}

/**
 * TODO: Implement handleUpdateWeek (async).
 */
async function handleUpdateWeek(id, fields) {
    try {
        const response = await fetch('./api/index.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...fields })
        });
        const result = await response.json();

        if (result.success) {
            // Update global array
            const index = weeks.findIndex(w => w.id === id);
            if (index !== -1) {
                weeks[index] = { id, ...fields };
            }

            renderTable();
            weekForm.reset();

            // Restore button state
            submitBtn.textContent = "Add Week";
            submitBtn.removeAttribute('data-edit-id');
        }
    } catch (error) {
        console.error("Error updating week:", error);
    }
}

/**
 * TODO: Implement handleTableClick (async).
 */
async function handleTableClick(event) {
    const target = event.target;
    const id = parseInt(target.dataset.id);

    // 1. Delete Action
    if (target.classList.contains('delete-btn')) {
        if (!confirm("Are you sure you want to delete this week?")) return;

        try {
            const response = await fetch(`./api/index.php?id=${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                weeks = weeks.filter(w => w.id !== id);
                renderTable();
            }
        } catch (error) {
            console.error("Error deleting week:", error);
        }
    }

    // 2. Edit Action
    if (target.classList.contains('edit-btn')) {
        const week = weeks.find(w => w.id === id);
        if (week) {
            // Populate form
            document.getElementById('week-title').value = week.title;
            document.getElementById('week-start-date').value = week.start_date;
            document.getElementById('week-description').value = week.description;
            document.getElementById('week-links').value = week.links.join('\n');

            // Change button state
            submitBtn.textContent = "Update Week";
            submitBtn.setAttribute('data-edit-id', id);
            
            // Scroll to form
            weekForm.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

/**
 * TODO: Implement loadAndInitialize (async).
 */
async function loadAndInitialize() {
    try {
        // 1. Fetch current data
        const response = await fetch('./api/index.php');
        const result = await response.json();

        if (result.success) {
            // 2. Store in global variable
            weeks = result.data;
            // 3. Populate table
            renderTable();
        }

        // 4. Attach form submit listener
        weekForm.addEventListener('submit', handleAddWeek);

        // 5. Attach table click listener (Delegation)
        weeksTbody.addEventListener('click', handleTableClick);

    } catch (error) {
        console.error("Initialization failed:", error);
    }
}


loadAndInitialize();
