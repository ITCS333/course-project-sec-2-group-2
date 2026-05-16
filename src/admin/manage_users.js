// --- Global Data Store ---
let users = [];

// --- Element Selections ---
const userTableBody = document.getElementById("user-table-body");
const addUserForm = document.getElementById("add-user-form");
const passwordForm = document.getElementById("password-form");
const searchInput = document.getElementById("search-input");
const tableHeaders = document.querySelectorAll("#user-table thead th");

// --- Functions ---
function createUserRow(user) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.is_admin == 1 ? "Yes" : "No"}</td>
        <td>
            <button class="edit-btn" data-id="${user.id}">Edit</button>
            <button class="delete-btn" data-id="${user.id}">Delete</button>
        </td>
    `;

    return tr;
}

function renderTable(userArray) {
    userTableBody.innerHTML = "";
    userArray.forEach(user => {
        userTableBody.appendChild(createUserRow(user));
    });
}

function handleChangePassword(event) {
  event.preventDefault();

  const currentPasswordInput = document.getElementById("current-password");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  const currentPassword = currentPasswordInput.value.trim();
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  const id = window.adminId;

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  currentPasswordInput.value = "";
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";

  fetch("api/index.php?action=change_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: id,
      current_password: currentPassword,
      new_password: newPassword
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Password updated successfully!");
      } else {
        alert(data.message || "An error occurred while updating the password.");
      }
    })
    .catch(error => {
      alert("Error: " + error.message);
    });
}

async function handleAddUser(event) {
    event.preventDefault();

    const name = document.getElementById("user-name").value;
    const email = document.getElementById("user-email").value;
    const password = document.getElementById("default-password").value;
    const is_admin = document.getElementById("is-admin").checked ? 1 : 0;

    if (!name || !email || !password) {
        alert("Please fill out all required fields.");
        return;
    }

    if (password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
    }

    const res = await fetch("api/index.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, is_admin })
    });

    if (res.status === 201) {
        loadUsersAndInitialize();
        addUserForm.reset();
    } else {
        const data = await res.json();
        alert(data.message);
    }
}

async function handleTableClick(event) {
    const id = event.target.dataset.id;

    if (event.target.classList.contains("delete-btn")) {
        const res = await fetch("api/index.php?id=" + id, {
            method: "DELETE"
        });

        if (res.ok) {
            users = users.filter(u => u.id != id);
            renderTable(users);
        }
    }
}

function handleSearch() {
    const term = searchInput.value.toLowerCase();

    if (!term) {
        renderTable(users);
        return;
    }

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );

    renderTable(filtered);
}

function handleSort(event) {
    const index = event.currentTarget.cellIndex;
    const dir = event.currentTarget.dataset.dir === "asc" ? "desc" : "asc";
    event.currentTarget.dataset.dir = dir;

    const keys = ["name", "email", "is_admin"];
    const key = keys[index];

    users.sort((a, b) => {
        if (key === "is_admin") {
            return dir === "asc" ? a[key] - b[key] : b[key] - a[key];
        }
        return dir === "asc"
            ? a[key].localeCompare(b[key])
            : b[key].localeCompare(a[key]);
    });

    renderTable(users);
}

async function loadUsersAndInitialize() {
    const res = await fetch("api/index.php");
    const data = await res.json();

    users = data.data;
    renderTable(users);

    addUserForm.addEventListener("submit", handleAddUser);
    passwordForm.addEventListener("submit", handleChangePassword);
    userTableBody.addEventListener("click", handleTableClick);
    searchInput.addEventListener("input", handleSearch);

    tableHeaders.forEach(th => {
        th.addEventListener("click", handleSort);
    });
}
// --- Initial Page Load ---
loadUsersAndInitialize();
