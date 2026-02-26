// DOM Elements
const postListContainer = document.getElementById('post-list');
const markdownContainer = document.getElementById('markdown-container');
const loader = document.getElementById('loader');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleDesktopBtn = document.getElementById('theme-toggle-desktop');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const activeCategoryDisplay = document.getElementById('active-category');
const searchInput = document.getElementById('search-input');
const tocList = document.getElementById('toc-list');
const progressBar = document.getElementById('progress-bar');
const goToTopBtn = document.getElementById('go-to-top');
const mainContent = document.getElementById('main-content');
const dashboardView = document.getElementById('dashboard-view');
const dashboardCards = document.getElementById('dashboard-cards');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// Calendar Elements
const calMonthYear = document.getElementById('cal-month-year');
const calGrid = document.getElementById('calendar-grid');
const calPrev = document.getElementById('cal-prev');
const calNext = document.getElementById('cal-next');

// Category Rail
const categoryRail = document.getElementById('category-filter-rail');
const categoryChipsContainer = document.getElementById('category-chips-container');
let currentActiveFilter = 'all';

// State
let posts = [];
let filteredPosts = [];
let currentPostPath = null;
let currentSearchQuery = '';
let currentDateFilter = null;

// Calendar State
let currentCalDate = new Date();

// Initialize
async function init() {
    initTheme();
    setupEventListeners();
    configureMarked();
    await fetchPosts();
    handleRoute();
}

// Setup Marked.js Options
function configureMarked() {
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
        posts = posts.map(p => {
            let niceTitle = p.title.replace('.md', '').split('_').join(' ');
            return {
                ...p,
                displayTitle: niceTitle
            };
        }).sort((a, b) => b.date.localeCompare(a.date));

        filteredPosts = [...posts];

        // Build global category filters
        const uniqueCategories = [...new Set(posts.map(p => p.category))].filter(Boolean);
        buildCategoryFilters(uniqueCategories);

        renderSidebar();
        renderCalendar();
        renderDashboard();
    } catch (err) {
        console.error('Error fetching posts:', err);
        dashboardCards.innerHTML = '<div style="padding:16px;color:red;">데이터를 불러오지 못했습니다.</div>';
    }
}

// Search & Filter functionality
function handleSearch(e) {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    applyFilters();
}

function applyFilters() {
    filteredPosts = posts.filter(post => {
        const matchSearch = !currentSearchQuery ||
            post.displayTitle.toLowerCase().includes(currentSearchQuery) ||
            post.title.toLowerCase().includes(currentSearchQuery) ||
            (post.summary && post.summary.toLowerCase().includes(currentSearchQuery));
        const matchCat = currentActiveFilter === 'all' || post.category === currentActiveFilter;
        const matchDate = !currentDateFilter || post.date === currentDateFilter;

        return matchSearch && matchCat && matchDate;
    });

    // Toggle clear filters button
    if (currentActiveFilter !== 'all' || currentDateFilter || currentSearchQuery) {
        clearFiltersBtn.style.display = 'block';
    } else {
        clearFiltersBtn.style.display = 'none';
    }

    renderSidebar();
    renderDashboard();
    renderCalendar(); // To update highlights
}

clearFiltersBtn.addEventListener('click', () => {
    currentActiveFilter = 'all';
    currentDateFilter = null;
    currentSearchQuery = '';
    searchInput.value = '';

    // Reset chips visually
    Array.from(categoryChipsContainer.children).forEach(c => {
        if (c.dataset.cat === 'all') c.classList.add('active');
        else c.classList.remove('active');
    });

    applyFilters();
});

// Render Sidebar List
function renderSidebar() {
    postListContainer.innerHTML = '';
    if (filteredPosts.length === 0) {
        postListContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary)">검색 결과가 없습니다.</div>';
        return;
    }

    filteredPosts.forEach(post => {
        const hashPath = encodeURI(post.path);
        const a = document.createElement('a');
        a.href = `#${hashPath}`;
        a.className = 'post-item glass';
        a.dataset.path = post.path;

        a.innerHTML = `
      <div class="post-title" style="font-size:0.9rem">${post.displayTitle}</div>
      <div class="post-date" style="font-size:0.75rem">${post.category || '기타'} · ${post.date}</div>
    `;

        postListContainer.appendChild(a);
    });
}

