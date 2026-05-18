/*
  Requirement: Populate the "Course Resources" list page.
*/

// --- Element Selections ---
const resourceListSection = document.querySelector('#resource-list-section');

// --- Functions ---

/**
 * Creates an article element for a resource.
 */
function createResourceArticle(resource) {
  const article = document.createElement('article');
  article.className = "card h-100 shadow-sm mb-4";
  
  article.innerHTML = `
    <div class="card-body">
      <h2 class="card-title h5">${resource.title}</h2>
      <p class="card-text text-muted">${resource.description || ''}</p>
      <a href="details.html?id=${resource.id}" class="btn btn-outline-primary">View Resource & Discussion</a>
    </div>
  `;
  return article;
}

/**
 * Fetches resources from the API and populates the list.
 */
async function loadResources() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();
    if (result.success && resourceListSection) {
      resourceListSection.innerHTML = '';
      result.data.forEach(resource => {
        resourceListSection.appendChild(createResourceArticle(resource));
      });
    }
  } catch (error) { 
    console.error("Fetch error:", error); 
  }
}

// --- Initial Page Load ---
document.addEventListener('DOMContentLoaded', loadResources);