/**
 * Backend API Client for AuraWalls MERN Architecture
 * Connects client frontend with Node.js + Express + MongoDB backend
 */

const API_BASE = 'http://localhost:5000/api';

export class BackendApiService {
  constructor() {
    this.isAvailable = false;
    this.mongoStatus = 'checking';
    this.checkHealth();
  }

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        this.isAvailable = true;
        this.mongoStatus = data.database;
        return { isAvailable: true, data };
      }
    } catch {
      this.isAvailable = false;
      this.mongoStatus = 'offline';
    }
    return { isAvailable: false, error: 'Backend unreachable' };
  }

  _getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const key = localStorage.getItem('aurawalls_pexels_api_key');
    if (key) {
      headers['Authorization'] = key;
    }
    return headers;
  }

  /**
   * Fetch curated wallpapers from MERN backend
   */
  async getCurated({ orientation = 'all', page = 1, perPage = 30 } = {}) {
    const url = `${API_BASE}/wallpapers/curated?orientation=${orientation}&page=${page}&perPage=${perPage}`;
    const res = await fetch(url, {
      headers: this._getHeaders(),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return await res.json();
  }

  /**
   * Search wallpapers via MERN backend
   */
  async searchWallpapers({ query = '', orientation = 'all', color = '', page = 1, perPage = 30 } = {}) {
    const params = new URLSearchParams({
      query,
      orientation,
      color,
      page: String(page),
      perPage: String(perPage),
    });
    const url = `${API_BASE}/wallpapers/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: this._getHeaders(),
    });
    if (!res.ok) throw new Error(`Search failed with ${res.status}`);
    return await res.json();
  }

  /**
   * Get persistent favorites from MongoDB
   */
  async getFavorites() {
    const res = await fetch(`${API_BASE}/favorites`, {
      headers: this._getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to load favorites`);
    return await res.json();
  }

  /**
   * Toggle favorite in MongoDB
   */
  async toggleFavorite(wallpaper) {
    const res = await fetch(`${API_BASE}/favorites/toggle`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ wallpaper }),
    });
    if (!res.ok) throw new Error(`Failed to toggle favorite`);
    return await res.json();
  }

  /**
   * Clear all favorites from MongoDB
   */
  async clearFavorites() {
    const res = await fetch(`${API_BASE}/favorites`, {
      method: 'DELETE',
      headers: this._getHeaders(),
    });
    return await res.json();
  }

  /**
   * Log download analytics in MongoDB
   */
  async recordDownload(wallpaperId, resolutionType) {
    try {
      await fetch(`${API_BASE}/wallpapers/${wallpaperId}/download`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({ resolutionType }),
      });
    } catch (err) {
      console.warn('Analytics tracking offline:', err);
    }
  }

  /**
   * Test API key via backend verification route
   */
  async verifyKey(key) {
    const res = await fetch(`${API_BASE}/pexels/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: key,
      },
    });
    return await res.json();
  }
}

export const backendApi = new BackendApiService();
