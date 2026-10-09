import { DeviceMockupSimulator } from './deviceMockup.js';
import { StorageService } from '../services/storageService.js';
import { backendApi } from '../services/backendApi.js';
import { toast } from './toast.js';

/**
 * Controller for the Fullscreen Wallpaper Studio & Device Simulator Modal
 * Adheres to modern-web-guidance: <dialog closedby="any"> with light-dismiss fallback
 */
export class WallpaperModal {
  constructor() {
    this.dialog = null;
    this.wallpaper = null;
    this.wallpaperList = [];
    this.currentIndex = -1;
    this.simulator = null;
    this.isDownloading = false;

    this._initDOM();
  }

  _initDOM() {
    let dialog = document.getElementById('wallpaperStudioDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'wallpaperStudioDialog';
      dialog.className = 'studio-dialog';
      dialog.setAttribute('closedby', 'any');
      dialog.setAttribute('aria-labelledby', 'wallpaperDialogTitle');

      dialog.innerHTML = `
        <div class="studio-modal-shell">
          <!-- Top Header Strip -->
          <header class="studio-header">
            <div class="studio-header-left">
              <span class="studio-brand-tag">✨ AuraStudio 4K</span>
              <span class="studio-divider">/</span>
              <h2 id="wallpaperDialogTitle" class="studio-title">Wallpaper Preview</h2>
            </div>

            <div class="studio-nav-arrows">
              <button type="button" class="btn-studio-nav" id="studioBtnPrev" aria-label="Previous Wallpaper" title="Previous (← Key)">
                <span>◀</span> Prev
              </button>
              <span class="studio-nav-counter" id="studioNavCounter">1 / 10</span>
              <button type="button" class="btn-studio-nav" id="studioBtnNext" aria-label="Next Wallpaper" title="Next (→ Key)">
                Next <span>▶</span>
              </button>
            </div>

            <div class="studio-header-right">
              <button type="button" class="btn-studio-close" id="studioBtnClose" aria-label="Close Studio (Esc)" title="Close (Esc)">
                &times;
              </button>
            </div>
          </header>

          <!-- Studio Body Layout -->
          <div class="studio-body">
            <!-- Left: Device Mockup Stage Area -->
            <div class="studio-left-stage" id="mockupSimulatorContainer">
              <!-- Mounted dynamically by DeviceMockupSimulator -->
            </div>

            <!-- Right: Studio Download & Spec Inspector -->
            <aside class="studio-right-panel">
              <!-- Wallpaper Overview -->
              <div class="inspector-card">
                <div class="inspector-badge-row">
                  <span class="spec-chip chip-orientation" id="modalOrientationBadge">🖥️ Desktop</span>
                  <span class="spec-chip chip-res" id="modalResBadge">4K Ultra HD</span>
                  <span class="spec-chip chip-mp" id="modalMpBadge">18.5 MP</span>
                </div>

                <h3 class="inspector-title" id="modalWallpaperTitle">Wallpaper Title</h3>

                <!-- Photographer Info -->
                <div class="photographer-box">
                  <div class="photographer-avatar-large" id="modalPhotographerAvatar">P</div>
                  <div class="photographer-meta">
                    <div class="photographer-name-row">
                      <span class="ph-name" id="modalPhotographerName">Photographer Name</span>
                      <span class="ph-badge">✓ Verified</span>
                    </div>
                    <a href="#" target="_blank" rel="noopener noreferrer" class="ph-link" id="modalPhotographerLink">
                      View profile on Pexels ↗
                    </a>
                  </div>
                </div>

                <!-- Palette Colors -->
                <div class="palette-box">
                  <span class="palette-label">Dominant Color Palette</span>
                  <div class="palette-swatches-grid" id="modalPaletteSwatches">
                    <!-- Dynamic Swatches -->
                  </div>
                </div>
              </div>

              <!-- Download Engine Hub -->
              <div class="inspector-card download-hub-card">
                <h4 class="hub-header">
                  <span>📥 Download Wallpapers</span>
                  <span class="hub-free-tag">Free 4K HDR</span>
                </h4>
                <p class="hub-desc">Optimized resolutions tailored for high-density mobile & desktop displays:</p>

                <div class="download-buttons-list">
                  <!-- Mobile Options -->
                  <button type="button" class="dl-btn" data-type="mobile-fhd" id="dlMobileFhd">
                    <div class="dl-btn-left">
                      <span class="dl-icon">📱</span>
                      <div class="dl-info">
                        <strong>Mobile FHD+</strong>
                        <span>1080 × 2400 (9:16) • Flagship Phones</span>
                      </div>
                    </div>
                    <span class="dl-arrow">↓</span>
                  </button>

                  <button type="button" class="dl-btn" data-type="mobile-qhd" id="dlMobileQhd">
                    <div class="dl-btn-left">
                      <span class="dl-icon">📱</span>
                      <div class="dl-info">
                        <strong>Mobile QHD+ OLED</strong>
                        <span>1440 × 3120 (9:19.5) • High Res</span>
                      </div>
                    </div>
                    <span class="dl-arrow">↓</span>
                  </button>

                  <!-- Desktop Options -->
                  <button type="button" class="dl-btn" data-type="desktop-4k" id="dlDesktop4k">
                    <div class="dl-btn-left">
                      <span class="dl-icon">🖥️</span>
                      <div class="dl-info">
                        <strong>Desktop 4K UHD</strong>
                        <span>3840 × 2160 (16:9) • Ultra HD</span>
                      </div>
                    </div>
                    <span class="dl-arrow">↓</span>
                  </button>

                  <button type="button" class="dl-btn" data-type="desktop-1080" id="dlDesktop1080">
                    <div class="dl-btn-left">
                      <span class="dl-icon">💻</span>
                      <div class="dl-info">
                        <strong>Laptop / Full HD</strong>
                        <span>1920 × 1080 (16:9) • Standard</span>
                      </div>
                    </div>
                    <span class="dl-arrow">↓</span>
                  </button>

                  <!-- Original Full Master -->
                  <button type="button" class="dl-btn dl-btn-master" data-type="original" id="dlOriginalMaster">
                    <div class="dl-btn-left">
                      <span class="dl-icon">💎</span>
                      <div class="dl-info">
                        <strong>Original Camera Master</strong>
                        <span id="dlMasterRes">Full Native Resolution</span>
                      </div>
                    </div>
                    <span class="dl-arrow">↓</span>
                  </button>
                </div>
              </div>

              <!-- Quick Action Footer Tools -->
              <div class="inspector-card studio-actions-row">
                <button type="button" class="studio-action-btn" id="modalFavBtn">
                  <svg viewBox="0 0 24 24" class="heart-icon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span id="modalFavLabel">Favorite</span>
                </button>
                <button type="button" class="studio-action-btn" id="modalShareBtn" title="Copy Direct Image Link">
                  <span>🔗 Copy Link</span>
                </button>
                <a href="#" target="_blank" rel="noopener noreferrer" class="studio-action-btn" id="modalPexelsPageBtn" title="Open source on Pexels">
                  <span>↗ Pexels</span>
                </a>
              </div>
            </aside>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);
    }

    this.dialog = dialog;
    this.simulatorContainer = dialog.querySelector('#mockupSimulatorContainer');
    this.simulator = new DeviceMockupSimulator(this.simulatorContainer);

    this._bindDialogEvents();
  }

  _bindDialogEvents() {
    // Light-dismiss fallback for browsers without closedby support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      this.dialog.addEventListener('click', (event) => {
        if (event.target !== this.dialog) return;
        const rect = this.dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!isDialogContent) {
          this.close();
        }
      });
    }

    // Close button
    const closeBtn = this.dialog.querySelector('#studioBtnClose');
    if (closeBtn) closeBtn.onclick = () => this.close();

    // Dialog close event listener to clean up interval
    this.dialog.addEventListener('close', () => {
      if (this.simulator) this.simulator.destroy();
    });

    // Arrow navigation
    const prevBtn = this.dialog.querySelector('#studioBtnPrev');
    const nextBtn = this.dialog.querySelector('#studioBtnNext');

    if (prevBtn) prevBtn.onclick = () => this.navigate(-1);
    if (nextBtn) nextBtn.onclick = () => this.navigate(1);

    // Keyboard navigation (Esc is handled by <dialog>, ArrowLeft & ArrowRight handled here)
    window.addEventListener('keydown', (e) => {
      if (!this.dialog || !this.dialog.open) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigate(1);
      }
    });

    // Download buttons
    const dlMobileFhd = this.dialog.querySelector('#dlMobileFhd');
    const dlMobileQhd = this.dialog.querySelector('#dlMobileQhd');
    const dlDesktop4k = this.dialog.querySelector('#dlDesktop4k');
    const dlDesktop1080 = this.dialog.querySelector('#dlDesktop1080');
    const dlOriginalMaster = this.dialog.querySelector('#dlOriginalMaster');

    if (dlMobileFhd) dlMobileFhd.onclick = () => this.triggerDownload('mobile-fhd');
    if (dlMobileQhd) dlMobileQhd.onclick = () => this.triggerDownload('mobile-qhd');
    if (dlDesktop4k) dlDesktop4k.onclick = () => this.triggerDownload('desktop-4k');
    if (dlDesktop1080) dlDesktop1080.onclick = () => this.triggerDownload('desktop-1080');
    if (dlOriginalMaster) dlOriginalMaster.onclick = () => this.triggerDownload('original');

    // Favorite button
    const favBtn = this.dialog.querySelector('#modalFavBtn');
    if (favBtn) {
      favBtn.onclick = () => {
        if (!this.wallpaper) return;
        const added = StorageService.toggleFavorite(this.wallpaper);
        this._updateFavButton(added);
        if (added) {
          toast.heart(`Added to Favorites!`);
        } else {
          toast.info('Removed from Favorites');
        }
      };
    }

    // Share / Copy Link button
    const shareBtn = this.dialog.querySelector('#modalShareBtn');
    if (shareBtn) {
      shareBtn.onclick = async () => {
        if (!this.wallpaper) return;
        const link = this.wallpaper.src.original || this.wallpaper.url;
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(link);
            toast.success('High-res wallpaper URL copied to clipboard!', 'Link Copied');
          } else {
            prompt('Copy wallpaper link:', link);
          }
        } catch {
          prompt('Copy wallpaper link:', link);
        }
      };
    }
  }

  open(wallpaper, list = []) {
    this.wallpaper = wallpaper;
    this.wallpaperList = list.length > 0 ? list : [wallpaper];
    this.currentIndex = this.wallpaperList.findIndex(item => String(item.id) === String(wallpaper.id));

    this._populateModal();
    this.dialog.showModal();

    // Mount simulator
    this.simulator.setWallpaper(wallpaper);
  }

  close() {
    if (this.dialog && this.dialog.open) {
      this.dialog.close();
      if (this.simulator) this.simulator.destroy();
    }
  }

  navigate(direction) {
    if (!this.wallpaperList || this.wallpaperList.length <= 1) return;

    let newIndex = this.currentIndex + direction;
    if (newIndex < 0) newIndex = this.wallpaperList.length - 1;
    if (newIndex >= this.wallpaperList.length) newIndex = 0;

    this.currentIndex = newIndex;
    this.wallpaper = this.wallpaperList[newIndex];

    this._populateModal();
    this.simulator.setWallpaper(this.wallpaper);
  }

  _populateModal() {
    if (!this.wallpaper) return;

    const w = this.wallpaper;

    // Title and Header
    const titleEl = this.dialog.querySelector('#wallpaperDialogTitle');
    const modalTitleEl = this.dialog.querySelector('#modalWallpaperTitle');
    if (titleEl) titleEl.textContent = w.title;
    if (modalTitleEl) modalTitleEl.textContent = w.title;

    // Counter
    const counterEl = this.dialog.querySelector('#studioNavCounter');
    if (counterEl) {
      counterEl.textContent = `${this.currentIndex + 1} / ${this.wallpaperList.length}`;
    }

    // Badges
    const badgeOrient = this.dialog.querySelector('#modalOrientationBadge');
    const badgeRes = this.dialog.querySelector('#modalResBadge');
    const badgeMp = this.dialog.querySelector('#modalMpBadge');

    const isMobile = w.orientation === 'portrait';
    if (badgeOrient) {
      badgeOrient.textContent = isMobile ? '📱 Mobile (9:16)' : (w.orientation === 'landscape' ? '🖥️ Desktop (16:9)' : '🔲 Square (1:1)');
    }

    if (badgeRes) {
      badgeRes.textContent = `${w.width} × ${w.height} px`;
    }

    if (badgeMp) {
      const mp = ((w.width * w.height) / 1000000).toFixed(1);
      badgeMp.textContent = `${mp} Megapixels`;
    }

    // Photographer
    const phAvatar = this.dialog.querySelector('#modalPhotographerAvatar');
    const phName = this.dialog.querySelector('#modalPhotographerName');
    const phLink = this.dialog.querySelector('#modalPhotographerLink');
    const pexelsBtn = this.dialog.querySelector('#modalPexelsPageBtn');

    if (phAvatar) {
      phAvatar.textContent = w.photographer.charAt(0).toUpperCase();
      phAvatar.style.backgroundColor = w.avg_color || '#6366f1';
    }
    if (phName) phName.textContent = w.photographer;
    if (phLink) phLink.href = w.photographer_url;
    if (pexelsBtn) pexelsBtn.href = w.url;

    // Master resolution string
    const masterResEl = this.dialog.querySelector('#dlMasterRes');
    if (masterResEl) masterResEl.textContent = `${w.width} × ${w.height} • Master Quality`;

    // Palette Swatches
    const swatchesContainer = this.dialog.querySelector('#modalPaletteSwatches');
    if (swatchesContainer) {
      const colors = w.colors && w.colors.length > 0 ? w.colors : [w.avg_color || '#6366f1'];
      swatchesContainer.innerHTML = colors.map(hex => `
        <button type="button" class="palette-swatch-item" style="background-color: ${hex}" data-hex="${hex}" title="Click to copy ${hex}">
          <span class="swatch-hex">${hex}</span>
        </button>
      `).join('');

      swatchesContainer.querySelectorAll('.palette-swatch-item').forEach(btn => {
        btn.onclick = () => {
          const hex = btn.getAttribute('data-hex');
          navigator.clipboard?.writeText(hex);
          toast.success(`Color ${hex} copied to clipboard!`, 'Palette Hex');
        };
      });
    }

    // Favorite state
    const isFav = StorageService.isFavorite(w.id);
    this._updateFavButton(isFav);
  }

  _updateFavButton(isFav) {
    const favBtn = this.dialog.querySelector('#modalFavBtn');
    const label = this.dialog.querySelector('#modalFavLabel');
    const heart = this.dialog.querySelector('#modalFavBtn .heart-icon');

    if (favBtn) favBtn.classList.toggle('active', isFav);
    if (heart) heart.setAttribute('fill', isFav ? 'currentColor' : 'none');
    if (label) label.textContent = isFav ? 'Favorited' : 'Favorite';
  }

  /**
   * Universal Download Trigger
   * Fetches blob to force save-as file with appropriate resolution
   */
  async triggerDownload(resType = 'original') {
    if (!this.wallpaper) return;
    if (this.isDownloading) return;

    this.isDownloading = true;
    const w = this.wallpaper;

    let targetUrl = w.src.original;
    let label = 'Original Master';

    // Tailor URL to resolution
    if (resType === 'mobile-fhd') {
      targetUrl = `${w.src.original}?auto=compress&cs=tinysrgb&fit=crop&h=2400&w=1080`;
      label = 'Mobile FHD+ (1080x2400)';
    } else if (resType === 'mobile-qhd') {
      targetUrl = `${w.src.original}?auto=compress&cs=tinysrgb&fit=crop&h=3120&w=1440`;
      label = 'Mobile QHD+ (1440x3120)';
    } else if (resType === 'desktop-4k') {
      targetUrl = `${w.src.original}?auto=compress&cs=tinysrgb&fit=crop&h=2160&w=3840`;
      label = 'Desktop 4K (3840x2160)';
    } else if (resType === 'desktop-1080') {
      targetUrl = `${w.src.original}?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920`;
      label = 'Desktop 1080p (1920x1080)';
    }

    toast.download(`Preparing ${label}...`, 'Downloading');
    backendApi.recordDownload(w.id, resType);

    const cleanTitle = (w.title || 'wallpaper').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const filename = `aurawalls-${cleanTitle}-${resType}.jpg`;

    try {
      // Try blob fetch first
      const res = await fetch(targetUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Fetch failed');

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast.success(`Saved "${filename}" to downloads!`, 'Download Complete');
    } catch (err) {
      console.warn('Direct blob download prevented by CORS policy, falling back to direct link:', err);
      // Fallback: Open in new window for direct save
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.info('Opened high-resolution image in new tab for direct save.', 'High-Res Ready');
    } finally {
      this.isDownloading = false;
    }
  }
}
