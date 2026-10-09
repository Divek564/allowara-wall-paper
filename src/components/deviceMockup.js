/**
 * Live Device Mockup Simulator Engine
 * Renders interactive smartphone (mobile), tablet (iPad), and desktop monitor previews
 * with real live updating clock, lockscreen/homescreen toggles, custom clock fonts & colors,
 * live wallpaper visual filters, and ambient RGB glow.
 */

export class DeviceMockupSimulator {
  constructor(containerEl) {
    this.container = containerEl;
    this.wallpaper = null;
    this.currentMode = 'mobile'; // 'mobile' | 'tablet' | 'desktop' | 'raw'
    this.mobileSubMode = 'lockscreen'; // 'lockscreen' | 'homescreen'
    this.desktopSubMode = 'clean'; // 'clean' | 'window'
    this.tabletSubMode = 'split'; // 'split' | 'clean'
    this.isBlurred = false;
    this.activeFilter = 'none'; // 'none' | 'amoled' | 'warm' | 'cyber' | 'noir'
    this.clockFont = 'font-outfit'; // 'font-outfit' | 'font-serif' | 'font-mono' | 'font-rounded'
    this.clockColor = '#ffffff'; // custom hex or 'auto'
    this.clockInterval = null;
  }

  setWallpaper(wallpaper, preferredMode = null) {
    this.wallpaper = wallpaper;
    if (preferredMode) {
      this.currentMode = preferredMode;
    } else {
      // Auto-choose based on wallpaper orientation
      this.currentMode = wallpaper.orientation === 'portrait' ? 'mobile' : 'desktop';
    }
    this.render();
  }

  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  _getFormattedTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dateString = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    return { hours, minutes, seconds, dateString };
  }

  _startClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    const updateTime = () => {
      const { hours, minutes, seconds, dateString } = this._getFormattedTime();
      const clockHoursEl = this.container.querySelectorAll('.mockup-clock-hours');
      const clockMinEl = this.container.querySelectorAll('.mockup-clock-minutes');
      const clockDateEl = this.container.querySelectorAll('.mockup-date-str');
      const desktopTimeEl = this.container.querySelectorAll('.desktop-time-str');

      clockHoursEl.forEach(el => el.textContent = hours);
      clockMinEl.forEach(el => el.textContent = minutes);
      clockDateEl.forEach(el => el.textContent = dateString);
      desktopTimeEl.forEach(el => el.textContent = `${hours}:${minutes}`);
    };

    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  _getFilterStyle() {
    let filterStr = '';
    if (this.isBlurred) {
      filterStr += 'blur(8px) brightness(0.85) ';
    }

    if (this.activeFilter === 'amoled') {
      filterStr += 'contrast(1.25) brightness(0.88) saturate(1.15) ';
    } else if (this.activeFilter === 'warm') {
      filterStr += 'sepia(0.25) saturate(1.3) hue-rotate(-15deg) ';
    } else if (this.activeFilter === 'cyber') {
      filterStr += 'contrast(1.3) saturate(1.6) hue-rotate(15deg) ';
    } else if (this.activeFilter === 'noir') {
      filterStr += 'grayscale(1) contrast(1.3) brightness(0.9) ';
    }

    return filterStr.trim();
  }

  render() {
    if (!this.wallpaper || !this.container) return;

    this.destroy();

    const { hours, minutes, dateString } = this._getFormattedTime();
    const ambientColor = this.wallpaper.avg_color || '#6366f1';
    const previewImg = this.wallpaper.src.large2x || this.wallpaper.src.large || this.wallpaper.src.original;

    const clockColorActual = this.clockColor === 'auto' ? (this.wallpaper.avg_color || '#38bdf8') : this.clockColor;
    const filterCss = this._getFilterStyle();

    this.container.innerHTML = `
      <div class="mockup-studio-wrapper" style="--ambient-accent: ${ambientColor}; --clock-custom-color: ${clockColorActual}">
        <!-- Top Simulator Control Bar -->
        <div class="mockup-controls-bar">
          <div class="mockup-device-switchers" role="tablist" aria-label="Device Preview Modes">
            <button type="button" class="mockup-switch-btn ${this.currentMode === 'mobile' ? 'active' : ''}" data-mode="mobile" id="btn-mode-mobile">
              <span class="icon">📱</span>
              <span>Mobile Phone</span>
            </button>
            <button type="button" class="mockup-switch-btn ${this.currentMode === 'tablet' ? 'active' : ''}" data-mode="tablet" id="btn-mode-tablet">
              <span class="icon">📟</span>
              <span>Tablet (iPad)</span>
            </button>
            <button type="button" class="mockup-switch-btn ${this.currentMode === 'desktop' ? 'active' : ''}" data-mode="desktop" id="btn-mode-desktop">
              <span class="icon">🖥️</span>
              <span>Desktop Display</span>
            </button>
            <button type="button" class="mockup-switch-btn ${this.currentMode === 'raw' ? 'active' : ''}" data-mode="raw" id="btn-mode-raw">
              <span class="icon">🔍</span>
              <span>Fullscreen Clean</span>
            </button>
          </div>

          <div class="mockup-extra-toggles">
            ${this.currentMode === 'mobile' ? `
              <button type="button" class="mockup-pill-btn ${this.mobileSubMode === 'lockscreen' ? 'active' : ''}" id="btn-submode-lock">
                🔒 Lock Screen
              </button>
              <button type="button" class="mockup-pill-btn ${this.mobileSubMode === 'homescreen' ? 'active' : ''}" id="btn-submode-home">
                📱 Home Screen
              </button>
              <button type="button" class="mockup-pill-btn ${this.isBlurred ? 'active' : ''}" id="btn-toggle-blur" title="Toggle UI Depth Blur">
                💧 ${this.isBlurred ? 'Blur: ON' : 'Blur: OFF'}
              </button>
            ` : ''}

            ${this.currentMode === 'tablet' ? `
              <button type="button" class="mockup-pill-btn ${this.tabletSubMode === 'split' ? 'active' : ''}" id="btn-tablet-split">
                🪟 Stage Manager
              </button>
              <button type="button" class="mockup-pill-btn ${this.tabletSubMode === 'clean' ? 'active' : ''}" id="btn-tablet-clean">
                ✨ Clean Slate
              </button>
            ` : ''}

            ${this.currentMode === 'desktop' ? `
              <button type="button" class="mockup-pill-btn ${this.desktopSubMode === 'clean' ? 'active' : ''}" id="btn-desktop-clean">
                ✨ Clean Desk
              </button>
              <button type="button" class="mockup-pill-btn ${this.desktopSubMode === 'window' ? 'active' : ''}" id="btn-desktop-window">
                🪟 App Windows
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Customizer Toolbar: Clock Typography & Visual FX -->
        ${this.currentMode === 'mobile' && this.mobileSubMode === 'lockscreen' ? `
          <div class="lockscreen-customizer-bar">
            <div class="customizer-group">
              <span class="customizer-label">Clock Font:</span>
              <div class="font-buttons-row">
                <button type="button" class="font-btn ${this.clockFont === 'font-outfit' ? 'active' : ''}" data-font="font-outfit" title="Modern Bold Sans">Outfit</button>
                <button type="button" class="font-btn ${this.clockFont === 'font-serif' ? 'active' : ''}" data-font="font-serif" title="Classic Serif">Serif</button>
                <button type="button" class="font-btn ${this.clockFont === 'font-mono' ? 'active' : ''}" data-font="font-mono" title="Cyber Monospace">Tech Mono</button>
                <button type="button" class="font-btn ${this.clockFont === 'font-rounded' ? 'active' : ''}" data-font="font-rounded" title="Rounded Soft">Rounded</button>
              </div>
            </div>

            <div class="customizer-group">
              <span class="customizer-label">Clock Color:</span>
              <div class="clock-colors-row">
                <button type="button" class="clock-color-dot ${this.clockColor === '#ffffff' ? 'active' : ''}" style="background:#ffffff" data-color="#ffffff" title="Pure White"></button>
                <button type="button" class="clock-color-dot ${this.clockColor === '#06b6d4' ? 'active' : ''}" style="background:#06b6d4" data-color="#06b6d4" title="Cyan"></button>
                <button type="button" class="clock-color-dot ${this.clockColor === '#ec4899' ? 'active' : ''}" style="background:#ec4899" data-color="#ec4899" title="Neon Pink"></button>
                <button type="button" class="clock-color-dot ${this.clockColor === '#f59e0b' ? 'active' : ''}" style="background:#f59e0b" data-color="#f59e0b" title="Golden"></button>
                <button type="button" class="clock-color-dot ${this.clockColor === '#10b981' ? 'active' : ''}" style="background:#10b981" data-color="#10b981" title="Emerald"></button>
                <button type="button" class="clock-color-dot ${this.clockColor === 'auto' ? 'active' : ''}" style="background:var(--ambient-accent)" data-color="auto" title="Auto Wallpaper Color">✨</button>
              </div>
            </div>

            <div class="customizer-group">
              <span class="customizer-label">Filter FX:</span>
              <select class="customizer-select" id="selectVisualFilter">
                <option value="none" ${this.activeFilter === 'none' ? 'selected' : ''}>Original Color</option>
                <option value="amoled" ${this.activeFilter === 'amoled' ? 'selected' : ''}>AMOLED Deep Contrast</option>
                <option value="warm" ${this.activeFilter === 'warm' ? 'selected' : ''}>Warm Cinematic Sunset</option>
                <option value="cyber" ${this.activeFilter === 'cyber' ? 'selected' : ''}>Cyberpunk Neon Pop</option>
                <option value="noir" ${this.activeFilter === 'noir' ? 'selected' : ''}>Noir Monochrome B&W</option>
              </select>
            </div>
          </div>
        ` : ''}

        <!-- Simulator Viewport Area -->
        <div class="mockup-stage ${this.currentMode}-stage">
          ${this._renderDeviceBody(previewImg, { hours, minutes, dateString }, filterCss)}
        </div>
      </div>
    `;

    this._bindEvents();
    this._startClock();
  }

  _renderDeviceBody(imgUrl, { hours, minutes, dateString }, filterCss) {
    if (this.currentMode === 'mobile') {
      return `
        <!-- SMARTPHONE MOCKUP -->
        <div class="phone-device-frame">
          <div class="phone-screen" style="background-image: url('${imgUrl}'); ${filterCss ? `filter: ${filterCss};` : ''}">
          </div>

          <!-- Dynamic Island / Punch Hole -->
          <div class="phone-island">
            <div class="island-camera"></div>
            <div class="island-sensor"></div>
          </div>

          <!-- Status Bar -->
          <div class="phone-status-bar">
            <span class="phone-status-time"><span class="mockup-clock-hours">${hours}</span>:<span class="mockup-clock-minutes">${minutes}</span></span>
            <div class="phone-status-icons">
              <span class="status-icon" title="5G Ultra">5G</span>
              <span class="status-icon" title="Full Reception">📶</span>
              <span class="status-battery" title="Battery 98%">
                <span class="battery-level"></span>
              </span>
            </div>
          </div>

          <!-- Phone Foreground UI -->
          <div class="phone-ui-overlay">
            ${this.mobileSubMode === 'lockscreen' ? `
              <div class="phone-lockscreen-view">
                <div class="lock-indicator" aria-hidden="true">🔒</div>
                <div class="lock-date mockup-date-str">${dateString}</div>
                <div class="lock-clock ${this.clockFont}">
                  <span class="mockup-clock-hours">${hours}</span><span class="clock-colon">:</span><span class="mockup-clock-minutes">${minutes}</span>
                </div>

                <!-- Realistic Notification Bubble -->
                <div class="lock-notification-bubble">
                  <div class="notif-header">
                    <span class="notif-badge">✨ AuraWalls</span>
                    <span class="notif-time">Just now</span>
                  </div>
                  <div class="notif-body">
                    <strong>Wallpaper Active in 4K</strong>
                    <p>Tap to view in high resolution or customize palette.</p>
                  </div>
                </div>

                <!-- Bottom Lockscreen Actions -->
                <div class="lock-bottom-actions">
                  <button type="button" class="lock-circle-btn" title="Flashlight">🔦</button>
                  <div class="lock-swipe-text">Swipe up to unlock</div>
                  <button type="button" class="lock-circle-btn" title="Camera">📷</button>
                </div>
              </div>
            ` : `
              <!-- Homescreen View with App Icons -->
              <div class="phone-homescreen-view">
                <div class="homescreen-widget">
                  <div class="widget-weather">
                    <span class="weather-temp">72°</span>
                    <span class="weather-city">Sunny Hills</span>
                  </div>
                  <div class="widget-cal">
                    <span class="cal-day">${dateString.split(',')[0]}</span>
                    <span class="cal-num">${new Date().getDate()}</span>
                  </div>
                </div>

                <div class="app-icon-grid">
                  <div class="app-item"><div class="app-icon icon-photos">🖼️</div><span class="app-label">Photos</span></div>
                  <div class="app-item"><div class="app-icon icon-camera">📷</div><span class="app-label">Camera</span></div>
                  <div class="app-item"><div class="app-icon icon-music">🎵</div><span class="app-label">Music</span></div>
                  <div class="app-item"><div class="app-icon icon-safari">🧭</div><span class="app-label">Safari</span></div>
                  <div class="app-item"><div class="app-icon icon-maps">🗺️</div><span class="app-label">Maps</span></div>
                  <div class="app-item"><div class="app-icon icon-weather">☀️</div><span class="app-label">Weather</span></div>
                  <div class="app-item"><div class="app-icon icon-notes">📝</div><span class="app-label">Notes</span></div>
                  <div class="app-item"><div class="app-icon icon-settings">⚙️</div><span class="app-label">Settings</span></div>
                </div>

                <!-- Phone Dock -->
                <div class="phone-dock">
                  <div class="app-icon icon-call">📞</div>
                  <div class="app-icon icon-chat">💬</div>
                  <div class="app-icon icon-browser">🌐</div>
                  <div class="app-icon icon-mail">✉️</div>
                </div>
              </div>
            `}

            <!-- Home indicator bar -->
            <div class="phone-home-indicator"></div>
          </div>
        </div>
      `;
    } else if (this.currentMode === 'tablet') {
      return `
        <!-- TABLET / IPAD PRO MOCKUP -->
        <div class="tablet-device-frame">
          <div class="tablet-screen" style="background-image: url('${imgUrl}'); ${filterCss ? `filter: ${filterCss};` : ''}">
            <!-- Tablet Top Bar -->
            <div class="tablet-topbar">
              <span class="tablet-time"><span class="mockup-clock-hours">${hours}</span>:<span class="mockup-clock-minutes">${minutes}</span></span>
              <div class="tablet-top-center">
                <span class="tablet-camera-dot"></span>
              </div>
              <div class="tablet-status-icons">
                <span>100% 🔋</span>
                <span>📶</span>
              </div>
            </div>

            <!-- Tablet Stage Workspace -->
            <div class="tablet-workspace">
              ${this.tabletSubMode === 'split' ? `
                <div class="tablet-stage-manager-row">
                  <!-- App Window 1 -->
                  <div class="tablet-window tablet-window-left">
                    <div class="tab-win-header">
                      <span class="win-dot dot-red"></span>
                      <span class="win-dot dot-yellow"></span>
                      <span class="win-dot dot-green"></span>
                      <span class="win-title">Notes • Design Moodboard</span>
                    </div>
                    <div class="tab-win-body">
                      <h4>4K Wallpaper Palette</h4>
                      <p>Theme: ${this.wallpaper.title}</p>
                      <div class="mini-swatches">
                        ${(this.wallpaper.colors || [this.wallpaper.avg_color]).slice(0, 4).map(c => `
                          <span style="background:${c}"></span>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- App Window 2 -->
                  <div class="tablet-window tablet-window-right">
                    <div class="tab-win-header">
                      <span class="win-title">Procreate Canvas (120Hz)</span>
                    </div>
                    <div class="tab-win-body canvas-body">
                      <div class="procreate-canvas-grid"></div>
                      <span class="brush-indicator">✏️ Apple Pencil Connected</span>
                    </div>
                  </div>
                </div>
              ` : `
                <!-- Clean Tablet Desktop with Widgets -->
                <div class="tablet-clean-widgets">
                  <div class="tablet-widget-card">
                    <span class="widget-cal-header">${dateString}</span>
                    <h3>${hours}:${minutes}</h3>
                    <p>Next Event: Studio Review at 2:00 PM</p>
                  </div>
                </div>
              `}
            </div>

            <!-- Floating Tablet Dock -->
            <div class="tablet-dock">
              <div class="tab-dock-icon">🖼️</div>
              <div class="tab-dock-icon">🎨</div>
              <div class="tab-dock-icon">📝</div>
              <div class="tab-dock-icon">🧭</div>
              <div class="tab-dock-icon">🎵</div>
              <div class="tab-dock-sep"></div>
              <div class="tab-dock-icon">⚙️</div>
            </div>

            <!-- Tablet Home Bar -->
            <div class="tablet-home-indicator"></div>
          </div>
        </div>
      `;
    } else if (this.currentMode === 'desktop') {
      return `
        <!-- DESKTOP MONITOR MOCKUP -->
        <div class="desktop-monitor-wrapper">
          <div class="desktop-screen-bezel">
            <!-- Screen Display -->
            <div class="desktop-display" style="background-image: url('${imgUrl}'); ${filterCss ? `filter: ${filterCss};` : ''}">
              <!-- Top Menu Bar -->
              <div class="desktop-menubar">
                <div class="menubar-left">
                  <span class="menubar-apple">🍎</span>
                  <span class="menubar-app-name">AuraFinder</span>
                  <span class="menubar-item">File</span>
                  <span class="menubar-item">Edit</span>
                  <span class="menubar-item">View</span>
                  <span class="menubar-item">Window</span>
                  <span class="menubar-item">Help</span>
                </div>
                <div class="menubar-right">
                  <span class="menubar-icon">🔋 100%</span>
                  <span class="menubar-icon">📶</span>
                  <span class="menubar-icon">🔍</span>
                  <span class="menubar-icon desktop-time-str">${hours}:${minutes}</span>
                </div>
              </div>

              <!-- Desktop Canvas Workspace -->
              <div class="desktop-workspace">
                ${this.desktopSubMode === 'window' ? `
                  <!-- Floating Pro Window Mockup -->
                  <div class="desktop-window-mockup">
                    <div class="window-titlebar">
                      <div class="window-traffic-lights">
                        <span class="traffic-light light-red"></span>
                        <span class="traffic-light light-yellow"></span>
                        <span class="traffic-light light-green"></span>
                      </div>
                      <span class="window-title">AuraWalls_Studio_4K.config</span>
                      <span class="window-spacer"></span>
                    </div>
                    <div class="window-content">
                      <div class="code-line"><span class="c-keyword">const</span> <span class="c-var">wallpaper</span> = <span class="c-keyword">await</span> AuraWalls.<span class="c-func">render4K</span>({</div>
                      <div class="code-line indent"><span class="c-prop">id</span>: <span class="c-val">${this.wallpaper.id}</span>,</div>
                      <div class="code-line indent"><span class="c-prop">resolution</span>: <span class="c-str">"${this.wallpaper.width}x${this.wallpaper.height}"</span>,</div>
                      <div class="code-line indent"><span class="c-prop">photographer</span>: <span class="c-str">"${this.wallpaper.photographer}"</span>,</div>
                      <div class="code-line indent"><span class="c-prop">colorGlow</span>: <span class="c-str">"${this.wallpaper.avg_color}"</span></div>
                      <div class="code-line">});</div>
                      <div class="code-line"><span class="c-comment">// Status: Ultra HD Studio Output Ready</span></div>
                    </div>
                  </div>
                ` : `
                  <!-- Clean Desktop with subtle folder icons -->
                  <div class="desktop-clean-icons">
                    <div class="desk-folder">
                      <span class="folder-icon">📁</span>
                      <span class="folder-name">4K Renders</span>
                    </div>
                    <div class="desk-folder">
                      <span class="folder-icon">📁</span>
                      <span class="folder-name">Mobile Sets</span>
                    </div>
                  </div>
                `}
              </div>

              <!-- Bottom Floating macOS Dock -->
              <div class="desktop-dock">
                <div class="dock-item" title="Finder">🗂️</div>
                <div class="dock-item" title="Safari">🧭</div>
                <div class="dock-item" title="Terminal">💻</div>
                <div class="dock-item" title="Code Editor">⚡</div>
                <div class="dock-item" title="Photoshop / Figma">🎨</div>
                <div class="dock-item" title="Music Player">🎧</div>
                <div class="dock-item" title="Photos">🖼️</div>
                <div class="dock-separator"></div>
                <div class="dock-item" title="Trash">🗑️</div>
              </div>
            </div>
          </div>
          <!-- Monitor Stand & Base -->
          <div class="monitor-neck"></div>
          <div class="monitor-base"></div>
        </div>
      `;
    } else {
      // Raw Fullscreen Clean View
      return `
        <div class="mockup-raw-container">
          <img src="${imgUrl}" alt="${this.wallpaper.title}" class="mockup-raw-image" style="${filterCss ? `filter: ${filterCss};` : ''}" loading="lazy" />
          <div class="raw-info-tag">
            <span>${this.wallpaper.width} × ${this.wallpaper.height} px</span>
            <span>•</span>
            <span>Original Aspect: ${this.wallpaper.aspectRatio}</span>
          </div>
        </div>
      `;
    }
  }

  _bindEvents() {
    // Mode switchers
    const btnMobile = this.container.querySelector('#btn-mode-mobile');
    const btnTablet = this.container.querySelector('#btn-mode-tablet');
    const btnDesktop = this.container.querySelector('#btn-mode-desktop');
    const btnRaw = this.container.querySelector('#btn-mode-raw');

    if (btnMobile) btnMobile.onclick = () => { this.currentMode = 'mobile'; this.render(); };
    if (btnTablet) btnTablet.onclick = () => { this.currentMode = 'tablet'; this.render(); };
    if (btnDesktop) btnDesktop.onclick = () => { this.currentMode = 'desktop'; this.render(); };
    if (btnRaw) btnRaw.onclick = () => { this.currentMode = 'raw'; this.render(); };

    // Mobile sub-mode toggles
    const btnLock = this.container.querySelector('#btn-submode-lock');
    const btnHome = this.container.querySelector('#btn-submode-home');
    const btnBlur = this.container.querySelector('#btn-toggle-blur');

    if (btnLock) btnLock.onclick = () => { this.mobileSubMode = 'lockscreen'; this.render(); };
    if (btnHome) btnHome.onclick = () => { this.mobileSubMode = 'homescreen'; this.render(); };
    if (btnBlur) btnBlur.onclick = () => { this.isBlurred = !this.isBlurred; this.render(); };

    // Tablet sub-mode toggles
    const btnTabSplit = this.container.querySelector('#btn-tablet-split');
    const btnTabClean = this.container.querySelector('#btn-tablet-clean');

    if (btnTabSplit) btnTabSplit.onclick = () => { this.tabletSubMode = 'split'; this.render(); };
    if (btnTabClean) btnTabClean.onclick = () => { this.tabletSubMode = 'clean'; this.render(); };

    // Desktop sub-mode toggles
    const btnDeskClean = this.container.querySelector('#btn-desktop-clean');
    const btnDeskWindow = this.container.querySelector('#btn-desktop-window');

    if (btnDeskClean) btnDeskClean.onclick = () => { this.desktopSubMode = 'clean'; this.render(); };
    if (btnDeskWindow) btnDeskWindow.onclick = () => { this.desktopSubMode = 'window'; this.render(); };

    // Clock Typography Fonts
    const fontBtns = this.container.querySelectorAll('.font-btn');
    fontBtns.forEach(btn => {
      btn.onclick = () => {
        this.clockFont = btn.getAttribute('data-font');
        this.render();
      };
    });

    // Clock Colors
    const colorDots = this.container.querySelectorAll('.clock-color-dot');
    colorDots.forEach(dot => {
      dot.onclick = () => {
        this.clockColor = dot.getAttribute('data-color');
        this.render();
      };
    });

    // Visual Filter Select
    const filterSelect = this.container.querySelector('#selectVisualFilter');
    if (filterSelect) {
      filterSelect.onchange = (e) => {
        this.activeFilter = e.target.value;
        this.render();
      };
    }
  }
}
