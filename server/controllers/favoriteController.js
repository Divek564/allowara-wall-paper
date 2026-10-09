import { Favorite } from '../models/Favorite.js';
import { Wallpaper } from '../models/Wallpaper.js';

/**
 * GET /api/favorites
 */
export async function getFavorites(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'default_user';
    const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({
      favorites: favorites.map(f => f.wallpaper),
      count: favorites.length,
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return res.status(500).json({ error: 'Failed to retrieve favorites' });
  }
}

/**
 * POST /api/favorites/toggle
 */
export async function toggleFavorite(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'default_user';
    const { wallpaper } = req.body;

    if (!wallpaper || !wallpaper.id) {
      return res.status(400).json({ error: 'Valid wallpaper object is required' });
    }

    const existing = await Favorite.findOne({ wallpaperId: String(wallpaper.id), userId });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      await Wallpaper.findOneAndUpdate({ id: String(wallpaper.id) }, { $inc: { likesCount: -1 } });
      return res.json({ isFavorite: false, message: 'Removed from favorites' });
    } else {
      await Favorite.create({
        wallpaperId: String(wallpaper.id),
        userId,
        wallpaper,
      });
      await Wallpaper.findOneAndUpdate({ id: String(wallpaper.id) }, { $inc: { likesCount: 1 } });
      return res.json({ isFavorite: true, message: 'Added to favorites' });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return res.status(500).json({ error: 'Failed to toggle favorite' });
  }
}

/**
 * DELETE /api/favorites
 */
export async function clearFavorites(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'default_user';
    await Favorite.deleteMany({ userId });
    return res.json({ success: true, message: 'Favorites cleared' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear favorites' });
  }
}
