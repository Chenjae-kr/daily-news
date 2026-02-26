// DOM Elements
const postListContainer = document.getElementById('post-list');
const markdownContainer = document.getElementById('markdown-container');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('empty-state');
const themeToggleBtn = document.getElementById('theme-toggle');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const activeCategoryDisplay = document.getElementById('active-category');

// State
let posts = [];
let currentPostPath = null;

// Initialize
async function init() {
  initTheme();
  setupEventListeners();
  configureMarked();
  await fetchPosts();
  handleRoute();
}

// Setup Marked.js Options (e.g., syntax highlighting if we want to add later)
function configureMarked() {
  // Use gfm (GitHub Flavored Markdown)
  marked.use({
    gfm: true,
    breaks: true
  });
}

// Fetch Posts Metadata
async function fetchPosts() {
  try {
    const res = await fetch('./api/posts.json');
    if (!res.ok) throw new Error('Failed to fetch posts API');
    posts = await res.json();
    
    // Process paths and sort by date descending
    posts = posts.map(p => ({
      ...p,
      // Extract nice display title if possible from filename, default to basename without extension
      displayTitle: p.title.replace('.md', '').split('_').join(' ')
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    renderSidebar();
  } catch (err) {
    console.error('Error fetching posts:', err);
    postListContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary)">글 목록을 불러오지 못했습니다.</div>';
  }
}

// Render Sidebar List
function renderSidebar() {
  postListContainer.innerHTML = '';
  if (posts.length === 0) {
    postListContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary)">게시글이 없습니다.</div>';
    return;
  }

  posts.forEach(post => {
    // We'll use the URL path as the unique hash
    const hashPath = encodeURI(post.path);
    
    const a = document.createElement('a');
    a.href = `#${hashPath}`;
    a.className = 'post-item glass';
    a.dataset.path = post.path;
    
    a.innerHTML = `
      <div class="post-title">${post.displayTitle}</div>
      <div class="post-date">${post.date}</div>
    `;
    
    postListContainer.appendChild(a);
  });
}

// Handle Hash Change (Routing)
async function handleRoute() {
  const hash = window.location.hash.slice(1); // remove '#'
  const path = decodeURI(hash);

  // Update Active State in Sidebar
  document.querySelectorAll('.post-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.path === path) {
      el.classList.add('active');
      // Scroll sidebar to active item
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  if (!path || !path.endsWith('.md')) {
    showEmptyState();
    closeMobileMenu();
    return;
  }

  currentPostPath = path;
  await loadMarkdown(path);
  closeMobileMenu();
}

// Load and Render Markdown String
async function loadMarkdown(path) {
  showLoader();
  try {
    // Determine fetch URL. In GitHub pages it's relative to root
    const fetchPath = '.' + path; 
    const res = await fetch(fetchPath);
    if (!res.ok) throw new Error('Markdown not found');
    const mdText = await res.text();
    
    const html = marked.parse(mdText);
    
    markdownContainer.innerHTML = html;
    
    // Optional: Extract first h1 or h2 to update activeCategory/mobile header title
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const firstHeading = tempDiv.querySelector('h1, h2');
    if (activeCategoryDisplay && firstHeading) {
      activeCategoryDisplay.textContent = firstHeading.textContent;
    } else if (activeCategoryDisplay) {
      activeCategoryDisplay.textContent = 'Daily News';
    }

    // Animation trigger
    markdownContainer.classList.remove('loaded');
    // Force reflow
    void markdownContainer.offsetWidth;
    markdownContainer.classList.add('loaded');
    
    hideLoader();
    
    // Scroll to top of content
    document.getElementById('main-content').scrollTop = 0;
    
  } catch (err) {
    console.error('Error loading markdown:', err);
    markdownContainer.innerHTML = `<div style="text-align:center;color:red;padding:40px;">문서를 불러오는 데 실패했습니다.</div>`;
    hideLoader();
  }
}

// UI Helpers
function showLoader() {
  emptyState.style.display = 'none';
  markdownContainer.style.display = 'none';
  loader.style.display = 'block';
}

function hideLoader() {
  loader.style.display = 'none';
  markdownContainer.style.display = 'block';
}

function showEmptyState() {
  markdownContainer.innerHTML = '';
  loader.style.display = 'none';
  emptyState.style.display = 'flex';
  if (activeCategoryDisplay) activeCategoryDisplay.textContent = 'Daily News';
}

// Theme logic
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  // Use feather icons or inline SVG for sun/moon
  if (theme === 'dark') {
    themeToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  } else {
    themeToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }
}

// Mobile Menu
function toggleMobileMenu() {
  sidebar.classList.toggle('open');
  if (sidebar.classList.contains('open')) {
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}

function closeMobileMenu() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

// Event Listeners
function setupEventListeners() {
  window.addEventListener('hashchange', handleRoute);
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  }
  
  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
