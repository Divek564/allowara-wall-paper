import express from 'express';
import { verifyPexelsKey, proxyDownload } from '../controllers/pexelsController.js';

const router = express.Router();

router.all('/verify', verifyPexelsKey);
router.get('/download-proxy', proxyDownload);

export default router;