function renderDashboard() {
    dashboardCards.innerHTML = '';
    if (filteredPosts.length === 0) {
        dashboardCards.innerHTML = '<div style="color:var(--text-secondary); grid-column: 1/-1;">조건에 맞는 뉴스가 없습니다.</div>';
        return;
    }

    filteredPosts.forEach(post => {
        const card = document.createElement('a');
        card.href = `#${encodeURI(post.path)}`;
        card.className = 'news-card';
        card.innerHTML = `
            <div class="card-meta">
                <span class="card-category">${post.category || '미분류'}</span>
                <span class="card-date">${post.date}</span>
            </div>
            <div class="card-title">${post.displayTitle}</div>
            <div class="card-summary">${post.summary ? marked.parseInline(post.summary) : '내용이 없습니다.'}</div>
        `;
        dashboardCards.appendChild(card);
    });
}

// Handle Hash Change (Routing)
async function handleRoute() {
    const hash = window.location.hash.slice(1);
    const path = decodeURI(hash);

    // Update Active State in Sidebar
    document.querySelectorAll('.post-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.path === path) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    if (!path || !path.endsWith('.md')) {
        showDashboard();
        closeMobileMenu();
        return;
    }

    currentPostPath = path;
    await loadMarkdown(path);
    closeMobileMenu();
}

function showDashboard() {
    markdownContainer.style.display = 'none';
    dashboardView.style.display = 'block';
    categoryRail.style.display = 'block';

    if (activeCategoryDisplay) activeCategoryDisplay.textContent = 'Daily News';
}

// Load and Render Markdown String
async function loadMarkdown(path) {
    showLoader();
    try {
        const fetchPath = '.' + path;
        const res = await fetch(fetchPath);
        if (!res.ok) throw new Error('Markdown not found');
        const contentText = await res.text();

        let html = contentText;
        // If it's pure markdown (local test), parse it. If it's already HTML (Jekyll), use as is.
        if (!contentText.trim().startsWith('<') && !contentText.match(/<h[1-6]/i)) {
            // Strip YAML frontmatter before parsing as markdown
            const matterRegex = /^---[\s\S]*?---\n/;
            const cleanMarkdown = contentText.replace(matterRegex, '');
            html = marked.parse(cleanMarkdown);
        } else {
            // It's HTML, the frontmatter was already stripped by Jekyll
        }

        // Highlight keywords if search is active
        if (currentSearchQuery.length > 1) {
            const regex = new RegExp(`(?![^<]+>)((${currentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}))`, 'gi');
            html = html.replace(regex, '<span class="highlight">$1</span>');
        }

        // Calculate Read Time (Strip tags if fetching HTML)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const wordCount = tempDiv.textContent.replace(/[#*`\n]/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
        const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

        // Inject Meta Header (Read Time & Share Button)
        const metaHeader = `
            <div class="post-meta-header">
                <div class="read-time">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    읽기 약 ${readTimeMinutes}분 소요
                </div>
                <button class="share-btn" onclick="shareCurrentPost()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                    링크 복사
                </button>
            </div>
        `;

        markdownContainer.innerHTML = metaHeader + html;

        // Generate TOC
        generateTOC();

        // Optional: Update title
        const postData = posts.find(p => p.path === path);
        if (activeCategoryDisplay && postData) {
            activeCategoryDisplay.textContent = postData.displayTitle;
        }

        // Hide Dashboard, Show Markdown
        dashboardView.style.display = 'none';
        markdownContainer.style.display = 'block';

        // Animation trigger
        markdownContainer.classList.remove('loaded');
        void markdownContainer.offsetWidth;
        markdownContainer.classList.add('loaded');

        hideLoader();

        // Reset scroll and progress
        mainContent.scrollTop = 0;
        updateProgressBar();
        toggleGoToTopButton();

    } catch (err) {
        console.error('Error loading markdown:', err);
        markdownContainer.innerHTML = `<div style="text-align:center;color:red;padding:40px;">문서를 불러오는 데 실패했습니다.</div>`;
        hideLoader();
    }
}

function buildCategoryFilters(categories) {
    if (!categoryRail || !categoryChipsContainer) return;

    categoryChipsContainer.innerHTML = '';
    currentActiveFilter = 'all';

    // Add "All" chip
    const allChip = document.createElement('div');
    allChip.className = 'cat-chip active';
    allChip.textContent = '모든 분야';
    allChip.dataset.cat = 'all';
    allChip.addEventListener('click', () => {
        currentActiveFilter = 'all';
        applyFilters();
        Array.from(categoryChipsContainer.children).forEach(c => c.classList.remove('active'));
        allChip.classList.add('active');
        window.location.hash = ''; // Return to dashboard
    });
    categoryChipsContainer.appendChild(allChip);

    // Add chip for each category
    categories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'cat-chip';
        chip.textContent = cat;
        chip.dataset.cat = cat;

        chip.addEventListener('click', () => {
            currentActiveFilter = cat;
            applyFilters();
            Array.from(categoryChipsContainer.children).forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            window.location.hash = ''; // Return to dashboard
        });
        categoryChipsContainer.appendChild(chip);
    });
}

