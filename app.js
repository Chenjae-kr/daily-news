// DOM Elements
const postListContainer = document.getElementById('post-list');
const markdownContainer = document.getElementById('markdown-container');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('empty-state');
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

        // Process paths and sort by date descending (latest first)
        posts = posts.map(p => {
            let niceTitle = p.title.replace('.md', '').split('_').join(' ');
            // If title is like 20260224_dailynews, format it nicely
            const dateMatch = p.title.match(/^(\d{4})(\d{2})(\d{2})/);
            if (dateMatch) {
                niceTitle = `${dateMatch[1]}년 ${dateMatch[2]}월 ${dateMatch[3]}일 데일리 뉴스`;
            }

            return {
                ...p,
                displayTitle: niceTitle
            };
        }).sort((a, b) => {
            // Sort by extracted title if it starts with date (e.g., 20260226) or fallback to file modified date
            const dateA = a.title.match(/^\d{8}/) ? a.title.substring(0, 8) : a.date;
            const dateB = b.title.match(/^\d{8}/) ? b.title.substring(0, 8) : b.date;
            // Descending order (newest first)
            return dateB.localeCompare(dateA);
        });

        filteredPosts = [...posts];
        renderSidebar();
        renderCalendar();
    } catch (err) {
        console.error('Error fetching posts:', err);
        postListContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary)">글 목록을 불러오지 못했습니다.</div>';
    }
}

// Search Filter functionality
function handleSearch(e) {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    if (!currentSearchQuery) {
        filteredPosts = [...posts];
    } else {
        filteredPosts = posts.filter(post =>
            post.displayTitle.toLowerCase().includes(currentSearchQuery) ||
            post.date.toLowerCase().includes(currentSearchQuery) ||
            post.title.toLowerCase().includes(currentSearchQuery)
        );
    }
    renderSidebar();

    // Re-render markdown if we are searching to highlight terms
    if (currentPostPath && markdownContainer.innerHTML.trim() !== '') {
        // Debounce or just call it directly for simplicity
        loadMarkdown(currentPostPath);
    }
}

