import { StorageService } from '../services/storageService.js';
import { pexelsService } from '../services/pexelsService.js';
import { toast } from './toast.js';

/**
 * Pexels API Key Configuration Modal
 * Native <dialog closedby="any">
 */
export class ApiKeyModal {
  constructor(onKeyUpdated) {
    this.dialog = null;
    this.onKeyUpdated = onKeyUpdated;
    this._initDOM();
  }

  _initDOM() {
    let dialog = document.getElementById('apiKeyDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'apiKeyDialog';
      dialog.className = 'api-key-dialog';
      dialog.setAttribute('closedby', 'any');
      dialog.setAttribute('aria-labelledby', 'apiKeyDialogTitle');

      dialog.innerHTML = `
        <div class="api-key-modal-shell">
          <header class="api-dialog-header">
            <div class="api-dialog-icon">🔑</div>
            <div class="api-dialog-header-text">
              <h2 id="apiKeyDialogTitle">Pexels API Connection</h2>
              <p>Connect your personal key for live search, infinite trending feeds, and instant downloads.</p>
            </div>
            <button type="button" class="btn-studio-close" id="apiKeyBtnClose" aria-label="Close dialog">&times;</button>
          </header>

          <div class="api-dialog-body">
            <!-- Connection Status Pill -->
            <div class="api-status-banner" id="apiKeyStatusBanner">
              <span class="status-pulse-dot"></span>
              <span class="status-text-label" id="apiKeyStatusText">Checking connection...</span>
            </div>

            <div class="api-input-group">
              <label for="inputPexelsKey" class="api-input-label">Pexels API Key / Token</label>
              <div class="api-input-wrapper">
                <input
                  type="password"
                  id="inputPexelsKey"
                  class="api-key-input"
                  placeholder="Paste your 56-character Pexels API key here..."
                  autocomplete="off"
                  spellcheck="false"
                />
                <button type="button" class="btn-toggle-visibility" id="btnToggleKeyVisibility" title="Toggle visibility">👁️</button>
              </div>
              <span class="api-input-hint">Your API key stays strictly in your browser's local storage and is never sent to any external proxy.</span>
            </div>

            <div class="api-action-buttons">
              <button type="button" class="btn-secondary" id="btnTestKey">
                <span class="btn-spinner" id="testKeySpinner" style="display:none"></span>
                <span>⚡ Test Connection</span>
              </button>
              <button type="button" class="btn-primary" id="btnSaveKey">
                <span>Save & Activate</span>
              </button>
              <button type="button" class="btn-outline-danger" id="btnClearKey" style="display:none">
                <span>Disconnect Key</span>
              </button>
            </div>

            <!-- Free Key Helper Card -->
            <div class="api-helper-card">
              <div class="helper-badge">100% Free • No Credit Card Required</div>
              <h4>Don't have a Pexels API key yet?</h4>
              <p>Pexels offers free API keys for developers with 200 requests/hour and access to millions of 4K photos.</p>
              <ol class="helper-steps">
                <li>Create a free account on <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer">pexels.com/api ↗</a></li>
                <li>Click <strong>"Your API Key"</strong></li>
                <li>Copy the key and paste it above!</li>
              </ol>
              <div class="showcase-note">
                💡 <em>Note: Even without an API key, AuraStudio features a built-in curated library of high-res mobile & desktop 4K wallpapers ready to explore!</em>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);
    }

    this.dialog = dialog;
    this._bindEvents();
  }

  _bindEvents() {
    // Light-dismiss fallback
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
        if (!isDialogContent) this.close();
      });
    }

    const closeBtn = this.dialog.querySelector('#apiKeyBtnClose');
    if (closeBtn) closeBtn.onclick = () => this.close();

    const input = this.dialog.querySelector('#inputPexelsKey');
    const toggleVisBtn = this.dialog.querySelector('#btnToggleKeyVisibility');
    const testBtn = this.dialog.querySelector('#btnTestKey');
    const saveBtn = this.dialog.querySelector('#btnSaveKey');
    const clearBtn = this.dialog.querySelector('#btnClearKey');

    // Toggle password visibility
    if (toggleVisBtn && input) {
      toggleVisBtn.onclick = () => {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        toggleVisBtn.textContent = isPass ? '🔒' : '👁️';
      };
    }

    // Test Key
    if (testBtn && input) {
      testBtn.onclick = async () => {
        const key = input.value.trim();
        if (!key) {
          toast.error('Please enter an API key to test.', 'Empty Key');
          return;
        }

        testBtn.disabled = true;
        const spinner = this.dialog.querySelector('#testKeySpinner');
        if (spinner) spinner.style.display = 'inline-block';

        const result = await pexelsService.testApiKey(key);

        testBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';

        if (result.success) {
          toast.success(result.message, 'Connection Verified');
          this._updateStatus(true);
        } else {
          toast.error(result.message, 'Connection Test Failed');
          this._updateStatus(false, result.message);
        }
      };
    }

    // Save Key
    if (saveBtn && input) {
      saveBtn.onclick = async () => {
        const key = input.value.trim();
        if (!key) {
          toast.error('Please enter an API key or use Showcase Mode.', 'Key Required');
          return;
        }

        saveBtn.disabled = true;
        const result = await pexelsService.testApiKey(key);
        saveBtn.disabled = false;

        if (result.success) {
          StorageService.setApiKey(key);
          toast.success('Pexels API Key activated! Live 4K feeds unlocked.', 'API Connected');
          this._updateStatus(true);
          this.close();
          if (this.onKeyUpdated) this.onKeyUpdated(true);
        } else {
          toast.error(result.message, 'Invalid Key');
        }
      };
    }

    // Disconnect Key
    if (clearBtn && input) {
      clearBtn.onclick = () => {
        StorageService.removeApiKey();
        input.value = '';
        toast.info('API key removed. Running in Curated Showcase Mode.', 'Disconnected');
        this._updateStatus(false);
        if (this.onKeyUpdated) this.onKeyUpdated(false);
      };
    }
  }

  _updateStatus(isConnected, customMsg = null) {
    const banner = this.dialog.querySelector('#apiKeyStatusBanner');
    const label = this.dialog.querySelector('#apiKeyStatusText');
    const clearBtn = this.dialog.querySelector('#btnClearKey');

    if (!banner || !label) return;

    if (isConnected) {
      banner.className = 'api-status-banner status-connected';
      label.textContent = '🟢 Connected to Live Pexels API (Infinite Search & 4K Feeds)';
      if (clearBtn) clearBtn.style.display = 'inline-block';
    } else {
      banner.className = 'api-status-banner status-curated';
      label.textContent = customMsg || '🟡 Curated Showcase Mode (Built-in high-res mobile & desktop collection)';
      if (clearBtn) clearBtn.style.display = 'none';
    }
  }

  open() {
    const currentKey = StorageService.getApiKey();
    const input = this.dialog.querySelector('#inputPexelsKey');
    if (input) input.value = currentKey;

    this._updateStatus(Boolean(currentKey));
    this.dialog.showModal();
  }

  close() {
    if (this.dialog && this.dialog.open) {
      this.dialog.close();
    }
  }
}
