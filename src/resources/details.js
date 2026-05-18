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
 * Implement the getResourceIdFromURL function.
 */
function getResourceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Implement the renderResourceDetails function.
 */
function renderResourceDetails(resource) {
  if (titleEl) titleEl.textContent = resource.title;
  if (descEl) descEl.textContent = resource.description || '';
  if (linkEl) linkEl.href = resource.link;
}

/**
 * Implement the createCommentArticle function.
 */
function createCommentArticle(comment) {
  const article = document.createElement('article');
  
  const p = document.createElement('p');
  p.textContent = comment.text || comment.comment_text || '';
  
  const footer = document.createElement('footer');
  footer.textContent = `Posted by: ${comment.author || 'Student'}`;
  
  article.appendChild(p);
  article.appendChild(footer);
  return article;
}

/**
 * Implement the renderComments function.
 */
function renderComments() {
  if (!commentListEl) return;
  commentListEl.innerHTML = '';
  currentComments.forEach(comment => {
    commentListEl.appendChild(createCommentArticle(comment));
  });
}

/**
 * Implement the handleAddComment function.
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
        resource_id: currentResourceId,
        author: 'Student',
        text: commentText
      })
    });
    const result = await res.json();
    if (result.success) {
      const newComment = result.data || { 
        resource_id: currentResourceId, 
        author: 'Student', 
        text: commentText 
      };
      currentComments.push(newComment);
      renderComments();
      commentInput.value = '';
    }
  } catch (error) { 
    console.error(error); 
  }
}

/**
 * Implement the initializePage function.
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
initializePage();