// Generate Table of Contents
function generateTOC() {
    if (!tocList) return;
    tocList.innerHTML = '';

    const headings = markdownContainer.querySelectorAll('h2, h3');
    if (headings.length === 0) {
        tocList.innerHTML = '<div style="color:var(--text-secondary);font-size:0.85rem;padding:12px 0;">목차가 없습니다.</div>';
        return;
    }

    headings.forEach(heading => {
        const a = document.createElement('a');
        a.textContent = heading.textContent;
        // Ensure ID exists (Kramdown might add them, but marked.js does. If missing, make one)
        if (!heading.id) heading.id = 'heading-' + Math.random().toString(36).substr(2, 9);
        a.href = `#${heading.id}`;
        a.className = `toc-item toc-${heading.tagName.toLowerCase()}`;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
        });

        tocList.appendChild(a);
    });
}

// Share Button Logic
function shareCurrentPost() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('게시글 주소가 복사되었습니다.');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('주소 복사에 실패했습니다.');
    });
}

// Progress Bar Logic
function updateProgressBar() {
    if (!mainContent) return;
    // Only update progress when reading a post, not on dashboard
    if (markdownContainer.style.display === 'none') {
        if (progressBar) progressBar.style.width = '0%';
        return;
    }

    const scrollHeight = mainContent.scrollHeight - mainContent.clientHeight;
    if (scrollHeight <= 0) {
        if (progressBar) progressBar.style.width = '0%';
        return;
    }
    const progress = (mainContent.scrollTop / scrollHeight) * 100;
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// Go to Top Logic
function toggleGoToTopButton() {
    if (!goToTopBtn || !mainContent) return;
    if (mainContent.scrollTop > 300) {
        goToTopBtn.classList.add('visible');
    } else {
        goToTopBtn.classList.remove('visible');
    }
}

function scrollToTop() {
    if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Calendar Logic
function renderCalendar() {
    if (!calGrid || !calMonthYear) return;

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    calMonthYear.textContent = `${year}년 ${month + 1}월`;
    calGrid.innerHTML = '';

    const daysArr = ['일', '월', '화', '수', '목', '금', '토'];
    daysArr.forEach(day => {
        const div = document.createElement('div');
        div.className = 'cal-day-header';
        div.textContent = day;
        calGrid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        calGrid.appendChild(div);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day';
        div.textContent = i;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Find if any post matches this date
        const postForDate = posts.find(p => p.date === dateStr);

        if (postForDate) {
            div.classList.add('has-post');
            div.addEventListener('click', () => {
                if (currentDateFilter === dateStr) {
                    currentDateFilter = null;
                } else {
                    currentDateFilter = dateStr;
                    window.location.hash = ''; // View the dashboard filtered by this date
                }
                applyFilters();
            });

            // Highlight if currently filtering by this date
            if (currentDateFilter === dateStr) {
                div.classList.add('active');
            }
        }

        calGrid.appendChild(div);
    }
}

function changeMonth(offset) {
    currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    renderCalendar();
}

// UI Helpers
function showLoader() {
    dashboardView.style.display = 'none';
    markdownContainer.style.display = 'none';
    loader.style.display = 'block';
}

function hideLoader() {
    loader.style.display = 'none';
    // Active container display is managed in routing
}

function closeMobileMenu() {
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
}

// Theme logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', defaultTheme);
    updateThemeIcon(defaultTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    const iconHTML = theme === 'dark' ? sunIcon : moonIcon;

    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = iconHTML;
    }
    if (themeToggleDesktopBtn) {
        themeToggleDesktopBtn.innerHTML = iconHTML;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    window.addEventListener('hashchange', handleRoute);
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
    }

    if (calPrev) calPrev.addEventListener('click', () => changeMonth(-1));
    if (calNext) calNext.addEventListener('click', () => changeMonth(1));

    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            updateProgressBar();
            toggleGoToTopButton();
        });
    }

    if (goToTopBtn) {
        goToTopBtn.addEventListener('click', scrollToTop);
    }

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (themeToggleDesktopBtn) themeToggleDesktopBtn.addEventListener('click', toggleTheme);
}

// Boot
window.document.addEventListener('DOMContentLoaded', init);
