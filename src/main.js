import './style.css';
import { CATEGORIES, COLOR_SWATCHES } from './data/curatedWallpapers.js';
import { pexelsService } from './services/pexelsService.js';
import { StorageService } from './services/storageService.js';
import { createWallpaperCard } from './components/wallpaperCard.js';
import { WallpaperModal } from './components/modal.js';
import { ApiKeyModal } from './components/apiKeyModal.js';
import { toast } from './components/toast.js';

/**
 * AuraWalls Application Controller
 */
class WallpaperApp {
  constructor() {
    this.state = {
      orientation: 'all', // 'all' | 'portrait' | 'landscape' | 'favorites'
      category: 'all',
      color: 'all',
      searchQuery: '',
      page: 1,
      perPage: 24,
      wallpapers: [],
      isLoading: false,
      hasMore: false,
      isLive: false
    };

    this.modal = null;
    this.apiKeyModal = null;
    this.searchDebounceTimer = null;

    this.init();
  }

  async init() {
    // Initialize Modal Singletons
    this.modal = new WallpaperModal();
    this.apiKeyModal = new ApiKeyModal((isLive) => {
      this.updateApiStatusUI();
      this.fetchWallpapers({ resetPage: true });
    });

    // Populate Dynamic Filter Bars
    this.renderCategoryChips();
    this.renderColorSwatches();

    // Bind Event Listeners
    this.bindDOMEvents();

    // Update Initial Badges & API Indicator
    this.updateFavoritesCountBadge();
    this.updateApiStatusUI();

    // Sync MongoDB favorites from MERN backend
    await StorageService.syncFavoritesFromDB();
    this.updateFavoritesCountBadge();

    // Initial Load
    await this.fetchWallpapers({ resetPage: true });
  }

  // =========================================================================
  // DOM & FILTERS POPULATION
  // =========================================================================

