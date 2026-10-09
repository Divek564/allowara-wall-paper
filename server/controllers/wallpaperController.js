import { Wallpaper } from '../models/Wallpaper.js';
import { DownloadLog } from '../models/DownloadLog.js';
import { INITIAL_WALLPAPERS } from '../data/seedData.js';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

/**
 * Seed initial wallpapers into MongoDB if collection is empty
 */
export async function seedWallpapersIfNeeded() {
  try {
    const count = await Wallpaper.countDocuments();
    if (count === 0) {
      console.log('[MongoDB] Seeding initial curated wallpapers...');
      await Wallpaper.insertMany(INITIAL_WALLPAPERS);
      console.log(`[MongoDB] Successfully seeded ${INITIAL_WALLPAPERS.length} wallpapers.`);
    }
  } catch (err) {
    console.warn('[MongoDB] Auto-seeding skipped or failed:', err.message);
  }
}

/**
 * Helper to fetch from live Pexels API
 */
async function fetchFromPexels(endpoint, apiKey) {
  const url = `${PEXELS_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    throw new Error(`Pexels responded with status ${res.status}`);
  }
  return await res.json();
}

/**
 * Normalize raw Pexels photo
 */
function normalizePexelsPhoto(photo) {
  const isLandscape = photo.width > photo.height;
  const isPortrait = photo.height > photo.width;
  const orientation = isLandscape ? 'landscape' : (isPortrait ? 'portrait' : 'square');

  let title = photo.alt ? photo.alt.trim() : '';
  if (!title || title.length < 3) {
    title = orientation === 'portrait' ? `Aura Portrait #${photo.id}` : `Cinematic 4K Horizon #${photo.id}`;
  }
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    id: String(photo.id),
    title,
    photographer: photo.photographer || 'Pexels Contributor',
    photographer_url: photo.photographer_url || 'https://www.pexels.com',
    photographer_id: photo.photographer_id,
    avg_color: photo.avg_color || '#1e1b4b',
    colors: [photo.avg_color || '#6366f1', '#38bdf8', '#a855f7', '#ec4899', '#0f172a'],
    width: photo.width,
    height: photo.height,
    orientation,
    aspectRatio: (photo.width / photo.height).toFixed(2),
    category: orientation === 'portrait' ? 'mobile' : 'desktop',
    tags: [orientation, '4k', 'ultra-hd'],
    src: {
      original: photo.src?.original || photo.src?.large2x,
      large2x: photo.src?.large2x || photo.src?.large,
      large: photo.src?.large || photo.src?.medium,
      medium: photo.src?.medium,
      portrait: photo.src?.portrait || photo.src?.large,
      landscape: photo.src?.landscape || photo.src?.large,
      tiny: photo.src?.tiny || photo.src?.small,
    },
    url: photo.url,
  };
}

/**
 * GET /api/wallpapers/curated
 */
