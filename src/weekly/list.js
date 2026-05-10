// --- Element Selections ---
// TODO: Select the section for the week list using its id 'week-list-section'.
const weekListSection = document.getElementById('week-list-section');

// --- Functions ---

/**
 * TODO: Implement createWeekArticle.

 */
function createWeekArticle(week) {
    
    const article = document.createElement('article');
    article.innerHTML = `
        <h2>${week.title}</h2>
        <p>Starts on: ${week.start_date}</p>
        <p>${week.description}</p>
        <a href="details.html?id=${week.id}">View Details & Discussion</a>
    `;

    return article;
}

/**
 * TODO: Implement loadWeeks (async).
 * 
 * جلب البيانات من API وعرضها في الصفحة
 */
async function loadWeeks() {
    try {
      
        const response = await fetch('./api/index.php');
        const result = await response.json();

      
        if (result.success) {
            weekListSection.innerHTML = "";

      
            result.data.forEach(week => {
                
                const weekArticle = createWeekArticle(week);
                weekListSection.appendChild(weekArticle);
            });
        } else {
            weekListSection.innerHTML = "<p>Failed to load course breakdown.</p>";
        }
    } catch (error) {
        console.error("Error fetching weeks:", error);
        weekListSection.innerHTML = "<p>An error occurred while loading the data.</p>";
    }
}

loadWeeks();