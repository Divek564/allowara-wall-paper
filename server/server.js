import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedWallpapersIfNeeded } from './controllers/wallpaperController.js';
import wallpaperRoutes from './routes/wallpaperRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import pexelsRoutes from './routes/pexelsRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));
app.use(express.json());

// Routes
app.use('/api/wallpapers', wallpaperRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/pexels', pexelsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    service: 'AuraWalls MERN Backend',
    database: isMongoConnected ? 'connected' : 'disconnected',
    mongodbHost: isMongoConnected ? mongoose.connection.host : null,
    time: new Date().toISOString(),
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
async function startServer() {
  const dbConnected = await connectDB();
  if (dbConnected) {
    await seedWallpapersIfNeeded();
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 AuraWalls MERN Server listening on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🖼️ Wallpapers API: http://localhost:${PORT}/api/wallpapers/curated\n`);
  });
}

startServer();