export async function getCuratedWallpapers(req, res) {
  try {
    const { orientation = 'all', page = 1, perPage = 30 } = req.query;
    const apiKey = req.headers.authorization || process.env.PEXELS_API_KEY;

    if (apiKey) {
      try {
        let endpoint = `/curated?page=${page}&per_page=${perPage}`;
        if (orientation === 'portrait' || orientation === 'landscape' || orientation === 'square') {
          endpoint = `/search?query=wallpaper%204k&orientation=${orientation}&page=${page}&per_page=${perPage}`;
        }

        const data = await fetchFromPexels(endpoint, apiKey);
        const photos = (data.photos || []).map(normalizePexelsPhoto);

        return res.json({
          wallpapers: photos,
          total_results: data.total_results || photos.length,
          page: Number(page),
          per_page: Number(perPage),
          hasMore: Boolean(data.next_page),
          isLive: true,
          source: 'pexels-live',
        });
      } catch (err) {
        console.warn('[Pexels] Live fetch failed, serving from MongoDB:', err.message);
      }
    }

    // Query MongoDB
    const filter = {};
    if (orientation !== 'all') {
      filter.orientation = orientation;
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const [wallpapers, total] = await Promise.all([
      Wallpaper.find(filter).skip(skip).limit(Number(perPage)).lean(),
      Wallpaper.countDocuments(filter),
    ]);

    // Fallback if Mongo returned empty
    const list = wallpapers.length > 0 ? wallpapers : INITIAL_WALLPAPERS.filter(w => orientation === 'all' || w.orientation === orientation);

    return res.json({
      wallpapers: list,
      total_results: total || list.length,
      page: Number(page),
      per_page: Number(perPage),
      hasMore: skip + list.length < (total || list.length),
      isLive: false,
      source: 'mongodb',
    });
  } catch (error) {
    console.error('Error in getCuratedWallpapers:', error);
    return res.status(500).json({ error: 'Failed to fetch curated wallpapers' });
  }
}

/**
 * GET /api/wallpapers/search
 */
export async function searchWallpapers(req, res) {
  try {
    const { query = '', orientation = 'all', color = '', page = 1, perPage = 30 } = req.query;
    const apiKey = req.headers.authorization || process.env.PEXELS_API_KEY;

    if (apiKey && (query || color || orientation !== 'all')) {
      try {
        let endpoint = `/search?query=${encodeURIComponent(query || 'wallpaper 4k')}&page=${page}&per_page=${perPage}`;
        if (orientation !== 'all') endpoint += `&orientation=${orientation}`;
        if (color && color !== 'all') endpoint += `&color=${color}`;

        const data = await fetchFromPexels(endpoint, apiKey);
        const photos = (data.photos || []).map(normalizePexelsPhoto);

        return res.json({
          wallpapers: photos,
          total_results: data.total_results || photos.length,
          page: Number(page),
          per_page: Number(perPage),
          hasMore: Boolean(data.next_page),
          isLive: true,
          source: 'pexels-live',
        });
      } catch (err) {
        console.warn('[Pexels] Live search failed, fallback to MongoDB:', err.message);
      }
    }

    // Search in MongoDB
    const filter = {};
    if (orientation !== 'all') filter.orientation = orientation;
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { category: { $regex: query, $options: 'i' } },
        { photographer: { $regex: query, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const [wallpapers, total] = await Promise.all([
      Wallpaper.find(filter).skip(skip).limit(Number(perPage)).lean(),
      Wallpaper.countDocuments(filter),
    ]);

    return res.json({
      wallpapers,
      total_results: total,
      page: Number(page),
      per_page: Number(perPage),
      hasMore: skip + wallpapers.length < total,
      isLive: false,
      source: 'mongodb',
    });
  } catch (error) {
    console.error('Error in searchWallpapers:', error);
    return res.status(500).json({ error: 'Failed to search wallpapers' });
  }
}

/**
 * GET /api/wallpapers/:id
 */
export async function getWallpaperById(req, res) {
  try {
    const { id } = req.params;
    const wallpaper = await Wallpaper.findOne({ id }).lean();
    if (!wallpaper) {
      return res.status(404).json({ error: 'Wallpaper not found' });
    }
    return res.json({ wallpaper });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve wallpaper' });
  }
}

/**
 * POST /api/wallpapers/:id/download
 */
export async function recordDownload(req, res) {
  try {
    const { id } = req.params;
    const { resolutionType = 'original' } = req.body;

    // Log the download event
    await DownloadLog.create({
      wallpaperId: id,
      resolutionType,
      clientIp: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Increment downloads count on wallpaper if present in DB
    await Wallpaper.findOneAndUpdate({ id }, { $inc: { downloadsCount: 1 } });

    return res.json({ success: true, message: 'Download tracked' });
  } catch (error) {
    console.error('Download logging error:', error);
    return res.status(500).json({ error: 'Failed to log download' });
  }
}
