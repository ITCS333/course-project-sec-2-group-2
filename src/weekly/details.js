// --- Global Data Store ---
let currentWeekId = null; 
let currentComments = [];

// --- Element Selections ---
// TODO: Select each element by its id
const weekTitle = document.getElementById('week-title');
const weekStartDate = document.getElementById('week-start-date');
const weekDescription = document.getElementById('week-description');
const weekLinksList = document.getElementById('week-links-list');
const commentList = document.getElementById('comment-list');
const commentForm = document.getElementById('comment-form');
const newCommentInput = document.getElementById('new-comment');

// --- Functions ---

/**
 * TODO: Implement getWeekIdFromURL.
 */
function getWeekIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * TODO: Implement renderWeekDetails.
 */
function renderWeekDetails(week) {
    // 1. Set text contents
    weekTitle.textContent = week.title;
    weekStartDate.textContent = "Starts on: " + week.start_date;
    weekDescription.textContent = week.description;

    // 2. Clear and populate links list
    weekLinksList.innerHTML = "";
    if (week.links && Array.isArray(week.links)) {
        week.links.forEach(url => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = url;
            a.textContent = url;
            a.target = "_blank"; 
            li.appendChild(a);
            weekLinksList.appendChild(li);
        });
    }
}

/**
 * TODO: Implement createCommentArticle.
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
 * TODO: Implement renderComments.
 */
function renderComments() {
    // 1. Clear current list
    commentList.innerHTML = "";

    // 2. Loop and append each comment
    currentComments.forEach(comment => {
        const commentArticle = createCommentArticle(comment);
        commentList.appendChild(commentArticle);
    });
}

/**
 * TODO: Implement handleAddComment (async).
 */
async function handleAddComment(event) {
    event.preventDefault();

    const commentText = newCommentInput.value.trim();

    // 3. If empty, return
    if (!commentText) return;

    try {
        // 4. Send POST request
        const response = await fetch('./api/index.php?action=comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                week_id: parseInt(currentWeekId),
                author: "Student", // Hardcoded as per instructions
                text: commentText
            })
        });

        const result = await response.json();

        // 5. On success
        if (result.success === true) {
            currentComments.push(result.data);
            renderComments();
            newCommentInput.value = ""; // Clear input
        }
    } catch (error) {
        console.error("Error posting comment:", error);
    }
}

/**
 * TODO: Implement initializePage (async).
 */
async function initializePage() {
    // 1. Get ID from URL
    currentWeekId = getWeekIdFromURL();

    // 2. Check if ID exists
    if (!currentWeekId) {
        weekTitle.textContent = "Week not found.";
        return;
    }

    try {
        // 3. Fetch week details and comments in parallel
        const [weekResponse, commentsResponse] = await Promise.all([
            fetch(`./api/index.php?id=${currentWeekId}`),
            fetch(`./api/index.php?action=comments&week_id=${currentWeekId}`)
        ]);

        const weekResult = await weekResponse.json();
        const commentsResult = await commentsResponse.json();

        // 4. Store comments
        if (commentsResult.success) {
            currentComments = commentsResult.data || [];
        }

        // 5. If week found, render everything
        if (weekResult.success && weekResult.data) {
            renderWeekDetails(weekResult.data);
            renderComments();

            // Attach listener
            commentForm.addEventListener('submit', handleAddComment);
        } else {
            // 6. If week not found
            weekTitle.textContent = "Week not found.";
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        weekTitle.textContent = "Error loading data.";
    }
}

// --- Initial Page Load ---
initializePage();