/*
  Requirement: Populate the "Course Resources" list page.
*/

// --- Element Selections ---
// Select the section for the resource list ('#resource-list-section').
const resourceListSection = document.querySelector('#resource-list-section');

// --- Functions ---

/**
 * Implement the createResourceArticle function.
 */
function createResourceArticle(resource) {
  const article = document.createElement('article');
  
  article.innerHTML = `
    <h2>${resource.title}</h2>
    <p>${resource.description || ''}</p>
    <a href="details.html?id=${resource.id}">View Resource & Discussion</a>
  `;
  return article;
}

/**
 * Implement the loadResources function.
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
// Call the function to populate the page immediately (without wrapping inside event listeners)
loadResources();