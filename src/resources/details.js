/*
  Requirement: Populate the resource detail page and discussion forum.
*/

// --- Global Data Store ---
let currentResourceId = null;
let currentComments = [];

// --- Element Selections ---
const titleEl = document.querySelector('#resource-title');
const descEl = document.querySelector('#resource-description');
const linkEl = document.querySelector('#resource-link');
const commentListEl = document.querySelector('#comment-list');
const commentForm = document.querySelector('#comment-form');
const commentInput = document.querySelector('#new-comment');

// --- Functions ---

/**
 * Gets the resource ID from the URL query string.
 */
function getResourceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Renders the primary resource data.
 */
function renderResourceDetails(resource) {
  if (titleEl) titleEl.textContent = resource.title;
  if (descEl) descEl.textContent = resource.description || '';
  if (linkEl) linkEl.href = resource.link;
}

/**
 * Creates a single comment article element.
 */
function createCommentArticle(comment) {
  const article = document.createElement('article');
  article.className = "border-start border-4 border-primary p-3 mb-2 bg-white shadow-sm";
  
  const text = comment.text || comment.comment_text || '';
  const author = comment.author || 'Student';
  
  article.innerHTML = `
    <p class="mb-1">${text}</p>
    <footer class="text-muted small">Posted by: ${author}</footer>
  `;
  return article;
}

/**
 * Clears and redraws the comment wall.
 */
function renderComments() {
  if (!commentListEl) return;
  commentListEl.innerHTML = '';
  currentComments.forEach(comment => {
    commentListEl.appendChild(createCommentArticle(comment));
  });
}

/**
 * Handles posting a new comment.
 */
async function handleAddComment(event) {
  event.preventDefault();
  const commentText = commentInput.value.trim();
  if (!commentText) return;

  try {
    const res = await fetch('./api/index.php?action=comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource_id: parseInt(currentResourceId),
        author: 'Student',
        text: commentText
      })
    });
    const result = await res.json();
    if (result.success) {
      // Push response data or construct locally fallback
      const newComment = result.data || { 
        resource_id: parseInt(currentResourceId), 
        author: 'Student', 
        text: commentText 
      };
      currentComments.push(newComment);
      renderComments();
      commentForm.reset();
    }
  } catch (error) { 
    console.error(error); 
  }
}

/**
 * Initial page loading workflow.
 */
async function initializePage() {
  currentResourceId = getResourceIdFromURL();
  if (!currentResourceId) {
    if (titleEl) titleEl.textContent = "Resource not found.";
    return;
  }

  try {
    const [resObj, commObj] = await Promise.all([
      fetch(`./api/index.php?id=${currentResourceId}`).then(r => r.json()),
      fetch(`./api/index.php?resource_id=${currentResourceId}&action=comments`).then(r => r.json())
    ]);

    if (resObj.success) {
      renderResourceDetails(resObj.data);
      currentComments = commObj.data || [];
      renderComments();
      if (commentForm) {
        commentForm.addEventListener('submit', handleAddComment);
      }
    } else {
      if (titleEl) titleEl.textContent = "Resource not found.";
    }
  } catch (error) {
    console.error(error);
    if (titleEl) titleEl.textContent = "Resource not found.";
  }
}

// --- Initial Page Load ---
document.addEventListener('DOMContentLoaded', initializePage);