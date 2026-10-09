import mongoose from 'mongoose';

const downloadLogSchema = new mongoose.Schema(
  {
    wallpaperId: {
      type: String,
      required: true,
      index: true,
    },
    resolutionType: {
      type: String,
      enum: ['mobile-fhd', 'mobile-qhd', 'desktop-4k', 'desktop-1080', 'original'],
      required: true,
      index: true,
    },
    clientIp: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const DownloadLog = mongoose.models.DownloadLog || mongoose.model('DownloadLog', downloadLogSchema);
