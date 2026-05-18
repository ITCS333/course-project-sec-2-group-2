const resourceListSection = document.querySelector('#resource-list-section');

function createResourceArticle(resource) {
  const col = document.createElement('div');
  col.className = "col-md-6 col-lg-4 mb-4";
  col.innerHTML = `
    <article class="card h-100 shadow-sm">
      <div class="card-body">
        <h2 class="card-title h5">${resource.title}</h2>
        <p class="card-text text-muted">${resource.description || ''}</p>
        <a href="details.html?id=${resource.id}" class="btn btn-outline-primary">View Resource & Discussion</a>
      </div>
    </article>
  `;
  return col;
}

async function loadResources() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();
    if (result.success) {
      resourceListSection.innerHTML = '';
      result.data.forEach(resource => {
        resourceListSection.appendChild(createResourceArticle(resource));
      });
    }
  } catch (error) { 
    console.error("Fetch error:", error); 
  }
}

document.addEventListener('DOMContentLoaded', loadResources);