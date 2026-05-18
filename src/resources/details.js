let currentResourceId = null;
let currentComments = [];

const titleEl = document.querySelector('#resource-title');
const descEl = document.querySelector('#resource-description');
const linkEl = document.querySelector('#resource-link');
const commentListEl = document.querySelector('#comment-list');
const commentForm = document.querySelector('#comment-form');
const commentInput = document.querySelector('#new-comment');

function getResourceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function renderResourceDetails(resource) {
  if (titleEl) titleEl.textContent = resource.title;
  if (descEl) descEl.textContent = resource.description || '';
  if (linkEl) linkEl.href = resource.link;
}

function renderComments() {
  if (!commentListEl) return;
  commentListEl.innerHTML = '';
  currentComments.forEach(c => {
    const article = document.createElement('article');
    article.className = "border-start border-4 border-primary p-3 mb-2 bg-white shadow-sm";
    article.innerHTML = `
      <p class="mb-1">${c.text || c.comment_text || ''}</p>
      <footer class="text-muted small">Posted by: ${c.author || 'Anonymous'}</footer>
    `;
    commentListEl.appendChild(article);
  });
}

async function handleAddComment(e) {
  e.preventDefault();
  const commentText = commentInput.value;
  try {
    const res = await fetch(`./api/index.php?action=comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resource_id: parseInt(currentResourceId), 
        author: 'Anonymous',
        text: commentText 
      })
    });
    const result = await res.json();
    if (result.success) {
      // API can return either structural format
      const newComment = result.data || { text: commentText, author: 'Anonymous' };
      currentComments.push(newComment);
      renderComments();
      commentInput.value = '';
    }
  } catch (error) { 
    console.error(error); 
  }
}

async function initializePage() {
  currentResourceId = getResourceIdFromURL();
  if (!currentResourceId) return;

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
    }
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', initializePage);