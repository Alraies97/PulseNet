/**
 * PulseNet — Posts feed (API connection)
 * Fetches live posts from the Railway backend and renders them in the feed.
 */

const API_BASE_URL = 'https://project0-backend-production.up.railway.app/api/v1';

/** DOM reference for the dynamic posts container */
const postsListEl = document.getElementById('posts-list');

/**
 * Escape HTML to prevent XSS when injecting API text into the DOM.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

/**
 * Resolve author display name from API response.
 */
function getAuthorName(post) {
  if (post.author_name) {
    return post.author_name;
  }
  return `User #${post.user_id ?? '?'}`;
}

/**
 * First letter for avatar circle.
 */
function getAvatarInitial(authorName) {
  return (authorName?.charAt(0) || '?').toUpperCase();
}

/**
 * SVG icons reused in each card (matches index.html design).
 */
const ICONS = {
  eye: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  heart: `<svg class="icon icon--heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`,
};

/**
 * Build HTML string for a single post card.
 */
function createPostCardHTML(post) {
  const authorName = getAuthorName(post);
  const initial = getAvatarInitial(authorName);
  const content = escapeHtml(post.content);
  const title = post.title ? `<h4 class="post-card__title">${escapeHtml(post.title)}</h4>` : '';
  const views = post.views ?? 0;
  const likes = post.likes_count ?? 0;

  return `
    <article class="post-card" data-post-id="${post.id}">
      <header class="post-card__header">
        <div class="post-card__author-wrap">
          <div class="post-card__avatar" aria-hidden="true">${initial}</div>
          <div>
            <h3 class="post-card__author">${escapeHtml(authorName)}</h3>
          </div>
        </div>
      </header>
      ${title}
      <p class="post-card__content">${content}</p>
      <footer class="post-card__footer">
        <span class="post-card__views" title="Views">
          ${ICONS.eye}
          ${views} view${views === 1 ? '' : 's'}
        </span>
        <button type="button" class="post-card__like" aria-label="Like post, ${likes} likes">
          ${ICONS.heart}
          <span class="post-card__like-count">${likes}</span>
        </button>
      </footer>
    </article>
  `;
}

/**
 * Show loading, error, or empty state in the posts container.
 */
function showFeedStatus(message, type = 'info') {
  postsListEl.innerHTML = `<p class="posts-feed__status posts-feed__status--${type}" role="status">${escapeHtml(message)}</p>`;
}

/**
 * Fetch posts from GET /posts and render them into #posts-list.
 */
async function fetchPosts() {
  showFeedStatus('Loading posts…');

  try {
    const response = await fetch(`${API_BASE_URL}/posts`);

    if (!response.ok) {
      throw new Error(`Failed to load posts (${response.status})`);
    }

    const posts = await response.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      showFeedStatus('No posts yet. Be the first to publish something!', 'empty');
      return;
    }

    const sorted = [...posts].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    postsListEl.innerHTML = sorted.map(createPostCardHTML).join('');
  } catch (error) {
    console.error('PulseNet fetchPosts:', error);
    showFeedStatus(
      'Could not load posts. Check that the API is running and CORS is enabled.',
      'error'
    );
  }
}

document.addEventListener('DOMContentLoaded', fetchPosts);
