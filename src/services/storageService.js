import { backendApi } from './backendApi.js';

/**
 * Storage Service for persisting user preferences, favorites, and Pexels API key
 * Syncs seamlessly with MongoDB on the MERN backend while preserving instant local caching.
 */

const STORAGE_KEYS = {
  API_KEY: 'aurawalls_pexels_api_key',
  FAVORITES: 'aurawalls_favorites_v1',
  ACTIVE_FILTER: 'aurawalls_active_filter',
  LAST_QUERY: 'aurawalls_last_query'
};

export const StorageService = {
  // Pexels API Key
  getApiKey() {
    try {
      return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    } catch {
      return '';
    }
  },

  setApiKey(key) {
    try {
      if (!key) {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
      } else {
        localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
      }
    } catch (e) {
      console.error('Failed to save API key to localStorage', e);
    }
  },

  removeApiKey() {
    try {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    } catch (e) {
      console.error(e);
    }
  },

  // Favorites
  getFavorites() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  isFavorite(id) {
    const list = this.getFavorites();
    return list.some(item => String(item.id) === String(id));
  },

  toggleFavorite(wallpaper) {
    const list = this.getFavorites();
    const index = list.findIndex(item => String(item.id) === String(wallpaper.id));
    let isAdded = false;

    if (index >= 0) {
      list.splice(index, 1);
      isAdded = false;
    } else {
      list.unshift(wallpaper);
      isAdded = true;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update favorites', e);
    }

    // Sync with MongoDB in background
    backendApi.toggleFavorite(wallpaper).catch(err => {
      console.info('[MongoDB] Favorites sync offline:', err.message);
    });

    // Dispatch custom event for reactive UI updates
    window.dispatchEvent(new CustomEvent('aurawalls:favorites-updated', {
      detail: { list, changedId: wallpaper.id, isAdded }
    }));

    return isAdded;
  },

  clearFavorites() {
    try {
      localStorage.removeItem(STORAGE_KEYS.FAVORITES);
      window.dispatchEvent(new CustomEvent('aurawalls:favorites-updated', {
        detail: { list: [], changedId: null, isAdded: false }
      }));
    } catch (e) {
      console.error(e);
    }

    backendApi.clearFavorites().catch(() => {});
  },

  /**
   * Sync favorites from MongoDB on initial startup
   */
  async syncFavoritesFromDB() {
    try {
      const res = await backendApi.getFavorites();
      if (res && Array.isArray(res.favorites) && res.favorites.length > 0) {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(res.favorites));
        window.dispatchEvent(new CustomEvent('aurawalls:favorites-updated', {
          detail: { list: res.favorites, changedId: null, isAdded: true }
        }));
      }
    } catch (err) {
      // Backend not yet ready or offline
    }
  }
};
