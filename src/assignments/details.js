/*
Requirement: Populate the assignment detail page and discussion forum.
*/
// --- Global Variables ---
let currentAssignmentId = null;
let currentComments = [];

// --- Element Selections ---
const assignmentTitle = document.querySelector("#assignment-title");
const assignmentDueDate = document.querySelector("#assignment-due-date");
const assignmentDescription = document.querySelector("#assignment-description");
const assignmentFilesList = document.querySelector("#assignment-files-list");

const commentList = document.querySelector("#comment-list");
const commentForm = document.querySelector("#comment-form");
const newCommentText = document.querySelector("#new-comment-text");

// --- Functions ---

// Extract ?id=something from URL
function getAssignmentIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Render assignment details
function renderAssignmentDetails(assignment) {
  assignmentTitle.textContent = assignment.title;
  assignmentDueDate.textContent = "Due: " + assignment.dueDate;
  assignmentDescription.textContent = assignment.description;

  assignmentFilesList.innerHTML = "";
  assignment.files.forEach(file => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="#">${file}</a>`;
    assignmentFilesList.appendChild(li);
  });
}

// Build a comment <article>
function createCommentArticle(comment) {
  const article = document.createElement("article");

  const p = document.createElement("p");
  p.textContent = comment.text;

  const footer = document.createElement("footer");
  footer.textContent = "Posted by: " + comment.author;

  article.appendChild(p);
  article.appendChild(footer);

  return article;
}

// Render all comments
function renderComments() {
  commentList.innerHTML = "";

  currentComments.forEach(comment => {
    const article = createCommentArticle(comment);
    commentList.appendChild(article);
  });
}

// Handle adding a new comment
function handleAddComment(event) {
  event.preventDefault();

  const text = newCommentText.value.trim();
  if (!text) return;

  const comment = {
    author: "Student",
    text: text
  };

  currentComments.push(comment);

  renderComments();
  newCommentText.value = "";
}

// Initialize page content
async function initializePage() {
  currentAssignmentId = getAssignmentIdFromURL();

  if (!currentAssignmentId) {
    assignmentTitle.textContent = "Error: No assignment ID found.";
    return;
  }

  try {
    const [assignResp, commentsResp] = await Promise.all([
      fetch("assignments.json"),
      fetch("comments.json")
    ]);

    const assignments = await assignResp.json();
    const commentsData = await commentsResp.json();

    const assignment = assignments.find(a => a.id === currentAssignmentId);
    currentComments = commentsData[currentAssignmentId] || [];

    if (!assignment) {
      assignmentTitle.textContent = "Error: Assignment not found.";
      return;
    }

    renderAssignmentDetails(assignment);
    renderComments();

    commentForm.addEventListener("submit", handleAddComment);

  } catch (error) {
    assignmentTitle.textContent = "Error loading assignment data.";
    console.error(error);
  }
}

// --- Start Page ---
initializePage();
