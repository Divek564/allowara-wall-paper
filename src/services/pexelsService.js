import { CURATED_WALLPAPERS } from '../data/curatedWallpapers.js';
import { StorageService } from './storageService.js';
import { backendApi } from './backendApi.js';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

/**
 * Service to interface with Pexels REST API and MERN Backend
 */
export class PexelsService {
  constructor() {
    this.cachedCurated = [...CURATED_WALLPAPERS];
  }

  getApiKey() {
    return StorageService.getApiKey();
  }

  hasApiKey() {
    return Boolean(this.getApiKey());
  }

  /**
   * Helper to generate complementary palette swatches from a single hex color
   */
  _generatePaletteFromHex(baseHex) {
    if (!baseHex || !baseHex.startsWith('#') || baseHex.length < 7) {
      return ['#6366f1', '#38bdf8', '#a855f7', '#ec4899', '#0f172a'];
    }

    try {
      const r = parseInt(baseHex.slice(1, 3), 16);
      const g = parseInt(baseHex.slice(3, 5), 16);
      const b = parseInt(baseHex.slice(5, 7), 16);

      const lighten = (factor) =>
        `#${Math.min(255, Math.floor(r + (255 - r) * factor)).toString(16).padStart(2, '0')}${Math.min(255, Math.floor(g + (255 - g) * factor)).toString(16).padStart(2, '0')}${Math.min(255, Math.floor(b + (255 - b) * factor)).toString(16).padStart(2, '0')}`;

      const darken = (factor) =>
        `#${Math.floor(r * (1 - factor)).toString(16).padStart(2, '0')}${Math.floor(g * (1 - factor)).toString(16).padStart(2, '0')}${Math.floor(b * (1 - factor)).toString(16).padStart(2, '0')}`;

      return [
        baseHex,
        lighten(0.35),
        darken(0.4),
        lighten(0.65),
        '#030712'
      ];
    } catch {
      return [baseHex, '#4f46e5', '#06b6d4', '#ec4899', '#0b0f19'];
    }
  }

  /**
   * Normalize raw photo from Pexels API
   */
  _normalizePhoto(photo) {
    const isLandscape = photo.width > photo.height;
    const isPortrait = photo.height > photo.width;
    const orientation = isLandscape ? 'landscape' : (isPortrait ? 'portrait' : 'square');

    let title = photo.alt ? photo.alt.trim() : '';
    if (!title || title.length < 3) {
      if (orientation === 'portrait') {
        title = `Aura Portrait #${photo.id}`;
      } else {
        title = `Cinematic 4K Horizon #${photo.id}`;
      }
    }

    title = title.charAt(0).toUpperCase() + title.slice(1);
    const avg_color = photo.avg_color || '#1e1b4b';

    return {
      id: String(photo.id),
      title,
      photographer: photo.photographer || 'Pexels Contributor',
      photographer_url: photo.photographer_url || 'https://www.pexels.com',
      photographer_id: photo.photographer_id,
      avg_color,
      colors: this._generatePaletteFromHex(avg_color),
      width: photo.width,
      height: photo.height,
      orientation,
      aspectRatio: (photo.width / photo.height).toFixed(2),
      category: orientation === 'portrait' ? 'mobile' : 'desktop',
      tags: [orientation, '4k', 'ultra-hd', photo.photographer?.toLowerCase() || 'pexels'],
      src: {
        original: photo.src?.original || photo.src?.large2x,
        large2x: photo.src?.large2x || photo.src?.large,
        large: photo.src?.large || photo.src?.medium,
        medium: photo.src?.medium,
        small: photo.src?.small,
        portrait: photo.src?.portrait || photo.src?.large,
        landscape: photo.src?.landscape || photo.src?.large,
        tiny: photo.src?.tiny || photo.src?.small
      },
      url: photo.url
    };
  }

  /**
   * Test API key validity via MERN Backend or direct probe
   */
  async testApiKey(key) {
    if (!key || !key.trim()) {
      return { success: false, message: 'API key cannot be empty' };
    }

    // Try backend verification first
    try {
      const backendRes = await backendApi.verifyKey(key.trim());
      if (backendRes && typeof backendRes.success === 'boolean') {
        return backendRes;
      }
    } catch {
      // Fallback to direct fetch
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(`${PEXELS_BASE_URL}/curated?per_page=1`, {
        headers: { Authorization: key.trim() },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: 'Pexels API Key connected successfully!' };
      } else if (response.status === 401) {
        return { success: false, message: 'Invalid API Key. Please verify your Pexels token.' };
      } else {
        return { success: false, message: `Pexels API responded with status ${response.status}` };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Connection timed out. Check your network connection.' };
      }
      return { success: false, message: err.message || 'Network error connecting to Pexels' };
    }
  }

