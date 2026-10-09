import express from 'express';
import {
  getFavorites,
  toggleFavorite,
  clearFavorites,
} from '../controllers/favoriteController.js';

const router = express.Router();

router.get('/', getFavorites);
router.post('/toggle', toggleFavorite);
router.delete('/', clearFavorites);

export default router;
