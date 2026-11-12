/**
 * Shri Sai Satcharitra E-Reader Engine
 * Modern, responsive, paginated physical-book reader for GitHub Pages
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const state = {
    bookData: null,
    currentChapterId: 1,
    currentPageIndex: 0,
    totalPages: 1,
    pageSlices: [], // Array of element arrays for the current chapter
    viewMode: 'book', // 'book' (paginated physical book) or 'scroll' (continuous)
    isDoublePage: true, // Double-page spread on desktop
    targetPickMode: false,
    selectedTargetParaId: null,

    // Reading preferences (Devotional Literary font & 1.7 line spacing default)
    theme: 'light',
    fontSize: 17.5,
    fontFamily: 'literary', // Default: Devotional Literary (Crimson Pro)
    lineHeight: 1.7, // Default: 1.7
    soundEnabled: true,
    textAlign: 'justify',
    dropCapsEnabled: true,

    // Persistence
    bookmarks: [], // [{ id, chapterId, elementId, pageIndex, note, snippet, timestamp }]
    lastRead: null, // { chapterId, pageIndex, elementId, timestamp }
    chapterProgress: {}, // { [chapterId]: percentRead }

    // Audio narration
    speechUtterance: null,
    isSpeaking: false,
    speechRate: 1.0,
  };

  // --- STORAGE KEYS ---
  const STORAGE_KEYS = {
    PREFS: 'sai_satcharitra_prefs',
    BOOKMARKS: 'sai_satcharitra_bookmarks',
    LAST_READ: 'sai_satcharitra_last_read',
    PROGRESS: 'sai_satcharitra_progress',
  };

  // --- DOM ELEMENT REFERENCES ---
  let dom = {};

  // --- ROMAN TO ARABIC NUMERAL CONVERTER (FOR TOC ONLY) ---
  function romanToInt(s) {
    const roman = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let val = 0;
    const str = s.toUpperCase().trim();
    for (let i = 0; i < str.length; i++) {
      if (i + 1 < str.length && (roman[str[i]] || 0) < (roman[str[i + 1]] || 0)) {
        val -= roman[str[i]] || 0;
      } else {
        val += roman[str[i]] || 0;
      }
    }
    return val ? String(val) : s;
  }

  function formatChapterNumberForTOC(ch) {
    if (!ch) return '';
    const label = ch.chapterLabel || '';
    if (label.toLowerCase().includes('epilogue')) return 'Epilogue';
    return label.replace(/\b[IVXLCDM]+\b/gi, (match) => romanToInt(match));
  }

  // --- INITIALIZATION ---
  function init() {
    cacheDomElements();
    loadPreferences();
    loadBookmarks();
    loadProgress();

    // Check if BOOK_DATA is ready, otherwise fetch from data/chapters.json
    if (window.BOOK_DATA) {
      state.bookData = window.BOOK_DATA;
      finishInit();
    } else {
      fetch('data/chapters.json')
        .then((res) => res.json())
        .then((data) => {
          state.bookData = data;
          finishInit();
        })
        .catch((err) => {
          console.error('Failed to load book data:', err);
        });
    }
  }

  function finishInit() {
    setupResponsiveLayout();
    bindEvents();
    renderTableOfContents();

    // Check URL hash or last-read location
    const hash = window.location.hash;
    let initialChapterId = 1;
    let initialPageIndex = 0;
    let targetElementId = null;

    if (hash && hash.startsWith('#ch')) {
      const match = hash.match(/#ch(\d+)(?:-p(\d+))?(?:-el-(.+))?/);
      if (match) {
        initialChapterId = parseInt(match[1], 10) || 1;
        if (match[2]) initialPageIndex = parseInt(match[2], 10) || 0;
        if (match[3]) targetElementId = match[3];
      }
    } else {
      const savedLastRead = localStorage.getItem(STORAGE_KEYS.LAST_READ);
      if (savedLastRead) {
        try {
          state.lastRead = JSON.parse(savedLastRead);
          showResumeToast(state.lastRead);
        } catch (e) {}
      }
    }

    loadChapter(initialChapterId, initialPageIndex, targetElementId);

    // Re-paginate when web fonts finish downloading (solves Ctrl+F5 font loading shift)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (state.viewMode === 'book') {
          paginateCurrentChapter();
        }
      });
    }

    // Re-paginate when all external resources (images, fonts, stylesheets) are completely loaded
    window.addEventListener('load', () => {
      if (state.viewMode === 'book') {
        paginateCurrentChapter();
      }
    });

    // Guard against initial paint reflow delay
    setTimeout(() => {
      if (state.viewMode === 'book') {
        paginateCurrentChapter();
      }
    }, 250);
  }

  // --- DOM CACHING ---
  function cacheDomElements() {
    dom = {
      appContainer: document.getElementById('app-container'),
      topHeader: document.getElementById('top-header'),
      bottomBar: document.getElementById('bottom-bar'),
      readerWorkspace: document.getElementById('reader-workspace'),

      // Book Mode Containers
      bookStage: document.getElementById('book-stage'),
      bookContainer: document.getElementById('book-container'),
      pageLeft: document.getElementById('page-left'),
      pageRight: document.getElementById('page-right'),
      pageLeftContent: document.getElementById('page-left-content'),
      pageRightContent: document.getElementById('page-right-content'),
      pageLeftHeader: document.getElementById('page-left-header'),
      pageRightHeader: document.getElementById('page-right-header'),
      pageLeftFooter: document.getElementById('page-left-footer'),
      pageRightFooter: document.getElementById('page-right-footer'),
      navLeftZone: document.getElementById('nav-left-zone'),
      navRightZone: document.getElementById('nav-right-zone'),
      paginationRuler: document.getElementById('pagination-ruler'),

      // Scroll Mode Container
      scrollViewStage: document.getElementById('scroll-view-stage'),
      scrollContentBody: document.getElementById('scroll-content-body'),

      // Header Controls
      btnToggleToc: document.getElementById('btn-toggle-toc'),
      brandBookTitle: document.getElementById('brand-book-title'),
      btnChapterIndicator: document.getElementById('btn-chapter-indicator'),
      chapterIndicatorLabel: document.getElementById('chapter-indicator-label'),
      chapterIndicatorTitle: document.getElementById('chapter-indicator-title'),
      btnToggleViewMode: document.getElementById('btn-toggle-view-mode'),
      btnQuickBookmark: document.getElementById('btn-quick-bookmark'),
      btnBookmarksList: document.getElementById('btn-bookmarks-list'),
      bookmarksBadgeCounter: document.getElementById('bookmarks-badge-counter'),
      btnSearchModal: document.getElementById('btn-search-modal'),
      btnAudioNarration: document.getElementById('btn-audio-narration'),
      btnSettingsModal: document.getElementById('btn-settings-modal'),
      btnFullscreen: document.getElementById('btn-fullscreen'),

      // Bottom Bar
      progressFill: document.getElementById('progress-fill'),
      progressHandle: document.getElementById('progress-handle'),
      progressTrack: document.getElementById('progress-track'),
      progressScrubContainer: document.getElementById('progress-scrub-container'),
      progressTooltip: document.getElementById('progress-tooltip'),
      progressTextInfo: document.getElementById('progress-text-info'),
      progressChapterInfo: document.getElementById('progress-chapter-info'),
      progressRemainingTime: document.getElementById('progress-remaining-time'),
      bookProgressPill: document.getElementById('book-progress-pill'),
      btnPrevPage: document.getElementById('btn-prev-page'),
      btnNextPage: document.getElementById('btn-next-page'),
      btnPrevChapter: document.getElementById('btn-prev-chapter'),
      btnNextChapter: document.getElementById('btn-next-chapter'),

      // Drawers & Backdrop
      drawerBackdrop: document.getElementById('drawer-backdrop'),
      tocDrawer: document.getElementById('toc-drawer'),
      bookmarksDrawer: document.getElementById('bookmarks-drawer'),
      tocSearchInput: document.getElementById('toc-search-input'),
      tocListContainer: document.getElementById('toc-list-container'),
      bookmarksListContainer: document.getElementById('bookmarks-list-container'),

      // Modals
      darshanModal: document.getElementById('darshan-modal'),
      bookmarkModal: document.getElementById('bookmark-modal'),
      settingsModal: document.getElementById('settings-modal'),
      searchModal: document.getElementById('search-modal'),

      // Target Mode Banner
      targetModeBanner: document.getElementById('target-mode-banner'),
      btnCancelTargetMode: document.getElementById('btn-cancel-target-mode'),

      // Resume Toast
      resumeToast: document.getElementById('resume-toast'),
      resumeToastText: document.getElementById('resume-toast-text'),
      btnToastResume: document.getElementById('btn-toast-resume'),
      btnToastDismiss: document.getElementById('btn-toast-dismiss'),

      // Audio Player Bar
      audioPlayerBar: document.getElementById('audio-player-bar'),
      btnAudioPlayPause: document.getElementById('btn-audio-play-pause'),
      btnAudioStop: document.getElementById('btn-audio-stop'),
      audioSpeedSelect: document.getElementById('audio-speed-select'),
    };
  }

  // --- LOAD & SAVE PREFERENCES ---
  function loadPreferences() {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state.theme = parsed.theme || 'light';
        state.fontSize = parsed.fontSize || 17.5;
        state.fontFamily = parsed.fontFamily || 'literary';
        state.lineHeight = parsed.lineHeight || 1.7;
        state.soundEnabled = parsed.soundEnabled !== false;
        state.viewMode = parsed.viewMode || 'book';
        state.isDoublePage = parsed.isDoublePage !== false;
      } catch (e) {}
    }
    applyTheme(state.theme);
    applyTypography();
    updateViewModeUI();
  }

  function savePreferences() {
    const prefs = {
      theme: state.theme,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      lineHeight: state.lineHeight,
      soundEnabled: state.soundEnabled,
      viewMode: state.viewMode,
      isDoublePage: state.isDoublePage,
    };
    localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
  }

  function applyTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    document.querySelectorAll('.theme-swatch').forEach((el) => {
      el.classList.toggle('active', el.dataset.theme === themeName);
    });
    savePreferences();
  }

  function applyTypography() {
    const root = document.documentElement;
    root.style.setProperty('--reader-font-size', `${state.fontSize}px`);
    root.style.setProperty('--reader-line-height', `${state.lineHeight}`);

    let fontVal = 'var(--font-literary)';
    if (state.fontFamily === 'serif') fontVal = 'var(--font-serif)';
    if (state.fontFamily === 'sans') fontVal = 'var(--font-sans)';
    if (state.fontFamily === 'dyslexic') fontVal = 'var(--font-dyslexic)';
    root.style.setProperty('--reader-font', fontVal);

    savePreferences();
  }

  // --- BOOKMARKS & PROGRESS ---
  function loadBookmarks() {
    const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (saved) {
      try {
        state.bookmarks = JSON.parse(saved);
      } catch (e) {
        state.bookmarks = [];
      }
    }
    updateBookmarkBadge();
  }

  function saveBookmarks() {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
    updateBookmarkBadge();
    renderBookmarksDrawer();
  }

  function updateBookmarkBadge() {
    if (dom.bookmarksBadgeCounter) {
      dom.bookmarksBadgeCounter.textContent = state.bookmarks.length;
      dom.bookmarksBadgeCounter.style.display = state.bookmarks.length > 0 ? 'flex' : 'none';
    }
  }

  function loadProgress() {
    const saved = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (saved) {
      try {
        state.chapterProgress = JSON.parse(saved);
      } catch (e) {
        state.chapterProgress = {};
      }
    }
    updateBookProgressBadge();
  }

  function saveProgress(chapterId, percent) {
    state.chapterProgress[chapterId] = Math.max(state.chapterProgress[chapterId] || 0, percent);
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(state.chapterProgress));
    updateBookProgressBadge();
  }

  function updateBookProgressBadge() {
    if (!state.bookData) return;
    const totalChapters = state.bookData.chapters.length;
    let sumPercent = 0;

    state.bookData.chapters.forEach((ch) => {
      const p = state.chapterProgress[ch.id] || 0;
      sumPercent += p;
    });

    const overall = Math.round(sumPercent / totalChapters);
    if (dom.bookProgressPill) {
      dom.bookProgressPill.innerHTML = `<span>🕉️</span> <span>Book: ${overall}%</span>`;
    }
  }

  // --- RESPONSIVE LAYOUT DETECTION ---
  function setupResponsiveLayout() {
    const checkWidth = () => {
      const width = window.innerWidth;
      const shouldDouble = width >= 900 && state.isDoublePage;
      if (dom.pageLeft) {
        dom.pageLeft.style.display = shouldDouble ? 'flex' : 'none';
      }
      const spine = document.querySelector('.book-spine');
      if (spine) spine.style.display = shouldDouble ? 'block' : 'none';
    };

    window.addEventListener('resize', () => {
      checkWidth();
      paginateCurrentChapter();
    });
    checkWidth();
  }

  // --- ELEMENT HTML BUILDER ---
  function renderElementHtml(el, isContinuation = false) {
    if (el.type === 'card') {
      return el.html;
    }
    if (el.type === 'heading') {
      return `<h2 class="reader-heading" id="${el.id}">${escapeHtml(el.text)}</h2>`;
    }
    if (el.type === 'image') {
      return `
        <div class="reader-image-wrap" id="${el.id}">
          <img src="${el.src}" alt="${escapeHtml(el.alt || '')}" width="160" height="207" style="width: 160px; height: 207px; object-fit: contain;">
          ${el.caption ? `<div class="reader-image-caption">${escapeHtml(el.caption)}</div>` : ''}
        </div>`;
    }
    if (el.type === 'verse') {
      return `<div class="reader-verse" id="${el.id}">${escapeHtml(el.text)}</div>`;
    }
    if (el.type === 'benediction') {
      return `<div class="reader-benediction" id="${el.id}">${escapeHtml(el.text)}</div>`;
    }

    // Normal paragraph
    const dropCapClass = el.isFirstOfChapter && !isContinuation && state.dropCapsEnabled ? 'has-dropcap' : '';
    const noIndentClass = isContinuation ? 'no-indent' : '';
    const origId = el.originalId || el.id;

    return `
      <p class="reader-paragraph ${dropCapClass} ${noIndentClass}" id="${el.id}" data-original-id="${origId}" data-text="${escapeHtml(el.text.substring(0, 100))}">
        ${!isContinuation ? `<button class="para-bookmark-trigger" title="Bookmark this paragraph" data-el-id="${origId}">🔖</button>` : ''}
        <span class="para-body-text">${escapeHtml(el.text)}</span>
      </p>`;
  }

  // --- DYNAMIC DOM MEASUREMENT PAGINATION ENGINE (NO CUT-OFF CONTENT) ---
  function paginateCurrentChapter() {
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter) return;

    if (dom.bookStage) dom.bookStage.style.display = 'flex';
    if (dom.scrollViewStage) dom.scrollViewStage.classList.remove('active');

    // Measure target content area dimensions
    let targetWidth = dom.pageRightContent.clientWidth;
    let targetHeight = dom.pageRightContent.clientHeight;

    if (!targetHeight || targetHeight < 200) {
      const bookH = dom.bookContainer.clientHeight || 650;
      targetHeight = Math.max(380, bookH - 120);
    }
    if (!targetWidth || targetWidth < 200) {
      const isDouble = window.innerWidth >= 900 && state.isDoublePage;
      const bookW = dom.bookContainer.clientWidth || 920;
      targetWidth = isDouble ? bookW / 2 - 84 : bookW - 60;
    }

    // Safe Target Height: leaves a 24px safety buffer so lines never touch bottom or clip on hard reload
    const safeTargetHeight = Math.max(320, targetHeight - 24);

    const ruler = dom.paginationRuler;
    ruler.style.width = `${targetWidth}px`;
    ruler.style.fontSize = `${state.fontSize}px`;
    ruler.style.lineHeight = `${state.lineHeight}`;
    ruler.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--reader-font');
    ruler.style.textAlign = state.textAlign;

    // Build complete content queue for this chapter
    const queue = [];

    // 1. Chapter Opening Title Card on Page 1 (No word count, clean header)
    queue.push({
      type: 'card',
      id: `ch${chapter.id}-header-card`,
      html: `
        <div class="chapter-opening-card">
          <div class="chapter-opening-number">${escapeHtml(chapter.chapterLabel)}</div>
          <h1 class="chapter-opening-title">${escapeHtml(chapter.title)}</h1>
          ${chapter.subtitle ? `<div class="chapter-opening-subtitle">${escapeHtml(chapter.subtitle)}</div>` : ''}
          <div class="chapter-meta-pills">
            <span class="meta-pill">📖 ~${chapter.readingTime} min read</span>
          </div>
        </div>
      `,
    });

    // 2. Chapter elements (headings, paragraphs, etc.)
    let firstParaSeen = false;
    chapter.elements.forEach((el) => {
      const isFirst = !firstParaSeen && el.type === 'paragraph';
      if (isFirst) firstParaSeen = true;
      queue.push({
        ...el,
        isFirstOfChapter: isFirst,
        originalId: el.id,
      });
    });

    const pages = [];
    let currentPage = [];
    ruler.innerHTML = '';

    while (queue.length > 0) {
      const el = queue.shift();
      const isCont = !!el.isSplitContinuation;
      const testHtml = renderElementHtml(el, isCont);

      // Test appending to ruler
      ruler.innerHTML += testHtml;

      if (ruler.scrollHeight <= safeTargetHeight) {
        // Fits completely on current page
        currentPage.push(el);
      } else {
        // Does not fit!
        // For non-paragraphs (heading, card, image, benediction):
        if (['heading', 'card', 'image', 'benediction'].includes(el.type)) {
          if (currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            ruler.innerHTML = '';
            queue.unshift(el); // place at top of next page
            continue;
          } else {
            // Fresh page and slightly overflows: force on page to avoid infinite loop
            currentPage.push(el);
            pages.push(currentPage);
            currentPage = [];
            ruler.innerHTML = '';
            continue;
          }
        }

        // For paragraphs and verses: test how many words can fit on current page
        const words = el.text.split(' ');

        // Check remaining space before adding this paragraph
        ruler.innerHTML = currentPage.map((item) => renderElementHtml(item, item.isSplitContinuation)).join('');
        const remainingSpace = safeTargetHeight - ruler.scrollHeight;

        // If remaining vertical space is less than 50px (~2 lines) and page has content,
        // move the whole paragraph to the next page for clean appearance!
        if (remainingSpace < 50 && currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          ruler.innerHTML = '';
          queue.unshift(el);
          continue;
        }

        // Binary search for maximum words that fit cleanly
        let low = 1;
        let high = words.length - 1;
        let bestCount = 0;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const testPartText = words.slice(0, mid).join(' ');
          const testPartEl = { ...el, text: testPartText };
          const testPartHtml = renderElementHtml(testPartEl, isCont);

          ruler.innerHTML =
            currentPage.map((item) => renderElementHtml(item, item.isSplitContinuation)).join('') + testPartHtml;

          if (ruler.scrollHeight <= safeTargetHeight) {
            bestCount = mid;
            low = mid + 1; // Try fitting more
          } else {
            high = mid - 1; // Too much
          }
        }

        if (bestCount >= 10) {
          // Clean split: Part 1 fits on current page, Part 2 goes to next page!
          const part1 = words.slice(0, bestCount).join(' ');
          const part2 = words.slice(bestCount).join(' ');

          currentPage.push({
            ...el,
            text: part1,
            isSplitStart: true,
          });

          pages.push(currentPage);
          currentPage = [];
          ruler.innerHTML = '';

          // Re-queue Part 2 as continuation on next page
          queue.unshift({
            ...el,
            id: el.id,
            originalId: el.originalId || el.id,
            text: part2,
            isSplitContinuation: true,
            isFirstOfChapter: false,
          });
        } else {
          // Less than 10 words fit: push entire paragraph to next page
          if (currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            ruler.innerHTML = '';
            queue.unshift(el);
          } else {
            // Paragraph alone exceeds an empty page: force it
            currentPage.push(el);
            pages.push(currentPage);
            currentPage = [];
            ruler.innerHTML = '';
          }
        }
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    ruler.innerHTML = '';
    state.pageSlices = pages.length > 0 ? pages : [chapter.elements];
    state.totalPages = state.pageSlices.length;

    if (state.currentPageIndex >= state.totalPages) {
      state.currentPageIndex = Math.max(0, state.totalPages - 1);
    }

    renderCurrentPages();
  }

  // --- RENDER PAGES (BOOK MODE) ---
  function renderCurrentPages(animationClass) {
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter) return;

    const width = window.innerWidth;
    const isDouble = width >= 900 && state.isDoublePage;

    if (isDouble) {
      // Double-Page Spread: Even index left, odd index right
      let leftIdx = state.currentPageIndex;
      if (leftIdx % 2 !== 0) leftIdx -= 1;
      state.currentPageIndex = leftIdx;

      const rightIdx = leftIdx + 1;

      renderSinglePage(dom.pageLeftContent, dom.pageLeftHeader, dom.pageLeftFooter, chapter, leftIdx, 'left');
      if (rightIdx < state.totalPages) {
        dom.pageRight.style.visibility = 'visible';
        renderSinglePage(dom.pageRightContent, dom.pageRightHeader, dom.pageRightFooter, chapter, rightIdx, 'right');
      } else {
        dom.pageRight.style.visibility = 'hidden';
        dom.pageRightContent.innerHTML = '';
      }
    } else {
      // Single Page Mode
      if (dom.pageLeft) dom.pageLeft.style.display = 'none';
      dom.pageRight.style.visibility = 'visible';
      renderSinglePage(
        dom.pageRightContent,
        dom.pageRightHeader,
        dom.pageRightFooter,
        chapter,
        state.currentPageIndex,
        'single'
      );
    }

    if (animationClass && dom.bookContainer) {
      dom.bookContainer.classList.remove('page-flip-next', 'page-flip-prev');
      void dom.bookContainer.offsetWidth;
      dom.bookContainer.classList.add(animationClass);
    }

    updateHeaderAndProgress();
    highlightBookmarkedElements();
  }

  function renderSinglePage(contentContainer, headerContainer, footerContainer, chapter, pageIndex, pageSide) {
    if (!contentContainer) return;

    // Running Header (Keeps Roman numerals intact)
    if (headerContainer) {
      if (pageSide === 'left') {
        headerContainer.innerHTML = `<span>Shri Sai Satcharitra</span> <span>${chapter.chapterLabel}</span>`;
      } else {
        headerContainer.innerHTML = `<span>${chapter.title}</span> <span>❖</span>`;
      }
    }

    // Running Footer (Page Number)
    if (footerContainer) {
      footerContainer.textContent = `Page ${pageIndex + 1} of ${state.totalPages}`;
    }

    // Elements
    const elements = state.pageSlices[pageIndex] || [];
    let html = '';

    elements.forEach((el) => {
      html += renderElementHtml(el, el.isSplitContinuation);
    });

    contentContainer.innerHTML = html;
  }

  // --- RENDER SCROLL MODE ---
  function renderScrollMode() {
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter || !dom.scrollContentBody) return;

    if (dom.bookStage) dom.bookStage.style.display = 'none';
    if (dom.scrollViewStage) dom.scrollViewStage.classList.add('active');

    let html = `
      <div class="chapter-header-card">
        <div class="chapter-header-number">${escapeHtml(chapter.chapterLabel)}</div>
        <h1 class="chapter-header-title">${escapeHtml(chapter.title)}</h1>
        ${chapter.subtitle ? `<div class="chapter-header-subtitle">${escapeHtml(chapter.subtitle)}</div>` : ''}
        <div class="chapter-meta-pills">
          <span class="meta-pill">📖 ~${chapter.readingTime} min read</span>
          <span class="meta-pill">🪔 Chapter ${chapter.id} of ${state.bookData.chapters.length}</span>
        </div>
      </div>
    `;

    chapter.elements.forEach((el, idx) => {
      const isFirst = idx === 0 && el.type === 'paragraph';
      const dropCapClass = isFirst && state.dropCapsEnabled ? 'has-dropcap' : '';

      if (el.type === 'heading') {
        html += `<h2 class="reader-heading" id="${el.id}">${escapeHtml(el.text)}</h2>`;
      } else if (el.type === 'image') {
        html += `
          <div class="reader-image-wrap" id="${el.id}">
            <img src="${el.src}" alt="${escapeHtml(el.alt || '')}">
            ${el.caption ? `<div class="reader-image-caption">${escapeHtml(el.caption)}</div>` : ''}
          </div>`;
      } else if (el.type === 'verse') {
        html += `<div class="reader-verse" id="${el.id}">${escapeHtml(el.text)}</div>`;
      } else if (el.type === 'benediction') {
        html += `<div class="reader-benediction" id="${el.id}">${escapeHtml(el.text)}</div>`;
      } else {
        html += `
          <p class="reader-paragraph ${dropCapClass}" id="${el.id}">
            <button class="para-bookmark-trigger" title="Bookmark this paragraph" data-el-id="${el.id}">🔖</button>
            <span class="para-body-text">${escapeHtml(el.text)}</span>
          </p>`;
      }
    });

    const isLast = chapter.id === state.bookData.chapters.length;
    html += `
      <div style="text-align: center; padding: 40px 0 20px;">
        ${
          isLast
            ? `<div style="font-family: var(--font-serif); font-size: 1.2rem; color: var(--accent-gold);">❖ End of Shri Sai Satcharitra ❖</div>`
            : `<button class="primary-btn" id="btn-scroll-next-chapter" style="padding: 10px 24px; font-size: 1rem;">Continue to Next Chapter ➔</button>`
        }
      </div>
    `;

    dom.scrollContentBody.innerHTML = html;
    dom.scrollViewStage.scrollTop = 0;

    const nextBtn = document.getElementById('btn-scroll-next-chapter');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => nextChapter());
    }

    highlightBookmarkedElements();
  }

  // --- HIGHLIGHT BOOKMARKS & SAVE POINTS ---
  function highlightBookmarkedElements() {
    document.querySelectorAll('.bookmark-badge').forEach((b) => b.remove());
    document.querySelectorAll('.reader-paragraph.bookmarked').forEach((p) => p.classList.remove('bookmarked'));

    const chapterBookmarks = state.bookmarks.filter((b) => b.chapterId === state.currentChapterId);
    chapterBookmarks.forEach((bm) => {
      // Find elements with exact id or matching data-original-id
      const targets = document.querySelectorAll(`[id="${bm.elementId}"], [data-original-id="${bm.elementId}"]`);
      targets.forEach((el) => {
        el.classList.add('bookmarked');
        if (!el.querySelector('.bookmark-badge')) {
          const badge = document.createElement('div');
          badge.className = 'bookmark-badge';
          badge.innerHTML = `🔖 <span>${escapeHtml(bm.note || 'Save Point')}</span>`;
          badge.addEventListener('click', () => openBookmarksDrawer());
          el.prepend(badge);
        }
      });
    });
  }

  // --- CHAPTER & PAGE NAVIGATION ---
  function loadChapter(chapterId, pageIndex = 0, targetElementId = null) {
    if (!state.bookData) return;
    const chapter = state.bookData.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    state.currentChapterId = chapterId;
    state.currentPageIndex = pageIndex;

    history.replaceState(null, '', `#ch${chapterId}-p${pageIndex}`);

    if (state.viewMode === 'book') {
      paginateCurrentChapter();
    } else {
      renderScrollMode();
    }

    // Exact Bookmark / Save Point jumping
    if (targetElementId) {
      if (state.viewMode === 'book') {
        // Find which page slice contains targetElementId
        let foundPage = 0;
        for (let i = 0; i < state.pageSlices.length; i++) {
          const slice = state.pageSlices[i];
          const hasTarget = slice.some((e) => e.id === targetElementId || e.originalId === targetElementId);
          if (hasTarget) {
            foundPage = i;
            break;
          }
        }
        goToPage(foundPage);
      }

      setTimeout(() => {
        focusAndPulseElement(targetElementId);
      }, 150);
    }

    saveCurrentReadingState();
    closeAllDrawers();
  }

  function nextPage() {
    if (state.viewMode === 'scroll') {
      nextChapter();
      return;
    }

    const isDouble = window.innerWidth >= 900 && state.isDoublePage;
    const increment = isDouble ? 2 : 1;

    if (state.currentPageIndex + increment < state.totalPages) {
      state.currentPageIndex += increment;
      renderCurrentPages('page-flip-next');
      playPageTurnSound();
      saveCurrentReadingState();
    } else {
      if (state.currentChapterId < state.bookData.chapters.length) {
        loadChapter(state.currentChapterId + 1, 0);
        playPageTurnSound();
      }
    }
  }

  function prevPage() {
    if (state.viewMode === 'scroll') {
      prevChapter();
      return;
    }

    const isDouble = window.innerWidth >= 900 && state.isDoublePage;
    const decrement = isDouble ? 2 : 1;

    if (state.currentPageIndex - decrement >= 0) {
      state.currentPageIndex -= decrement;
      renderCurrentPages('page-flip-prev');
      playPageTurnSound();
      saveCurrentReadingState();
    } else {
      if (state.currentChapterId > 1) {
        loadChapter(state.currentChapterId - 1, 9999);
        playPageTurnSound();
      }
    }
  }

  function nextChapter() {
    if (state.currentChapterId < state.bookData.chapters.length) {
      loadChapter(state.currentChapterId + 1, 0);
      playPageTurnSound();
    }
  }

  function prevChapter() {
    if (state.currentChapterId > 1) {
      loadChapter(state.currentChapterId - 1, 0);
      playPageTurnSound();
    }
  }

  function goToPage(pageIdx) {
    state.currentPageIndex = Math.max(0, Math.min(pageIdx, state.totalPages - 1));
    renderCurrentPages('page-flip-next');
    saveCurrentReadingState();
  }

  // --- SAVE CURRENT READING STATE ---
  function saveCurrentReadingState() {
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter) return;

    let firstElementId = null;
    if (state.pageSlices[state.currentPageIndex] && state.pageSlices[state.currentPageIndex][0]) {
      firstElementId = state.pageSlices[state.currentPageIndex][0].originalId || state.pageSlices[state.currentPageIndex][0].id;
    }

    state.lastRead = {
      chapterId: state.currentChapterId,
      chapterLabel: chapter.chapterLabel,
      chapterTitle: chapter.title,
      pageIndex: state.currentPageIndex,
      elementId: firstElementId,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(state.lastRead));

    const percent = Math.min(100, Math.round(((state.currentPageIndex + 1) / state.totalPages) * 100));
    saveProgress(state.currentChapterId, percent);
  }

  // --- FOCUS AND PULSE ELEMENT ---
  function focusAndPulseElement(elId) {
    let el = document.getElementById(elId);
    if (!el) {
      el = document.querySelector(`[data-original-id="${elId}"]`);
    }
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('savepoint-pulse');

    const removePulse = () => {
      el.classList.remove('savepoint-pulse');
      document.removeEventListener('click', removePulse);
    };

    setTimeout(removePulse, 7000);
    document.addEventListener('click', removePulse, { once: true });
  }

  // --- HEADER & PROGRESS UPDATES ---
  function updateHeaderAndProgress() {
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter) return;

    // Header Pills (Roman numerals preserved here)
    if (dom.chapterIndicatorLabel) dom.chapterIndicatorLabel.textContent = chapter.chapterLabel;
    if (dom.chapterIndicatorTitle) dom.chapterIndicatorTitle.textContent = `: ${chapter.title}`;

    const progressPercent = Math.min(100, Math.round(((state.currentPageIndex + 1) / state.totalPages) * 100));
    if (dom.progressFill) dom.progressFill.style.width = `${progressPercent}%`;
    if (dom.progressHandle) dom.progressHandle.style.left = `${progressPercent}%`;

    const remainingFraction = 1 - (state.currentPageIndex + 1) / state.totalPages;
    const minsLeft = Math.max(1, Math.round(chapter.readingTime * remainingFraction));

    if (dom.progressChapterInfo) {
      dom.progressChapterInfo.textContent = `${chapter.chapterLabel} • Page ${state.currentPageIndex + 1} of ${state.totalPages} (${progressPercent}%)`;
    }
    if (dom.progressRemainingTime) {
      dom.progressRemainingTime.textContent = `~${minsLeft} min left`;
    }

    const isFirstPage = state.currentPageIndex === 0 && state.currentChapterId === 1;
    const isLastPage =
      state.currentPageIndex >= state.totalPages - 1 && state.currentChapterId === state.bookData.chapters.length;

    if (dom.btnPrevPage) dom.btnPrevPage.disabled = isFirstPage;
    if (dom.btnNextPage) dom.btnNextPage.disabled = isLastPage;
    if (dom.btnPrevChapter) dom.btnPrevChapter.disabled = state.currentChapterId === 1;
    if (dom.btnNextChapter) dom.btnNextChapter.disabled = state.currentChapterId === state.bookData.chapters.length;

    document.querySelectorAll('.toc-chapter-card').forEach((card) => {
      const cId = parseInt(card.dataset.chapterId, 10);
      card.classList.toggle('current', cId === state.currentChapterId);
    });
  }

  // --- BOOKMARK & SAVE POINT DIALOG / CREATION ---
  function openBookmarkModal(targetElId = null) {
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter) return;

    let el = null;
    if (targetElId) {
      el = document.getElementById(targetElId) || document.querySelector(`[data-original-id="${targetElId}"]`);
    } else {
      if (state.pageSlices[state.currentPageIndex] && state.pageSlices[state.currentPageIndex][0]) {
        const firstEl = state.pageSlices[state.currentPageIndex].find((e) => e.type === 'paragraph');
        if (firstEl) {
          el = document.getElementById(firstEl.id) || document.querySelector(`[data-original-id="${firstEl.id}"]`);
        }
      }
    }

    const snippetText = el ? el.querySelector('.para-body-text')?.textContent || el.textContent : chapter.title;
    const elIdToSave = el ? el.dataset.originalId || el.id : `c${state.currentChapterId}-p1`;

    const modalBody = dom.bookmarkModal.querySelector('.modal-body');
    modalBody.innerHTML = `
      <div class="bookmark-option-cards">
        <div class="bookmark-option-card selected" id="opt-current-pos">
          <div class="bookmark-option-icon">📍</div>
          <div class="bookmark-option-title">Current Spot</div>
          <div class="bookmark-option-desc">Bookmark page ${state.currentPageIndex + 1}</div>
        </div>
        <div class="bookmark-option-card" id="opt-pick-text">
          <div class="bookmark-option-icon">👆</div>
          <div class="bookmark-option-title">Pick in Text</div>
          <div class="bookmark-option-desc">Click any paragraph in text</div>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">Selected Text Preview</label>
        <div class="snippet-preview-box" id="bm-snippet-preview">"${escapeHtml(snippetText.substring(0, 160))}..."</div>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="bm-note-input">Custom Note / Save Point Label (Optional)</label>
        <input type="text" id="bm-note-input" placeholder="e.g. Baba's words on Shraddha & Saburi" value="Save Point: Page ${state.currentPageIndex + 1}">
      </div>
    `;

    const optCurrent = document.getElementById('opt-current-pos');
    const optPick = document.getElementById('opt-pick-text');

    optCurrent.addEventListener('click', () => {
      optCurrent.classList.add('selected');
      optPick.classList.remove('selected');
    });

    optPick.addEventListener('click', () => {
      closeModal(dom.bookmarkModal);
      enterTargetPickingMode();
    });

    const footer = dom.bookmarkModal.querySelector('.modal-footer');
    footer.innerHTML = `
      <button class="text-btn" id="btn-cancel-bm">Cancel</button>
      <button class="primary-btn" id="btn-save-bm">Save Bookmark</button>
    `;

    document.getElementById('btn-cancel-bm').addEventListener('click', () => closeModal(dom.bookmarkModal));
    document.getElementById('btn-save-bm').addEventListener('click', () => {
      const note = document.getElementById('bm-note-input').value.trim() || `Page ${state.currentPageIndex + 1}`;
      createBookmark(state.currentChapterId, elIdToSave, state.currentPageIndex, snippetText, note);
      closeModal(dom.bookmarkModal);
    });

    openModal(dom.bookmarkModal);
  }

  function createBookmark(chapterId, elementId, pageIndex, snippet, note) {
    const chapter = state.bookData.chapters.find((c) => c.id === chapterId);
    const newBm = {
      id: 'bm_' + Date.now(),
      chapterId: chapterId,
      chapterLabel: chapter ? chapter.chapterLabel : `Chapter ${chapterId}`,
      chapterTitle: chapter ? chapter.title : '',
      elementId: elementId,
      pageIndex: pageIndex,
      snippet: snippet.substring(0, 180),
      note: note,
      timestamp: Date.now(),
    };

    state.bookmarks = state.bookmarks.filter((b) => b.elementId !== elementId);
    state.bookmarks.unshift(newBm);
    saveBookmarks();

    focusAndPulseElement(elementId);
    highlightBookmarkedElements();
    showToast(`Bookmark saved: "${note}"`);
  }

  function deleteBookmark(bmId) {
    state.bookmarks = state.bookmarks.filter((b) => b.id !== bmId);
    saveBookmarks();
    highlightBookmarkedElements();
  }

  // --- TARGET PICKING MODE ("Pick in Text") ---
  function enterTargetPickingMode() {
    state.targetPickMode = true;
    if (dom.targetModeBanner) dom.targetModeBanner.classList.add('active');
    dom.readerWorkspace.classList.add('target-picking-mode');

    const onParaClick = (e) => {
      const para = e.target.closest('.reader-paragraph');
      if (!para) return;

      e.stopPropagation();
      exitTargetPickingMode();

      const elId = para.dataset.originalId || para.id;
      const snippet = para.querySelector('.para-body-text')?.textContent || para.textContent;
      const note = `Saved at: "${snippet.substring(0, 30)}..."`;

      createBookmark(state.currentChapterId, elId, state.currentPageIndex, snippet, note);
    };

    dom.readerWorkspace.addEventListener('click', onParaClick, { once: true });
    state._cancelTargetPick = () => {
      dom.readerWorkspace.removeEventListener('click', onParaClick);
      exitTargetPickingMode();
    };
  }

  function exitTargetPickingMode() {
    state.targetPickMode = false;
    if (dom.targetModeBanner) dom.targetModeBanner.classList.remove('active');
    dom.readerWorkspace.classList.remove('target-picking-mode');
  }

  // --- RESUME READING TOAST NOTIFICATION ---
  function showResumeToast(lastRead) {
    if (!lastRead || !dom.resumeToast) return;

    dom.resumeToastText.textContent = `You last left off at ${lastRead.chapterLabel}, Page ${lastRead.pageIndex + 1} ("${lastRead.chapterTitle}")`;
    dom.resumeToast.classList.add('active');

    dom.btnToastResume.onclick = () => {
      dom.resumeToast.classList.remove('active');
      loadChapter(lastRead.chapterId, lastRead.pageIndex, lastRead.elementId);
    };

    dom.btnToastDismiss.onclick = () => {
      dom.resumeToast.classList.remove('active');
    };

    setTimeout(() => {
      if (dom.resumeToast) dom.resumeToast.classList.remove('active');
    }, 10000);
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 74px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--text-main);
      color: var(--bg-surface);
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 0.88rem;
      font-weight: 600;
      z-index: 200;
      box-shadow: 0 4px 15px rgba(0,0,0,0.25);
      animation: fadeIn 0.25s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // --- TABLE OF CONTENTS RENDERING (WITH SAI BABA PHOTO FIRST & NORMAL NUMBERS) ---
  function renderTableOfContents(filterText = '') {
    if (!state.bookData || !dom.tocListContainer) return;

    const query = filterText.toLowerCase().trim();

    let html = '';

    // First item: Sacred Sai Baba Darshan Card
    if (!query) {
      html += `
        <div class="toc-darshan-card" id="toc-darshan-item" title="Click to view high-resolution photo of Shri Sai Baba">
          <img src="assets/images/sai_avatar.jpg" alt="Shri Sai Baba" class="toc-darshan-avatar">
          <div class="toc-darshan-info">
            <div class="toc-darshan-title">Shri Sai Baba of Shirdi</div>
            <div class="toc-darshan-subtitle">Sacred Darshan & Photo • Click to View</div>
          </div>
          <span class="toc-darshan-badge">Darshan 🪔</span>
        </div>
      `;
    }

    const filtered = state.bookData.chapters.filter((ch) => {
      if (!query) return true;
      const arabicLabel = formatChapterNumberForTOC(ch).toLowerCase();
      return (
        arabicLabel.includes(query) ||
        ch.chapterLabel.toLowerCase().includes(query) ||
        ch.title.toLowerCase().includes(query) ||
        (ch.subtitle && ch.subtitle.toLowerCase().includes(query)) ||
        (ch.topics && ch.topics.some((t) => t.toLowerCase().includes(query)))
      );
    });

    if (filtered.length === 0) {
      html += `
        <div style="text-align: center; padding: 30px; color: var(--text-light); font-size: 0.9rem;">
          No matching chapters found.
        </div>`;
      dom.tocListContainer.innerHTML = html;
      bindTocDarshanBtn();
      return;
    }

    filtered.forEach((ch) => {
      const isCurrent = ch.id === state.currentChapterId;
      const progress = state.chapterProgress[ch.id] || 0;
      const isDone = progress >= 95;

      // Normal numbers in TOC list as requested (e.g. Chapter 1, Chapter 2)
      const normalNumberLabel = formatChapterNumberForTOC(ch);

      html += `
        <div class="toc-chapter-card ${isCurrent ? 'current' : ''}" data-chapter-id="${ch.id}">
          <div class="toc-card-header">
            <span class="toc-chapter-num">${escapeHtml(normalNumberLabel)}</span>
            <span class="toc-reading-time">
              ${isDone ? '✓ Completed' : progress > 0 ? `${progress}% read` : `~${ch.readingTime} min`}
            </span>
          </div>
          <div class="toc-chapter-title">${escapeHtml(ch.title)}</div>
          ${ch.subtitle ? `<div class="toc-chapter-desc">${escapeHtml(ch.subtitle)}</div>` : ''}
        </div>
      `;
    });

    dom.tocListContainer.innerHTML = html;
    bindTocDarshanBtn();

    dom.tocListContainer.querySelectorAll('.toc-chapter-card').forEach((card) => {
      card.addEventListener('click', () => {
        const chId = parseInt(card.dataset.chapterId, 10);
        loadChapter(chId, 0);
      });
    });
  }

  function bindTocDarshanBtn() {
    const btn = document.getElementById('toc-darshan-item');
    if (btn) {
      btn.addEventListener('click', () => {
        closeAllDrawers();
        openModal(dom.darshanModal);
      });
    }
  }

  // --- BOOKMARKS DRAWER RENDERING ---
  function renderBookmarksDrawer() {
    if (!dom.bookmarksListContainer) return;

    if (state.bookmarks.length === 0) {
      dom.bookmarksListContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🔖</div>
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; color: var(--text-main);">No Bookmarks Yet</div>
          <div style="font-size: 0.82rem; line-height: 1.4;">
            Click the "Bookmark" button in the top toolbar or hover over any paragraph to set a save point!
          </div>
        </div>`;
      return;
    }

    let html = '';
    state.bookmarks.forEach((bm) => {
      const dateStr = new Date(bm.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      html += `
        <div class="bookmark-card" data-bm-id="${bm.id}" data-chapter-id="${bm.chapterId}" data-page="${bm.pageIndex}" data-el-id="${bm.elementId}">
          <div class="bookmark-card-top">
            <span class="bookmark-ch-tag">${escapeHtml(bm.chapterLabel)} • Page ${bm.pageIndex + 1}</span>
            <span class="bookmark-date">${dateStr}</span>
          </div>
          <div class="bookmark-note-text">${escapeHtml(bm.note || 'Save Point')}</div>
          ${bm.snippet ? `<div class="bookmark-snippet">"${escapeHtml(bm.snippet)}"</div>` : ''}
          <div class="bookmark-actions">
            <button class="bookmark-action-btn btn-delete-bm" data-bm-id="${bm.id}">Delete</button>
          </div>
        </div>
      `;
    });

    dom.bookmarksListContainer.innerHTML = html;

    // Click card to jump to bookmark paragraph
    dom.bookmarksListContainer.querySelectorAll('.bookmark-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-bm')) {
          e.stopPropagation();
          deleteBookmark(e.target.dataset.bmId);
          return;
        }
        const chId = parseInt(card.dataset.chapterId, 10);
        const elId = card.dataset.elId;
        loadChapter(chId, 0, elId);
      });
    });
  }

  // --- FULL-TEXT SEARCH MODAL ---
  function executeBookSearch(query) {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;

    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) {
      resultsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-light);">Type at least 2 characters to search across the entire book...</div>`;
      return;
    }

    const matches = [];
    state.bookData.chapters.forEach((ch) => {
      ch.elements.forEach((el) => {
        if (el.text && el.text.toLowerCase().includes(q)) {
          matches.push({
            chapterId: ch.id,
            chapterLabel: ch.chapterLabel,
            chapterTitle: ch.title,
            elementId: el.id,
            text: el.text,
          });
        }
      });
    });

    if (matches.length === 0) {
      resultsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-light);">No matches found for "${escapeHtml(query)}"</div>`;
      return;
    }

    let html = `<div style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 8px;">Found ${matches.length} matching passages:</div>`;

    matches.slice(0, 40).forEach((m) => {
      const idx = m.text.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 50);
      const end = Math.min(m.text.length, idx + q.length + 60);
      let snippet = m.text.substring(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < m.text.length) snippet = snippet + '...';

      const regex = new RegExp(`(${escapeRegExp(q)})`, 'gi');
      const highlightedSnippet = escapeHtml(snippet).replace(regex, '<mark>$1</mark>');

      html += `
        <div class="search-result-item" data-ch-id="${m.chapterId}" data-el-id="${m.elementId}">
          <div class="search-result-header">${escapeHtml(m.chapterLabel)}: ${escapeHtml(m.chapterTitle)}</div>
          <div class="search-result-snippet">${highlightedSnippet}</div>
        </div>
      `;
    });

    resultsContainer.innerHTML = html;

    resultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const chId = parseInt(item.dataset.chId, 10);
        const elId = item.dataset.elId;
        closeModal(dom.searchModal);
        loadChapter(chId, 0, elId);
      });
    });
  }

  // --- AUDIO NARRATION (TEXT-TO-SPEECH) ---
  function toggleAudioNarration() {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (state.isSpeaking) {
      stopAudioNarration();
    } else {
      startAudioNarration();
    }
  }

  function startAudioNarration() {
    window.speechSynthesis.cancel();
    const chapter = state.bookData.chapters.find((c) => c.id === state.currentChapterId);
    if (!chapter) return;

    let textToRead = '';
    if (state.viewMode === 'book' && state.pageSlices[state.currentPageIndex]) {
      textToRead = state.pageSlices[state.currentPageIndex]
        .map((el) => el.text)
        .filter(Boolean)
        .join('. ');
    } else {
      textToRead = chapter.elements
        .map((el) => el.text)
        .filter(Boolean)
        .join('. ');
    }

    state.speechUtterance = new SpeechSynthesisUtterance(textToRead);
    state.speechUtterance.rate = state.speechRate;

    state.speechUtterance.onstart = () => {
      state.isSpeaking = true;
      if (dom.audioPlayerBar) dom.audioPlayerBar.classList.add('active');
      if (dom.btnAudioPlayPause) dom.btnAudioPlayPause.textContent = '⏸ Pause';
    };

    state.speechUtterance.onend = () => {
      state.isSpeaking = false;
      if (dom.audioPlayerBar) dom.audioPlayerBar.classList.remove('active');
    };

    state.speechUtterance.onerror = () => {
      state.isSpeaking = false;
      if (dom.audioPlayerBar) dom.audioPlayerBar.classList.remove('active');
    };

    window.speechSynthesis.speak(state.speechUtterance);
  }

  function stopAudioNarration() {
    window.speechSynthesis.cancel();
    state.isSpeaking = false;
    if (dom.audioPlayerBar) dom.audioPlayerBar.classList.remove('active');
    if (dom.btnAudioPlayPause) dom.btnAudioPlayPause.textContent = '▶ Play';
  }

  // --- WEB AUDIO API: SYNTHESIZED PAPER FLIP SOUND ---
  let audioCtx = null;
  function playPageTurnSound() {
    if (!state.soundEnabled) return;

    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if (!audioCtx) return;

      const bufferSize = audioCtx.sampleRate * 0.12;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.12);
      filter.Q.value = 1.2;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
    } catch (e) {}
  }

  // --- MODAL UTILS ---
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('active');
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
  }

  function openTocDrawer() {
    closeAllDrawers();
    dom.drawerBackdrop.classList.add('active');
    dom.tocDrawer.classList.add('active');
  }

  function openBookmarksDrawer() {
    closeAllDrawers();
    renderBookmarksDrawer();
    dom.drawerBackdrop.classList.add('active');
    dom.bookmarksDrawer.classList.add('active');
  }

  function openMobileMenu() {
    closeAllDrawers();
    const sheet = document.getElementById('mobile-menu-sheet');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sheet) sheet.classList.add('active');
    if (overlay) overlay.classList.add('active');
  }

  function closeMobileMenu() {
    const sheet = document.getElementById('mobile-menu-sheet');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sheet) sheet.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  function toggleViewMode(forcedMode) {
    if (forcedMode) {
      state.viewMode = forcedMode;
    } else {
      state.viewMode = state.viewMode === 'book' ? 'scroll' : 'book';
    }
    updateViewModeUI();

    if (state.viewMode === 'book') {
      dom.bookStage.style.display = 'flex';
      dom.scrollViewStage.classList.remove('active');
      paginateCurrentChapter();
    } else {
      dom.bookStage.style.display = 'none';
      dom.scrollViewStage.classList.add('active');
      renderScrollMode();
    }
    savePreferences();
  }

  function updateViewModeUI() {
    if (dom.btnToggleViewMode) {
      dom.btnToggleViewMode.innerHTML = state.viewMode === 'book' ? '<span>📖 Book</span>' : '<span>📜 Scroll</span>';
    }
    const mobIcon = document.getElementById('mob-view-icon');
    const mobText = document.getElementById('mob-view-text');
    if (mobIcon && mobText) {
      mobIcon.textContent = state.viewMode === 'book' ? '📖' : '📜';
      mobText.textContent = state.viewMode === 'book' ? 'Book View' : 'Scroll View';
    }
  }

  function closeAllDrawers() {
    if (dom.drawerBackdrop) dom.drawerBackdrop.classList.remove('active');
    if (dom.tocDrawer) dom.tocDrawer.classList.remove('active');
    if (dom.bookmarksDrawer) dom.bookmarksDrawer.classList.remove('active');
    closeMobileMenu();
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Top Bar Actions
    dom.btnToggleToc.addEventListener('click', () => openTocDrawer());
    dom.btnChapterIndicator.addEventListener('click', () => openTocDrawer());
    dom.btnBookmarksList.addEventListener('click', () => openBookmarksDrawer());
    dom.btnQuickBookmark.addEventListener('click', () => openBookmarkModal());

    // Mobile Menu Button Trigger
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    if (btnMobileMenu) {
      btnMobileMenu.addEventListener('click', () => openMobileMenu());
    }

    const btnCloseMob = document.getElementById('btn-close-mobile-menu');
    if (btnCloseMob) {
      btnCloseMob.addEventListener('click', () => closeMobileMenu());
    }

    const mobOverlay = document.getElementById('mobile-menu-overlay');
    if (mobOverlay) {
      mobOverlay.addEventListener('click', () => closeMobileMenu());
    }

    // Mobile Menu Card Handlers
    const mobBtnToggleView = document.getElementById('mob-btn-toggle-view');
    if (mobBtnToggleView) {
      mobBtnToggleView.addEventListener('click', () => {
        closeMobileMenu();
        toggleViewMode();
      });
    }

    const mobBtnQuickBookmark = document.getElementById('mob-btn-quick-bookmark');
    if (mobBtnQuickBookmark) {
      mobBtnQuickBookmark.addEventListener('click', () => {
        closeMobileMenu();
        openBookmarkModal();
      });
    }

    const mobBtnBookmarksList = document.getElementById('mob-btn-bookmarks-list');
    if (mobBtnBookmarksList) {
      mobBtnBookmarksList.addEventListener('click', () => {
        closeMobileMenu();
        openBookmarksDrawer();
      });
    }

    const mobBtnSearch = document.getElementById('mob-btn-search');
    if (mobBtnSearch) {
      mobBtnSearch.addEventListener('click', () => {
        closeMobileMenu();
        openModal(dom.searchModal);
        const input = document.getElementById('search-query-input');
        if (input) {
          input.focus();
          input.select();
        }
      });
    }

    const mobBtnAudio = document.getElementById('mob-btn-audio');
    if (mobBtnAudio) {
      mobBtnAudio.addEventListener('click', () => {
        closeMobileMenu();
        toggleAudioNarration();
      });
    }

    const mobBtnSettings = document.getElementById('mob-btn-settings');
    if (mobBtnSettings) {
      mobBtnSettings.addEventListener('click', () => {
        closeMobileMenu();
        openModal(dom.settingsModal);
      });
    }

    const mobBtnDarshan = document.getElementById('mob-btn-darshan');
    if (mobBtnDarshan) {
      mobBtnDarshan.addEventListener('click', () => {
        closeMobileMenu();
        openModal(dom.darshanModal);
      });
    }

    const mobBtnFullscreen = document.getElementById('mob-btn-fullscreen');
    if (mobBtnFullscreen) {
      mobBtnFullscreen.addEventListener('click', () => {
        closeMobileMenu();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Sai Baba Darshan Photo Popup from Brand Header
    if (dom.brandBookTitle) {
      dom.brandBookTitle.addEventListener('click', () => openModal(dom.darshanModal));
    }

    // View Mode Toggle (Book vs Scroll)
    dom.btnToggleViewMode.addEventListener('click', () => {
      toggleViewMode();
    });

    // Fullscreen Toggle
    dom.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Search Modal
    dom.btnSearchModal.addEventListener('click', () => {
      openModal(dom.searchModal);
      const input = document.getElementById('search-query-input');
      if (input) {
        input.focus();
        input.select();
      }
    });

    const searchInput = document.getElementById('search-query-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => executeBookSearch(e.target.value));
    }

    // Audio Narration
    dom.btnAudioNarration.addEventListener('click', () => toggleAudioNarration());
    if (dom.btnAudioPlayPause) {
      dom.btnAudioPlayPause.addEventListener('click', () => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          dom.btnAudioPlayPause.textContent = '⏸ Pause';
        } else if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          dom.btnAudioPlayPause.textContent = '▶ Resume';
        } else {
          startAudioNarration();
        }
      });
    }
    if (dom.btnAudioStop) {
      dom.btnAudioStop.addEventListener('click', () => stopAudioNarration());
    }
    if (dom.audioSpeedSelect) {
      dom.audioSpeedSelect.addEventListener('change', (e) => {
        state.speechRate = parseFloat(e.target.value) || 1.0;
        if (state.isSpeaking) startAudioNarration();
      });
    }

    // Settings Modal
    dom.btnSettingsModal.addEventListener('click', () => openModal(dom.settingsModal));

    // Page Turns via Arrows & Zones
    if (dom.navLeftZone) dom.navLeftZone.addEventListener('click', () => prevPage());
    if (dom.navRightZone) dom.navRightZone.addEventListener('click', () => nextPage());
    if (dom.btnPrevPage) dom.btnPrevPage.addEventListener('click', () => prevPage());
    if (dom.btnNextPage) dom.btnNextPage.addEventListener('click', () => nextPage());
    if (dom.btnPrevChapter) dom.btnPrevChapter.addEventListener('click', () => prevChapter());
    if (dom.btnNextChapter) dom.btnNextChapter.addEventListener('click', () => nextChapter());

    // Scrubber Navigation
    if (dom.progressScrubContainer) {
      dom.progressScrubContainer.addEventListener('click', (e) => {
        const rect = dom.progressTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const fraction = Math.max(0, Math.min(1, clickX / rect.width));
        const targetPage = Math.floor(fraction * state.totalPages);
        goToPage(targetPage);
      });

      dom.progressScrubContainer.addEventListener('mousemove', (e) => {
        const rect = dom.progressTrack.getBoundingClientRect();
        const hoverX = e.clientX - rect.left;
        const fraction = Math.max(0, Math.min(1, hoverX / rect.width));
        const hoverPage = Math.floor(fraction * state.totalPages) + 1;
        if (dom.progressTooltip) {
          dom.progressTooltip.textContent = `Jump to Page ${hoverPage}`;
          dom.progressTooltip.style.left = `${fraction * 100}%`;
        }
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 't' || e.key === 'T' || e.key === 'c' || e.key === 'C') {
        openTocDrawer();
      } else if (e.key === 'b' || e.key === 'B') {
        openBookmarksDrawer();
      } else if (e.key === 'Escape') {
        closeAllModals();
        closeAllDrawers();
        if (state.targetPickMode && state._cancelTargetPick) state._cancelTargetPick();
      }
    });

    // Mobile Swipe Gestures
    let touchStartX = 0;
    let touchStartY = 0;
    dom.readerWorkspace.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      },
      { passive: true }
    );

    dom.readerWorkspace.addEventListener(
      'touchend',
      (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        if (Math.abs(dx) > 45 && Math.abs(dy) < 60) {
          if (dx < 0) nextPage();
          else prevPage();
        }
      },
      { passive: true }
    );

    // Paragraph Bookmark Pin Click
    document.addEventListener('click', (e) => {
      const pin = e.target.closest('.para-bookmark-trigger');
      if (pin) {
        e.stopPropagation();
        const para = pin.closest('.reader-paragraph');
        const elId = pin.dataset.elId || (para ? para.dataset.originalId || para.id : null);
        openBookmarkModal(elId);
      }
    });

    // Drawer Backdrop & Close Buttons
    if (dom.drawerBackdrop) dom.drawerBackdrop.addEventListener('click', () => closeAllDrawers());
    document.querySelectorAll('.drawer-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => closeAllDrawers());
    });

    // TOC Search Filter
    if (dom.tocSearchInput) {
      dom.tocSearchInput.addEventListener('input', (e) => renderTableOfContents(e.target.value));
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => closeAllModals());
    });
    document.querySelectorAll('.modal-overlay').forEach((m) => {
      m.addEventListener('click', (e) => {
        if (e.target === m) closeModal(m);
      });
    });

    // Target Mode Cancel Button
    if (dom.btnCancelTargetMode) {
      dom.btnCancelTargetMode.addEventListener('click', () => {
        if (state._cancelTargetPick) state._cancelTargetPick();
      });
    }

    // Settings Controls
    bindSettingsControls();
  }

  function bindSettingsControls() {
    document.querySelectorAll('.theme-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        applyTheme(swatch.dataset.theme);
      });
    });

    const fontSizeSlider = document.getElementById('setting-font-size');
    const fontSizeVal = document.getElementById('val-font-size');
    if (fontSizeSlider) {
      fontSizeSlider.value = state.fontSize;
      if (fontSizeVal) fontSizeVal.textContent = `${state.fontSize}px`;
      fontSizeSlider.addEventListener('input', (e) => {
        state.fontSize = parseFloat(e.target.value);
        if (fontSizeVal) fontSizeVal.textContent = `${state.fontSize}px`;
        applyTypography();
        paginateCurrentChapter();
      });
    }

    const lineHeightSlider = document.getElementById('setting-line-height');
    const lineHeightVal = document.getElementById('val-line-height');
    if (lineHeightSlider) {
      lineHeightSlider.value = state.lineHeight;
      if (lineHeightVal) lineHeightVal.textContent = state.lineHeight;
      lineHeightSlider.addEventListener('input', (e) => {
        state.lineHeight = parseFloat(e.target.value);
        if (lineHeightVal) lineHeightVal.textContent = state.lineHeight;
        applyTypography();
        paginateCurrentChapter();
      });
    }

    const fontSelect = document.getElementById('setting-font-family');
    if (fontSelect) {
      fontSelect.value = state.fontFamily;
      fontSelect.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
        applyTypography();
        paginateCurrentChapter();
      });
    }

    const soundToggle = document.getElementById('toggle-sound');
    if (soundToggle) {
      soundToggle.classList.toggle('active', state.soundEnabled);
      soundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        soundToggle.classList.toggle('active', state.soundEnabled);
        savePreferences();
      });
    }

    const doublePageToggle = document.getElementById('toggle-double-page');
    if (doublePageToggle) {
      doublePageToggle.classList.toggle('active', state.isDoublePage);
      doublePageToggle.addEventListener('click', () => {
        state.isDoublePage = !state.isDoublePage;
        doublePageToggle.classList.toggle('active', state.isDoublePage);
        savePreferences();
        setupResponsiveLayout();
        paginateCurrentChapter();
      });
    }

    const dropCapsToggle = document.getElementById('toggle-drop-caps');
    if (dropCapsToggle) {
      dropCapsToggle.classList.toggle('active', state.dropCapsEnabled);
      dropCapsToggle.addEventListener('click', () => {
        state.dropCapsEnabled = !state.dropCapsEnabled;
        dropCapsToggle.classList.toggle('active', state.dropCapsEnabled);
        savePreferences();
        paginateCurrentChapter();
      });
    }
  }

  // --- UTILS ---
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
