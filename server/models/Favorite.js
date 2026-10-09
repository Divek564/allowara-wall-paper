import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    wallpaperId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: 'default_user',
      index: true,
    },
    wallpaper: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ wallpaperId: 1, userId: 1 }, { unique: true });

export const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);
