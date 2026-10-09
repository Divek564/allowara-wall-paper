import express from 'express';
import {
  getCuratedWallpapers,
  searchWallpapers,
  getWallpaperById,
  recordDownload,
} from '../controllers/wallpaperController.js';

const router = express.Router();

router.get('/curated', getCuratedWallpapers);
router.get('/search', searchWallpapers);
router.get('/:id', getWallpaperById);
router.post('/:id/download', recordDownload);

export default router;
