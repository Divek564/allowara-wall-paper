import mongoose from 'mongoose';

const wallpaperSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    photographer: {
      type: String,
      required: true,
    },
    photographer_url: {
      type: String,
      default: '',
    },
    photographer_id: {
      type: Number,
      default: null,
    },
    avg_color: {
      type: String,
      default: '#1e1b4b',
    },
    colors: {
      type: [String],
      default: [],
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    orientation: {
      type: String,
      enum: ['portrait', 'landscape', 'square'],
      required: true,
      index: true,
    },
    aspectRatio: {
      type: String,
      default: '1.0',
    },
    category: {
      type: String,
      default: 'all',
      index: true,
    },
    tags: {
      type: [String],
      index: true,
    },
    src: {
      original: { type: String, required: true },
      large2x: { type: String },
      large: { type: String },
      medium: { type: String },
      portrait: { type: String },
      landscape: { type: String },
      tiny: { type: String },
    },
    url: {
      type: String,
      default: '',
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    downloadsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Search indexes for query performance
wallpaperSchema.index({ title: 'text', tags: 'text', category: 'text' });

export const Wallpaper = mongoose.models.Wallpaper || mongoose.model('Wallpaper', wallpaperSchema);
