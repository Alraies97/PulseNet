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
 * Build a map of user_id → display name from GET /users.
 */
async function fetchUserMap() {
  const response = await fetch(`${API_BASE_URL}/users`);

  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`);
  }

  const users = await response.json();
  const map = {};

  users.forEach((user) => {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    map[user.id] = name || `User #${user.id}`;
  });

  return map;
}

/**
 * Resolve author display name for a post.
 */
function getAuthorName(post, userMap) {
  if (post.user?.first_name) {
    return [post.user.first_name, post.user.last_name].filter(Boolean).join(' ');
  }
  if (userMap[post.user_id]) {
    return userMap[post.user_id];
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
 * Likes count — use API field when available, otherwise default to 0.
 */
function getLikesCount(post) {
  return post.likes_count ?? post.like_count ?? post.likes ?? 0;
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
function createPostCardHTML(post, userMap) {
  const authorName = getAuthorName(post, userMap);
  const initial = getAvatarInitial(authorName);
  const content = escapeHtml(post.content);
  const title = post.title ? `<h4 class="post-card__title">${escapeHtml(post.title)}</h4>` : '';
  const views = post.views ?? 0;
  const likes = getLikesCount(post);

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
    // Load users in parallel so we can show author names (posts only return user_id)
    const [userMap, postsResponse] = await Promise.all([
      fetchUserMap().catch(() => ({})),
      fetch(`${API_BASE_URL}/posts`),
    ]);

    if (!postsResponse.ok) {
      throw new Error(`Failed to load posts (${postsResponse.status})`);
    }

    const posts = await postsResponse.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      showFeedStatus('No posts yet. Be the first to publish something!', 'empty');
      return;
    }

    // Newest first when ids are sequential
    const sorted = [...posts].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    postsListEl.innerHTML = sorted
      .map((post) => createPostCardHTML(post, userMap))
      .join('');
  } catch (error) {
    console.error('PulseNet fetchPosts:', error);
    showFeedStatus(
      'Could not load posts. Check that the API is running and CORS is enabled.',
      'error'
    );
  }
}

// Run as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', fetchPosts);
