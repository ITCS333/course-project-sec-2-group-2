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

  const nameTd = document.createElement("td");
  nameTd.textContent = user.name;
  tr.appendChild(nameTd);

  const emailTd = document.createElement("td");
  emailTd.textContent = user.email;
  tr.appendChild(emailTd);

  const adminTd = document.createElement("td");
  adminTd.textContent = user.is_admin === 1 ? "Yes" : "No";
  tr.appendChild(adminTd);

  const editTd = document.createElement("td");
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.classList.add("edit-btn");
  editBtn.dataset.id = user.id;
  editTd.appendChild(editBtn);
  tr.appendChild(editTd);

  const deleteTd = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.classList.add("delete-btn");
  deleteBtn.dataset.id = user.id;
  deleteTd.appendChild(deleteBtn);
  tr.appendChild(deleteTd);

  return tr;
}

function renderTable(userArray) {
  userTableBody.innerHTML = "";
  userArray.forEach(user => {
    const row = createUserRow(user);
    userTableBody.appendChild(row);
  });
}

function handleChangePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("current-password").value.trim();
  const newPassword = document.getElementById("new-password").value.trim();
  const confirmPassword = document.getElementById("confirm-password").value.trim();

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  fetch("../api/index.php?action=change_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: 1,
      current_password: currentPassword,
      new_password: newPassword
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Password updated successfully!");
document.getElementById("current-password").value = "";
document.getElementById("new-password").value = "";
document.getElementById("confirm-password").value = "";
      } else {
        alert(data.message);
      }
    })
    .catch(error => {
      alert("Network error: " + error.message);
    });
}

function handleAddUser(event) {
  event.preventDefault();

  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const password = document.getElementById("default-password").value.trim();
  const is_admin = document.getElementById("is-admin").value;

  if (!name || !email || !password) {
    alert("Please fill out all required fields.");
    return;
  }

  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  fetch("../api/index.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, is_admin })
  })
    .then(response => {
      if (response.status === 201) {
        return loadUsersAndInitialize().then(() => {
          addUserForm.reset();
        });
      } else {
        return response.json().then(data => {
          alert(data.message);
        });
      }
    })
    .catch(error => {
      alert("Network error: " + error.message);
    });
}

function handleTableClick(event) {
  const id = event.target.dataset.id;

  if (event.target.classList.contains("delete-btn")) {
    fetch(`../api/index.php?id=${id}`, {
      method: "DELETE"
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          users = users.filter(u => u.id != id);
          renderTable(users);
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        alert("Network error: " + error.message);
      });
  }

  if (event.target.classList.contains("edit-btn")) {
    alert("Edit feature optional - not implemented");
  }
}

function handleSearch(event) {
  const term = event.target.value.toLowerCase();

  if (!term) {
    renderTable(users);
    return;
  }

  const filtered = users.filter(user =>
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term)
  );

  renderTable(filtered);
}

function handleSort(event) {
  const index = event.currentTarget.cellIndex;

  let key = "";
  if (index === 0) key = "name";
  if (index === 1) key = "email";
  if (index === 2) key = "is_admin";

  const currentDir = event.currentTarget.dataset.sortDir || "asc";
  const newDir = currentDir === "asc" ? "desc" : "asc";
  event.currentTarget.dataset.sortDir = newDir;

  users.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (key === "name" || key === "email") {
      return newDir === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return newDir === "asc"
        ? valA - valB
        : valB - valA;
    }
  });

  renderTable(users);
}

async function loadUsersAndInitialize() {
  try {
    const response = await fetch("../api/index.php");

    if (!response.ok) {
      alert("Error loading users");
      return;
    }

    const data = await response.json();

    if (!data.success) {
      alert("Failed to load users");
      return;
    }

    users = data.data;

    renderTable(users);

    passwordForm.addEventListener("submit", handleChangePassword, { once: true });
    addUserForm.addEventListener("submit", handleAddUser, { once: true });
    userTableBody.addEventListener("click", handleTableClick, { once: true });
    searchInput.addEventListener("input", handleSearch, { once: true });
tableHeaders.forEach(th => {
  th.addEventListener("click", handleSort);
});
  } catch (error) {
    console.error(error);
    alert("Something went wrong");
  }
}

// --- Initial Page Load ---
loadUsersAndInitialize();