  /**
   * Fetch Curated Wallpapers (Tries MERN Backend -> Live Pexels -> Local Showcase)
   */
  async getCurated({ orientation = 'all', page = 1, perPage = 30 } = {}) {
    // 1. Try MERN Express & MongoDB Backend
    try {
      const data = await backendApi.getCurated({ orientation, page, perPage });
      if (data && data.wallpapers && data.wallpapers.length > 0) {
        return {
          wallpapers: data.wallpapers,
          total_results: data.total_results,
          page: data.page,
          perPage: data.per_page,
          hasMore: data.hasMore,
          isLive: data.isLive,
          source: data.source || 'mern'
        };
      }
    } catch (err) {
      console.info('[Client] MERN backend unavailable, trying direct Pexels or local showcase:', err.message);
    }

    // 2. Direct Pexels API fallback if API key configured
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        let url = `${PEXELS_BASE_URL}/curated?page=${page}&per_page=${perPage}`;
        if (orientation === 'portrait' || orientation === 'landscape' || orientation === 'square') {
          url = `${PEXELS_BASE_URL}/search?query=wallpaper%204k&orientation=${orientation}&page=${page}&per_page=${perPage}`;
        }

        const response = await fetch(url, {
          headers: { Authorization: apiKey }
        });

        if (response.ok) {
          const data = await response.json();
          let photos = (data.photos || []).map(p => this._normalizePhoto(p));

          if (orientation !== 'all') {
            photos = photos.filter(p => p.orientation === orientation);
          }

          return {
            wallpapers: photos,
            total_results: data.total_results || photos.length,
            page: data.page || page,
            per_page: data.per_page || perPage,
            hasMore: Boolean(data.next_page),
            isLive: true,
            source: 'pexels-direct'
          };
        }
      } catch (e) {
        console.warn('Pexels API direct request failed:', e);
      }
    }

    // 3. Fallback: Use curated catalog with orientation filtering
    return this._getCuratedFallback({ orientation, page, perPage });
  }

  /**
   * Search Wallpapers (Tries MERN Backend -> Live Pexels -> Local Showcase)
   */
  async searchWallpapers({ query = '', orientation = 'all', color = '', page = 1, perPage = 30 } = {}) {
    // 1. Try MERN Express & MongoDB Backend
    try {
      const data = await backendApi.searchWallpapers({ query, orientation, color, page, perPage });
      if (data && data.wallpapers && data.wallpapers.length > 0) {
        return {
          wallpapers: data.wallpapers,
          total_results: data.total_results,
          page: data.page,
          perPage: data.per_page,
          hasMore: data.hasMore,
          isLive: data.isLive,
          source: data.source || 'mern'
        };
      }
    } catch (err) {
      console.info('[Client] MERN backend search unavailable, falling back:', err.message);
    }

    // 2. Direct Pexels search
    const apiKey = this.getApiKey();
    if (apiKey && (query.trim() || color || orientation !== 'all')) {
      try {
        let searchQuery = query.trim() || 'wallpaper 4k aesthetic';
        let url = `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}&page=${page}&per_page=${perPage}`;

        if (orientation && orientation !== 'all') {
          url += `&orientation=${encodeURIComponent(orientation)}`;
        }

        if (color && color !== 'all') {
          url += `&color=${encodeURIComponent(color)}`;
        }

        const response = await fetch(url, {
          headers: { Authorization: apiKey }
        });

        if (response.ok) {
          const data = await response.json();
          let photos = (data.photos || []).map(p => this._normalizePhoto(p));

          return {
            wallpapers: photos,
            total_results: data.total_results || photos.length,
            page: data.page || page,
            per_page: data.per_page || perPage,
            hasMore: Boolean(data.next_page),
            isLive: true,
            source: 'pexels-direct'
          };
        }
      } catch (e) {
        console.warn('Pexels direct search failed:', e);
      }
    }

    // 3. Fallback: Search through curated collection
    return this._searchFallback({ query, orientation, color, page, perPage });
  }

  _getCuratedFallback({ orientation = 'all', page = 1, perPage = 30 } = {}) {
    let list = [...this.cachedCurated];

    if (orientation !== 'all') {
      list = list.filter(item => item.orientation === orientation);
    }

    const startIndex = (page - 1) * perPage;
    const paginated = list.slice(startIndex, startIndex + perPage);

    return {
      wallpapers: paginated,
      total_results: list.length,
      page,
      per_page: perPage,
      hasMore: startIndex + perPage < list.length,
      isLive: false,
      source: 'local-showcase'
    };
  }

  _searchFallback({ query = '', orientation = 'all', color = '', page = 1, perPage = 30 } = {}) {
    let list = [...this.cachedCurated];
    const q = query.trim().toLowerCase();

    if (q) {
      list = list.filter(item => {
        const inTitle = item.title.toLowerCase().includes(q);
        const inPhotographer = item.photographer.toLowerCase().includes(q);
        const inCategory = item.category.toLowerCase().includes(q);
        const inTags = item.tags && item.tags.some(t => t.toLowerCase().includes(q));
        return inTitle || inPhotographer || inCategory || inTags;
      });
    }

    if (orientation && orientation !== 'all') {
      list = list.filter(item => item.orientation === orientation);
    }

    const startIndex = (page - 1) * perPage;
    const paginated = list.slice(startIndex, startIndex + perPage);

    return {
      wallpapers: paginated,
      total_results: list.length,
      page,
      per_page: perPage,
      hasMore: startIndex + perPage < list.length,
      isLive: false,
      source: 'local-showcase'
    };
  }
}

export const pexelsService = new PexelsService();