  renderCategoryChips() {
    const container = document.getElementById('categoriesWrapper');
    if (!container) return;

    container.innerHTML = CATEGORIES.map((cat, idx) => `
      <button
        type="button"
        class="category-chip ${cat.id === this.state.category ? 'active' : ''}"
        data-cat-id="${cat.id}"
        id="chip-cat-${cat.id}"
      >
        ${cat.label}
      </button>
    `).join('');

    container.querySelectorAll('.category-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat-id');
        this.selectCategory(catId);
      });
    });
  }

  renderColorSwatches() {
    const container = document.getElementById('colorSwatchesStrip');
    if (!container) return;

    container.innerHTML = COLOR_SWATCHES.map(swatch => `
      <button
        type="button"
        class="swatch-btn ${swatch.id === this.state.color ? 'active' : ''}"
        style="background: ${swatch.hex}"
        data-color-id="${swatch.id}"
        data-api-color="${swatch.apiColor}"
        title="${swatch.label}"
        aria-label="Filter by ${swatch.label}"
      ></button>
    `).join('');

    container.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const colorId = btn.getAttribute('data-color-id');
        this.selectColor(colorId);
      });
    });
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================

  bindDOMEvents() {
    // Orientation Tabs
    const tabs = [
      { id: 'tabAll', orient: 'all' },
      { id: 'tabMobile', orient: 'portrait' },
      { id: 'tabDesktop', orient: 'landscape' },
      { id: 'tabFavorites', orient: 'favorites' }
    ];

    tabs.forEach(({ id, orient }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => this.selectOrientation(orient));
      }
    });

    // Brand logo home link
    const brandHome = document.getElementById('brandHomeLink');
    if (brandHome) {
      brandHome.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetAllFilters();
      });
    }

    // Search Input & Clear
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchForm = document.getElementById('searchForm');

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (searchInput) searchInput.blur();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (searchClearBtn) searchClearBtn.style.display = val ? 'inline-block' : 'none';

        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.state.searchQuery = val;
          this.fetchWallpapers({ resetPage: true });
        }, 300);
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        searchClearBtn.style.display = 'none';
        this.state.searchQuery = '';
        this.fetchWallpapers({ resetPage: true });
      });
    }

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && (!this.modal.dialog || !this.modal.dialog.open)) {
        e.preventDefault();
        if (searchInput) searchInput.focus();
      }
    });

    // API Key Config Trigger
    const btnOpenApi = document.getElementById('btnOpenApiModal');
    if (btnOpenApi) {
      btnOpenApi.addEventListener('click', () => this.apiKeyModal.open());
    }

    // Reset Filters Button
    const btnReset = document.getElementById('btnResetFilters');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetAllFilters());
    }

    // Load More Button
    const btnLoadMore = document.getElementById('btnLoadMore');
    if (btnLoadMore) {
      btnLoadMore.addEventListener('click', () => this.loadMore());
    }

    // Reactive Favorites Updates
    window.addEventListener('aurawalls:favorites-updated', () => {
      this.updateFavoritesCountBadge();
      if (this.state.orientation === 'favorites') {
        this.renderFavoritesView();
      }
    });
  }

  // =========================================================================
  // FILTER HANDLERS
  // =========================================================================

  selectOrientation(orient) {
    if (this.state.orientation === orient) return;
    this.state.orientation = orient;

    // Update active tab styles & ARIA
    const tabMap = {
      all: 'tabAll',
      portrait: 'tabMobile',
      landscape: 'tabDesktop',
      favorites: 'tabFavorites'
    };

    Object.entries(tabMap).forEach(([key, elId]) => {
      const el = document.getElementById(elId);
      if (el) {
        const isActive = key === orient;
        el.classList.toggle('active', isActive);
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
    });

    this.updateHeadings();

    if (orient === 'favorites') {
      this.renderFavoritesView();
    } else {
      this.fetchWallpapers({ resetPage: true });
    }
  }

  selectCategory(catId) {
    this.state.category = catId;

    // Update UI chips
    document.querySelectorAll('.category-chip').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cat-id') === catId);
    });

    // If a category other than 'all' is selected and user is in favorites, switch to explore
    if (this.state.orientation === 'favorites') {
      this.selectOrientation('all');
      return;
    }

    this.fetchWallpapers({ resetPage: true });
  }

  selectColor(colorId) {
    this.state.color = colorId;

    document.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-color-id') === colorId);
    });

    if (this.state.orientation === 'favorites') {
      this.selectOrientation('all');
      return;
    }

    this.fetchWallpapers({ resetPage: true });
  }

  resetAllFilters() {
    this.state.orientation = 'all';
    this.state.category = 'all';
    this.state.color = 'all';
    this.state.searchQuery = '';

    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClearBtn');
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';

    // Reset tabs
    ['tabAll', 'tabMobile', 'tabDesktop', 'tabFavorites'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const isActive = id === 'tabAll';
        el.classList.toggle('active', isActive);
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
    });

    // Reset chips
    document.querySelectorAll('.category-chip').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cat-id') === 'all');
    });

    // Reset swatches
    document.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-color-id') === 'all');
    });

    this.updateHeadings();
    this.fetchWallpapers({ resetPage: true });
    toast.info('All filters have been reset.');
  }

  // =========================================================================
  // DATA FETCHING & RENDERING
  // =========================================================================

  async fetchWallpapers({ resetPage = false } = {}) {
    if (this.state.orientation === 'favorites') {
      this.renderFavoritesView();
      return;
    }

    if (resetPage) {
      this.state.page = 1;
      this.state.wallpapers = [];
    }

    this.state.isLoading = true;
    this.updateLoadingUI(true);

    try {
      // Determine search query
      let query = this.state.searchQuery;
      if (!query && this.state.category !== 'all') {
        const catObj = CATEGORIES.find(c => c.id === this.state.category);
        if (catObj && catObj.query) query = catObj.query;
      }

      // Determine API color
      let apiColor = '';
      if (this.state.color !== 'all') {
        const swatchObj = COLOR_SWATCHES.find(s => s.id === this.state.color);
        if (swatchObj) apiColor = swatchObj.apiColor;
      }

      let result;
      if (query || apiColor || (this.state.orientation !== 'all' && pexelsService.hasApiKey())) {
        result = await pexelsService.searchWallpapers({
          query: query || '4k wallpaper',
          orientation: this.state.orientation,
          color: apiColor,
          page: this.state.page,
          perPage: this.state.perPage
        });
      } else {
        result = await pexelsService.getCurated({
          orientation: this.state.orientation,
          page: this.state.page,
          perPage: this.state.perPage
        });
      }

      const newPhotos = result.wallpapers || [];
      if (resetPage) {
        this.state.wallpapers = newPhotos;
      } else {
        this.state.wallpapers = [...this.state.wallpapers, ...newPhotos];
      }

      this.state.hasMore = result.hasMore;
      this.state.isLive = result.isLive;

      this.renderGrid();
      this.updateHeadings();
      this.updateSourceIndicator(result.source, result.isLive);
    } catch (err) {
      console.error('Failed to load wallpapers', err);
      toast.error('Failed to fetch wallpapers. Please check your network.', 'Fetch Error');
    } finally {
      this.state.isLoading = false;
      this.updateLoadingUI(false);
    }
  }

  async loadMore() {
    if (this.state.isLoading || !this.state.hasMore) return;
    this.state.page += 1;
    await this.fetchWallpapers({ resetPage: false });
  }

  renderGrid() {
    const grid = document.getElementById('wallpaperGrid');
    const emptyState = document.getElementById('emptyStateContainer');
    const loadMoreSection = document.getElementById('loadMoreSection');
    const countBadge = document.getElementById('feedResultsCount');

    if (!grid) return;

    grid.innerHTML = '';

    if (this.state.wallpapers.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (loadMoreSection) loadMoreSection.style.display = 'none';
      if (countBadge) countBadge.textContent = '0 Wallpapers';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    this.state.wallpapers.forEach(wallpaper => {
      const card = createWallpaperCard(wallpaper, {
        onPreview: (selected) => {
          this.modal.open(selected, this.state.wallpapers);
        },
        onColorSelect: (hex) => {
          toast.info(`Filtering wallpapers by dominant color ${hex}`);
          this.state.searchQuery = hex;
          this.fetchWallpapers({ resetPage: true });
        },
        onDownload: (w, resType) => {
          this.modal.open(w, this.state.wallpapers);
          this.modal.triggerDownload(resType);
        }
      });
      grid.appendChild(card);
    });

    if (countBadge) {
      countBadge.textContent = `${this.state.wallpapers.length} Wallpapers`;
    }

    if (loadMoreSection) {
      loadMoreSection.style.display = this.state.hasMore ? 'flex' : 'none';
    }
  }

  renderFavoritesView() {
    const grid = document.getElementById('wallpaperGrid');
    const emptyState = document.getElementById('emptyStateContainer');
    const emptyTitle = document.getElementById('emptyStateTitle');
    const emptyDesc = document.getElementById('emptyStateDesc');
    const loadMoreSection = document.getElementById('loadMoreSection');
    const countBadge = document.getElementById('feedResultsCount');

    if (!grid) return;
    grid.innerHTML = '';

    const favorites = StorageService.getFavorites();
    this.state.wallpapers = favorites;

    if (favorites.length === 0) {
      if (emptyState) {
        emptyState.style.display = 'block';
        if (emptyTitle) emptyTitle.textContent = 'No Saved Favorites Yet';
        if (emptyDesc) emptyDesc.textContent = 'Click the heart icon on any wallpaper card to bookmark it to your personal favorites collection!';
      }
      if (loadMoreSection) loadMoreSection.style.display = 'none';
      if (countBadge) countBadge.textContent = '0 Favorites';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (loadMoreSection) loadMoreSection.style.display = 'none';

    favorites.forEach(wallpaper => {
      const card = createWallpaperCard(wallpaper, {
        onPreview: (selected) => {
          this.modal.open(selected, favorites);
        },
        onColorSelect: (hex) => {
          this.selectOrientation('all');
          this.state.searchQuery = hex;
          this.fetchWallpapers({ resetPage: true });
        },
        onDownload: (w, resType) => {
          this.modal.open(w, favorites);
          this.modal.triggerDownload(resType);
        }
      });
      grid.appendChild(card);
    });

    if (countBadge) {
      countBadge.textContent = `${favorites.length} Saved Favorites`;
    }
  }

  // =========================================================================
  // UI STATUS UPDATERS
  // =========================================================================

  updateHeadings() {
    const titleEl = document.getElementById('feedTitle');
    const subtitleEl = document.getElementById('feedSubtitle');
    const crumbOrient = document.getElementById('crumbActiveOrientation');

    if (!titleEl || !subtitleEl) return;

    if (this.state.orientation === 'portrait') {
      titleEl.textContent = '📱 Mobile Flagship Wallpapers';
      subtitleEl.textContent = 'Tall 9:16 aspect ratio crafted for iPhone 16 Pro, Galaxy S24, and AMOLED lockscreens.';
      if (crumbOrient) crumbOrient.textContent = 'Mobile (9:16)';
    } else if (this.state.orientation === 'landscape') {
      titleEl.textContent = '🖥️ 4K Ultra HD Desktop Wallpapers';
      subtitleEl.textContent = 'Cinematic 16:9 and Ultrawide resolutions perfect for Studio Displays, MacBooks, and Multi-Monitor setups.';
      if (crumbOrient) crumbOrient.textContent = 'Desktop (16:9)';
    } else if (this.state.orientation === 'favorites') {
      titleEl.textContent = '❤️ My Saved Collection';
      subtitleEl.textContent = 'Your curated bookmarks and favorite wallpapers saved locally.';
      if (crumbOrient) crumbOrient.textContent = 'Favorites';
    } else {
      titleEl.textContent = 'Ultra HD 4K & Mobile Wallpapers';
      subtitleEl.textContent = 'Hand-picked high-resolution wallpapers tailored for iPhone, Android, MacBook, and 4K Ultrawide setups.';
      if (crumbOrient) crumbOrient.textContent = 'All Formats';
    }
  }

  updateLoadingUI(isLoading) {
    const skeleton = document.getElementById('skeletonGrid');
    const loadMoreSpinner = document.getElementById('loadMoreSpinner');
    const loadMoreText = document.getElementById('loadMoreText');

    if (skeleton && this.state.page === 1) {
      skeleton.style.display = isLoading ? 'grid' : 'none';
    }

    if (loadMoreSpinner && loadMoreText) {
      loadMoreSpinner.style.display = isLoading ? 'inline-block' : 'none';
      loadMoreText.textContent = isLoading ? 'Fetching 4K Content...' : 'Load More Wallpapers';
    }
  }

  updateFavoritesCountBadge() {
    const badge = document.getElementById('headerFavBadge');
    if (badge) {
      const count = StorageService.getFavorites().length;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  updateApiStatusUI() {
    const indicator = document.getElementById('headerApiIndicator');
    const text = document.getElementById('headerApiText');
    const hasKey = pexelsService.hasApiKey();

    if (indicator) {
      indicator.className = `api-status-indicator ${hasKey ? 'connected' : ''}`;
    }
    if (text) {
      text.textContent = hasKey ? 'Pexels Live' : 'Pexels API';
    }
  }

  updateSourceIndicator(source, isLive) {
    const pill = document.getElementById('feedSourcePill');
    const label = document.getElementById('feedSourceLabel');
    const dot = pill?.querySelector('.source-dot');

    if (pill && label) {
      if (source === 'mongodb') {
        label.textContent = '🍃 MongoDB • MERN Active';
        pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        if (dot) dot.style.background = '#10b981';
      } else if (source === 'pexels-live' || isLive) {
        label.textContent = '⚡ Live Pexels Feed';
        pill.style.borderColor = 'rgba(6, 182, 212, 0.4)';
        if (dot) dot.style.background = '#06b6d4';
      } else {
        label.textContent = '✨ Curated Showcase';
        pill.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        if (dot) dot.style.background = 'var(--accent-primary)';
      }
    }
  }
}

// Boot Application
document.addEventListener('DOMContentLoaded', () => {
  new WallpaperApp();
});
