/**
 * Expressive Toast Notification System
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    this.container = el;
  }

  show({ message, title = '', type = 'info', duration = 3500, icon = '' }) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    let defaultIcon = '✨';
    if (type === 'success') defaultIcon = '✅';
    if (type === 'error') defaultIcon = '⚠️';
    if (type === 'heart') defaultIcon = '❤️';
    if (type === 'download') defaultIcon = '⚡';

    const chosenIcon = icon || defaultIcon;

    toast.innerHTML = `
      <div class="toast-icon-wrap">${chosenIcon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-leaving');
      toast.addEventListener('animationend', () => {
        toast.remove();
      }, { once: true });
    };

    closeBtn.addEventListener('click', dismiss);

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    return toast;
  }

  success(message, title = 'Success') {
    return this.show({ message, title, type: 'success' });
  }

  error(message, title = 'Attention') {
    return this.show({ message, title, type: 'error' });
  }

  info(message, title = '') {
    return this.show({ message, title, type: 'info' });
  }

  heart(message, title = 'Collection Updated') {
    return this.show({ message, title, type: 'heart', icon: '❤️' });
  }

  download(message, title = 'Download Started') {
    return this.show({ message, title, type: 'download', icon: '📥' });
  }
}

export const toast = new ToastManager();
