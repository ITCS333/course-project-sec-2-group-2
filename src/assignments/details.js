// --- Global Data Store ---
let currentAssignmentId = null;
let currentComments = [];

// --- Element Selections ---
const assignmentTitle = document.getElementById('assignment-title');
const assignmentDueDate = document.getElementById('assignment-due-date');
const assignmentDescription = document.getElementById('assignment-description');
const assignmentFilesList = document.getElementById('assignment-files-list');
const commentList = document.getElementById('comment-list');
const commentForm = document.getElementById('comment-form');
const newCommentInput = document.getElementById('new-comment');

// --- Functions ---

/**
 * Reads the 'id' parameter from the URL query string.
 */
function getAssignmentIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Populates the UI with assignment metadata and file links.
 */
function renderAssignmentDetails(assignment) {
  assignmentTitle.textContent = assignment.title;
  assignmentDueDate.textContent = "Due: " + assignment.due_date;
  assignmentDescription.textContent = assignment.description;

  // Clear and populate files list
  assignmentFilesList.innerHTML = "";
  assignment.files.forEach(url => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    li.appendChild(a);
    assignmentFilesList.appendChild(li);
  });
}

/**
 * Creates the HTML structure for a single comment.
 */
function createCommentArticle(comment) {
  const article = document.createElement('article');
  article.innerHTML = `
    <p>${comment.text}</p>
    <footer>Posted by: ${comment.author}</footer>
  `;
  return article;
}

/**
 * Renders the full list of comments to the discussion section.
 */
function renderComments() {
  commentList.innerHTML = "";
  currentComments.forEach(comment => {
    const commentArticle = createCommentArticle(comment);
    commentList.appendChild(commentArticle);
  });
}

/**
 * Submits a new comment to the API and updates the UI.
 */
async function handleAddComment(event) {
  event.preventDefault();
  const commentText = newCommentInput.value.trim();

  if (!commentText) return;

  try {
    const response = await fetch('./api/index.php?action=comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: parseInt(currentAssignmentId),
        author: "Student",
        text: commentText
      })
    });

    const result = await response.json();
    if (result.success) {
      currentComments.push(result.data);
      renderComments();
      newCommentInput.value = "";
    }
  } catch (error) {
    console.error("Error posting comment:", error);
  }
}

/**
 * Loads data based on URL ID and initializes event listeners.
 */
async function initializePage() {
  currentAssignmentId = getAssignmentIdFromURL();

  if (!currentAssignmentId) {
    assignmentTitle.textContent = "Assignment not found.";
    return;
  }

  try {
    // Fetch assignment and comments in parallel
    const [assignmentRes, commentsRes] = await Promise.all([
      fetch(`./api/index.php?id=${currentAssignmentId}`),
      fetch(`./api/index.php?action=comments&assignment_id=${currentAssignmentId}`)
    ]);

    const assignmentData = await assignmentRes.json();
    const commentsData = await commentsRes.json();

    if (assignmentData.success && assignmentData.data) {
      currentComments = commentsData.success ? commentsData.data : [];
      
      renderAssignmentDetails(assignmentData.data);
      renderComments();
      
      // Attach form listener
      commentForm.addEventListener('submit', handleAddComment);
    } else {
      assignmentTitle.textContent = "Assignment not found.";
    }
  } catch (error) {
    console.error("Error initializing page:", error);
    assignmentTitle.textContent = "Error loading assignment.";
  }
}

// --- Initial Page Load ---
initializePage();