// Render Sidebar List
function renderSidebar() {
    postListContainer.innerHTML = '';
    if (filteredPosts.length === 0) {
        postListContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary)">검색 결과가 없습니다.</div>';
        return;
    }

    filteredPosts.forEach(post => {
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

        let html = marked.parse(mdText);

        // Highlight keywords if search is active
        if (currentSearchQuery.length > 1) {
            // Very simple highlighting that avoids inside HTML tags
            const regex = new RegExp(`(?![^<]+>)((${currentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}))`, 'gi');
            html = html.replace(regex, '<span class="highlight">$1</span>');
        }

        // Calculate Read Time
        const wordCount = mdText.replace(/[#*`\n]/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
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

        // Build Category Rail from H2 tags
        buildCategoryFilters();

        // Optional: Extract first h1 or h2 to update activeCategory/mobile header title
        const firstHeading = markdownContainer.querySelector('h1, h2');
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

// Generate Table of Contents
function generateTOC() {
    if (!tocList) return;
    tocList.innerHTML = '';

    // Select all H2 and H3 generated by Marked (marked auto-generates IDs)
    const headings = markdownContainer.querySelectorAll('h2, h3');
    if (headings.length === 0) {
        tocList.innerHTML = '<div style="color:var(--text-secondary);font-size:0.85rem;padding:12px 0;">목차가 없습니다.</div>';
        return;
    }

    headings.forEach(heading => {
        const a = document.createElement('a');
        a.textContent = heading.textContent;
        a.href = `#${heading.id}`;
        a.className = `toc-item toc-${heading.tagName.toLowerCase()}`;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
        });

        tocList.appendChild(a);
    });
}

// Build Category Filters from Document Headers
function buildCategoryFilters() {
    if (!categoryRail || !categoryChipsContainer) return;

    // Find all primary categories (H2 headers usually in this md structure)
    // We will look for headers like "1. 경제", "2. AI", etc.
    const h2s = Array.from(markdownContainer.querySelectorAll('h2'));

    // If no distinct sections, hide the rail
    if (h2s.length === 0) {
        categoryRail.style.display = 'none';
        return;
    }

    categoryChipsContainer.innerHTML = '';
    currentActiveFilter = 'all';
    categoryRail.style.display = 'block';

    // Add "All" chip
    const allChip = document.createElement('div');
    allChip.className = 'cat-chip active';
    allChip.textContent = '모든 분야';
    allChip.addEventListener('click', () => filterSection('all', allChip));
    categoryChipsContainer.appendChild(allChip);

    // Add chip for each H2
    h2s.forEach((h2, index) => {
        // Clean up the text (remove leading numbers/punctuation if desired, but here we just take the text)
        let name = h2.textContent.replace(/^\d+\.\s*/, '').trim();

        const chip = document.createElement('div');
        chip.className = 'cat-chip';
        chip.textContent = name;

        // When chip clicked, filter
        chip.addEventListener('click', () => filterSection(h2, chip));
        categoryChipsContainer.appendChild(chip);
    });
}

// Logic to show/hide sections based on clicked H2
function filterSection(targetH2, activeChip) {
    if (currentActiveFilter === targetH2) return;
    currentActiveFilter = targetH2;

    // Update chip styles
    Array.from(categoryChipsContainer.children).forEach(c => c.classList.remove('active'));
    activeChip.classList.add('active');

    const elements = Array.from(markdownContainer.children);

    if (targetH2 === 'all') {
        // Show everything
        elements.forEach(el => el.classList.remove('section-hidden'));
        return;
    }

    // Hide everything first
    elements.forEach(el => el.classList.add('section-hidden'));

    // Unhide the meta header always (it is at the very top)
    const metaHeader = markdownContainer.querySelector('.post-meta-header');
    if (metaHeader) metaHeader.classList.remove('section-hidden');

    // Find the target H2, and show all elements until the next H2
    let isTargetSection = false;
    for (let el of elements) {
        if (el.tagName === 'H2') {
            isTargetSection = (el === targetH2);
        }

        if (isTargetSection) {
            el.classList.remove('section-hidden');
        }
    }

    // Re-generate TOC to match only visible items
    generateTOC();

    // Scroll up
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Set Header
    calMonthYear.textContent = `${year}년 ${month + 1}월`;

    calGrid.innerHTML = '';

    // Days of Week Header
    const daysArr = ['일', '월', '화', '수', '목', '금', '토'];
    daysArr.forEach(day => {
        const div = document.createElement('div');
        div.className = 'cal-day-header';
        div.textContent = day;
        calGrid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        calGrid.appendChild(div);
    }

    // Real days
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day';
        div.textContent = i;

        // Check if there's a post on this day
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        // Fallback or more robust match: check if a post has this date in filename
        const postForDate = posts.find(p => p.date === dateStr || p.title.includes(dateStr.replace(/-/g, '')));

        if (postForDate) {
            div.classList.add('has-post');
            div.addEventListener('click', () => {
                window.location.hash = encodeURI(postForDate.path);
            });

            // Check if active
            if (currentPostPath === postForDate.path) {
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
    // Use feather icons or inline SVG for sun/moon
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

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    if (themeToggleDesktopBtn) {
        themeToggleDesktopBtn.addEventListener('click', toggleTheme);
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Calendar Pagination
    if (calPrev) calPrev.addEventListener('click', () => changeMonth(-1));
    if (calNext) calNext.addEventListener('click', () => changeMonth(1));

    // Progress Bar & Go to Top
    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            updateProgressBar();
            toggleGoToTopButton();
        });
    }

    if (goToTopBtn) {
        goToTopBtn.addEventListener('click', scrollToTop);
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
