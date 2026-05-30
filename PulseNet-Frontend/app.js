/**
 * PulseNet — Full interactive frontend
 * Feed, authentication, post creation, and like toggles.
 */

const API_BASE_URL = 'https://project0-backend-production.up.railway.app/api/v1';
const TOKEN_KEY = 'pulsenet_token';
const USER_KEY = 'pulsenet_user';

// DOM elements
const postsListEl = document.getElementById('posts-list');
const postInputEl = document.getElementById('post-input');
const btnPublish = document.getElementById('btn-publish');
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authErrorEl = document.getElementById('auth-error');
const navbarGuest = document.getElementById('navbar-guest');
const navbarUser = document.getElementById('navbar-user');
const navbarUsername = document.getElementById('navbar-username');
const navbarAvatar = document.getElementById('navbar-avatar');
const createPostAvatar = document.getElementById('create-post-avatar');
const toastContainer = document.getElementById('toast-container');

const ICONS = {
  eye: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  heartOutline: `<svg class="icon icon--heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`,
  heartFilled: `<svg class="icon icon--heart" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`,
};

// ---------------------------------------------------------------------------
// Auth storage
// ---------------------------------------------------------------------------

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isLoggedIn() {
  return Boolean(getToken());
}

function getDisplayName(user) {
  if (!user) return 'User';
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.first_name || 'User';
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function setAuthError(message) {
  if (!message) {
    authErrorEl.hidden = true;
    authErrorEl.textContent = '';
    return;
  }
  authErrorEl.hidden = false;
  authErrorEl.textContent = message;
}

function updateNavbar() {
  const user = getStoredUser();
  const loggedIn = isLoggedIn() && user;

  navbarGuest.hidden = Boolean(loggedIn);
  navbarUser.hidden = !loggedIn;

  if (loggedIn) {
    const name = getDisplayName(user);
    navbarUsername.textContent = name;
    const initial = (name.charAt(0) || '?').toUpperCase();
    navbarAvatar.textContent = initial;
    createPostAvatar.textContent = initial;
  } else {
    createPostAvatar.textContent = '?';
  }
}

function openAuthModal(tab = 'login') {
  authModal.hidden = false;
  authModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setAuthError('');
  switchAuthTab(tab);
  document.getElementById(tab === 'register' ? 'reg-first-name' : 'login-username')?.focus();
}

function closeAuthModal() {
  authModal.hidden = true;
  authModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  setAuthError('');
  loginForm.reset();
  registerForm.reset();
}

function switchAuthTab(tab) {
  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.classList.toggle('modal__tab--active', btn.dataset.authTab === tab);
  });
  loginForm.hidden = tab !== 'login';
  registerForm.hidden = tab !== 'register';
  document.getElementById('auth-modal-title').textContent =
    tab === 'login' ? 'Welcome back' : 'Join PulseNet';
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();

  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (text) data = { detail: text };
  }

  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || d.message).join(', ')
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function deriveTitle(content) {
  const line = content.trim().split('\n')[0];
  return (line.slice(0, 80) || 'Post').trim();
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

async function handleLogin(event) {
  event.preventDefault();
  setAuthError('');

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  try {
    const data = await apiRequest('/users/login', {
      method: 'POST',
      body,
      skipAuth: true,
    });

    const user = {
      first_name: username,
      last_name: '',
    };

    setSession(data.access_token, user);
    updateNavbar();
    closeAuthModal();
    showToast('Logged in successfully', 'success');
  } catch (error) {
    setAuthError(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setAuthError('');

  const payload = {
    first_name: document.getElementById('reg-first-name').value.trim(),
    last_name: document.getElementById('reg-last-name').value.trim(),
    gender: document.getElementById('reg-gender').value,
    password: document.getElementById('reg-password').value,
    role_ids: [],
  };

  try {
    const user = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });

    const body = new URLSearchParams();
    body.append('username', payload.first_name);
    body.append('password', payload.password);

    const loginData = await apiRequest('/users/login', {
      method: 'POST',
      body,
      skipAuth: true,
    });

    setSession(loginData.access_token, {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    updateNavbar();
    closeAuthModal();
    showToast('Account created — welcome to PulseNet!', 'success');
  } catch (error) {
    setAuthError(error.message);
  }
}

function handleLogout() {
  clearSession();
  updateNavbar();
  showToast('Logged out', 'info');
}

// ---------------------------------------------------------------------------
// Posts feed
// ---------------------------------------------------------------------------

function getAuthorName(post) {
  return post.author_name || `User #${post.user_id ?? '?'}`;
}

function getAvatarInitial(name) {
  return (name?.charAt(0) || '?').toUpperCase();
}

function createPostCardHTML(post) {
  const authorName = getAuthorName(post);
  const initial = getAvatarInitial(authorName);
  const likes = post.likes_count ?? 0;
  const views = post.views ?? 0;
  const title = post.title
    ? `<h4 class="post-card__title">${escapeHtml(post.title)}</h4>`
    : '';

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
      <p class="post-card__content">${escapeHtml(post.content)}</p>
      <footer class="post-card__footer">
        <span class="post-card__views" title="Views">
          ${ICONS.eye}
          ${views} view${views === 1 ? '' : 's'}
        </span>
        <button type="button" class="post-card__like" data-post-id="${post.id}" aria-label="Like post, ${likes} likes">
          ${ICONS.heartOutline}
          <span class="post-card__like-count">${likes}</span>
        </button>
      </footer>
    </article>
  `;
}

function showFeedStatus(message, type = 'info') {
  postsListEl.innerHTML = `<p class="posts-feed__status posts-feed__status--${type}" role="status">${escapeHtml(message)}</p>`;
}

async function fetchPosts() {
  showFeedStatus('Loading posts…');

  try {
    const posts = await apiRequest('/posts', { skipAuth: true });

    if (!Array.isArray(posts) || posts.length === 0) {
      showFeedStatus('No posts yet. Be the first to publish something!', 'empty');
      return;
    }

    const sorted = [...posts].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    postsListEl.innerHTML = sorted.map(createPostCardHTML).join('');
  } catch (error) {
    console.error('fetchPosts:', error);
    showFeedStatus('Could not load posts. Please try again later.', 'error');
  }
}

async function handlePublish() {
  const content = postInputEl.value.trim();

  if (!content) {
    showToast('Write something before publishing', 'error');
    return;
  }

  if (!isLoggedIn()) {
    showToast('Please log in to publish a post', 'error');
    openAuthModal('login');
    return;
  }

  btnPublish.disabled = true;
  btnPublish.classList.add('btn--loading');

  try {
    await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: deriveTitle(content),
        content,
      }),
    });

    postInputEl.value = '';
    showToast('Post published!', 'success');
    await fetchPosts();
  } catch (error) {
    showToast(error.message, 'error');
    if (error.message.toLowerCase().includes('credentials')) {
      clearSession();
      updateNavbar();
      openAuthModal('login');
    }
  } finally {
    btnPublish.disabled = false;
    btnPublish.classList.remove('btn--loading');
  }
}

// ---------------------------------------------------------------------------
// Like toggle
// ---------------------------------------------------------------------------

function setLikeButtonState(button, liked, count) {
  button.classList.toggle('post-card__like--active', liked);
  button.innerHTML = `${liked ? ICONS.heartFilled : ICONS.heartOutline}<span class="post-card__like-count">${count}</span>`;
  button.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} post, ${count} likes`);
  button.dataset.liked = liked ? 'true' : 'false';
}

async function handleLikeClick(button) {
  if (!isLoggedIn()) {
    showToast('Please log in to like posts', 'error');
    openAuthModal('login');
    return;
  }

  const postId = button.dataset.postId;
  if (!postId || button.disabled) return;

  button.disabled = true;

  try {
    const data = await apiRequest(`/likes/${postId}`, { method: 'POST' });
    const countEl = button.querySelector('.post-card__like-count');
    let count = parseInt(countEl?.textContent || '0', 10);

    if (data.message?.toLowerCase().includes('added')) {
      count += 1;
      setLikeButtonState(button, true, count);
    } else if (data.message?.toLowerCase().includes('removed')) {
      count = Math.max(0, count - 1);
      setLikeButtonState(button, false, count);
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

function bindEvents() {
  document.getElementById('btn-open-auth').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btn-open-register').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  btnPublish.addEventListener('click', handlePublish);

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);

  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
  });

  authModal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeAuthModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authModal.hidden) closeAuthModal();
  });

  postsListEl.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.post-card__like');
    if (likeBtn) handleLikeClick(likeBtn);
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  bindEvents();
  fetchPosts();
});
