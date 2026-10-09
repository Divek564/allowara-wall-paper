import { StorageService } from '../services/storageService.js';
import { toast } from './toast.js';

/**
 * Creates an expressive Wallpaper Card DOM element
 */
export function createWallpaperCard(wallpaper, { onPreview, onColorSelect, onDownload }) {
  const card = document.createElement('article');
  card.className = `wallpaper-card card-orientation-${wallpaper.orientation}`;
  card.id = `wallpaper-card-${wallpaper.id}`;
  card.setAttribute('data-id', wallpaper.id);
  card.setAttribute('data-orientation', wallpaper.orientation);
  card.style.setProperty('--card-avg-color', wallpaper.avg_color || '#1e1b4b');

  const isFav = StorageService.isFavorite(wallpaper.id);
  const isMobile = wallpaper.orientation === 'portrait';
  const orientationBadge = isMobile ? '📱 Mobile' : (wallpaper.orientation === 'landscape' ? '🖥️ Desktop' : '🔲 Square');
  const resLabel = wallpaper.width >= 3840 ? '4K Ultra' : (isMobile && wallpaper.height >= 2400 ? 'QHD+ OLED' : 'Full HD');

  const previewSrc = wallpaper.src.large || wallpaper.src.large2x || wallpaper.src.medium;

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-media-wrapper" role="button" tabindex="0" aria-label="Preview ${wallpaper.title}">
        <!-- Image with Skeleton Loader -->
        <div class="card-skeleton"></div>
        <img
          src="${previewSrc}"
          alt="${wallpaper.title}"
          class="card-img"
          loading="lazy"
          decoding="async"
        />

        <!-- Top Badges -->
        <div class="card-top-badges">
          <span class="badge badge-orientation">${orientationBadge}</span>
          <span class="badge badge-res">${resLabel}</span>
        </div>

        <!-- Quick Favorite Button -->
        <button type="button" class="card-fav-btn ${isFav ? 'active' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" title="Save to Favorites">
          <svg viewBox="0 0 24 24" class="heart-icon" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        <!-- Hover Overlay Details -->
        <div class="card-hover-overlay">
          <div class="overlay-actions">
            <button type="button" class="btn-action btn-preview" title="Interactive Mobile / Desktop Simulator">
              <span>📱 Live Preview</span>
            </button>
            <button type="button" class="btn-action btn-quick-download" title="Quick 4K Download">
              <span>📥 Download</span>
            </button>
          </div>

          <div class="overlay-info">
            <h3 class="card-title">${wallpaper.title}</h3>
            <div class="card-meta">
              <a href="${wallpaper.photographer_url}" target="_blank" rel="noopener noreferrer" class="photographer-link" title="View photographer on Pexels" onclick="event.stopPropagation()">
                <span class="photographer-avatar" style="background-color: ${wallpaper.avg_color}">
                  ${wallpaper.photographer.charAt(0).toUpperCase()}
                </span>
                <span class="photographer-name">${wallpaper.photographer}</span>
                <span class="verified-icon">✓</span>
              </a>
              <span class="card-dimensions">${wallpaper.width}×${wallpaper.height}</span>
            </div>

            <!-- Extracted Color Swatches -->
            <div class="card-color-swatches" title="Filter by matching color">
              ${(wallpaper.colors || [wallpaper.avg_color]).slice(0, 4).map(hex => `
                <button type="button" class="color-dot" style="background-color: ${hex}" data-color="${hex}" title="Filter color ${hex}" onclick="event.stopPropagation()"></button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Image load handler for smooth skeleton dismiss
  const img = card.querySelector('.card-img');
  const skeleton = card.querySelector('.card-skeleton');
  if (img) {
    if (img.complete) {
      card.classList.add('loaded');
      if (skeleton) skeleton.style.display = 'none';
    } else {
      img.addEventListener('load', () => {
        card.classList.add('loaded');
        if (skeleton) skeleton.style.display = 'none';
      }, { once: true });
      img.addEventListener('error', () => {
        if (skeleton) skeleton.style.display = 'none';
        card.classList.add('load-error');
      }, { once: true });
    }
  }

  // Favorite Button Click
  const favBtn = card.querySelector('.card-fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const added = StorageService.toggleFavorite(wallpaper);
      favBtn.classList.toggle('active', added);
      const heartIcon = favBtn.querySelector('.heart-icon');
      if (heartIcon) {
        heartIcon.setAttribute('fill', added ? 'currentColor' : 'none');
      }

      if (added) {
        favBtn.classList.add('bounce');
        setTimeout(() => favBtn.classList.remove('bounce'), 600);
        toast.heart(`"${wallpaper.title.slice(0, 24)}..." added to Favorites!`);
      } else {
        toast.info('Removed from Favorites');
      }
    });
  }

  // Click on Card or Live Preview
  const mediaWrapper = card.querySelector('.card-media-wrapper');
  const previewBtn = card.querySelector('.btn-preview');

  const triggerPreview = (e) => {
    e.stopPropagation();
    if (onPreview) onPreview(wallpaper);
  };

  if (previewBtn) previewBtn.addEventListener('click', triggerPreview);
  if (mediaWrapper) {
    mediaWrapper.addEventListener('click', triggerPreview);
    mediaWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerPreview(e);
      }
    });
  }

  // Quick Download Button
  const quickDownloadBtn = card.querySelector('.btn-quick-download');
  if (quickDownloadBtn) {
    quickDownloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onDownload) {
        onDownload(wallpaper, 'original');
      }
    });
  }

  // Color Swatches
  const colorDots = card.querySelectorAll('.color-dot');
  colorDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const col = dot.getAttribute('data-color');
      if (onColorSelect) onColorSelect(col);
    });
  });

  return card;
}
