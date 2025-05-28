/**
 * Main message component for the Cloud Development Environment UI
 */
class MessageComponent {
  constructor(containerId = 'message-container') {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = this.containerId;
      this.container.className = 'message-container';
      document.body.appendChild(this.container);
    }
    
    this.messageQueue = [];
    this.isProcessing = false;
  }
  
  /**
   * Show a message to the user
   * @param {string} text - Message text
   * @param {string} type - Message type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - How long to show the message in ms (0 for no auto-hide)
   */
  show(text, type = 'info', duration = 5000) {
    // Add message to queue
    this.messageQueue.push({ text, type, duration });
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Process messages in the queue
   */
  async processQueue() {
    if (this.messageQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const { text, type, duration } = this.messageQueue.shift();
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    
    // Add appropriate icon
    let icon = '';
    switch (type) {
      case 'success':
        icon = '<i class="fas fa-check-circle"></i>';
        break;
      case 'error':
        icon = '<i class="fas fa-exclamation-circle"></i>';
        break;
      case 'warning':
        icon = '<i class="fas fa-exclamation-triangle"></i>';
        break;
      default:
        icon = '<i class="fas fa-info-circle"></i>';
    }
    
    // Add content
    messageEl.innerHTML = `
      <div class="message-icon">${icon}</div>
      <div class="message-content">${text}</div>
      <button class="message-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add close button functionality
    const closeBtn = messageEl.querySelector('.message-close');
    closeBtn.addEventListener('click', () => this.hideMessage(messageEl));
    
    // Add to container
    this.container.appendChild(messageEl);
    
    // Animate in
    setTimeout(() => {
      messageEl.classList.add('visible');
    }, 10);
    
    // Auto-hide after duration (if specified)
    if (duration > 0) {
      setTimeout(() => {
        this.hideMessage(messageEl);
      }, duration);
    }
    
    // Wait for animation to finish before processing next message
    await new Promise(resolve => setTimeout(resolve, 300));
    this.processQueue();
  }
  
  /**
   * Hide message with animation
   * @param {HTMLElement} messageEl - Message element to hide
   */
  hideMessage(messageEl) {
    // Only hide if not already hiding
    if (messageEl.classList.contains('hiding')) return;
    
    messageEl.classList.add('hiding');
    messageEl.classList.remove('visible');
    
    // Remove after animation
    setTimeout(() => {
      if (messageEl.parentNode === this.container) {
        this.container.removeChild(messageEl);
      }
    }, 300);
  }
  
  /**
   * Success message shorthand
   */
  success(text, duration = 5000) {
    this.show(text, 'success', duration);
  }
  
  /**
   * Error message shorthand
   */
  error(text, duration = 8000) {
    this.show(text, 'error', duration);
  }
  
  /**
   * Warning message shorthand
   */
  warning(text, duration = 6000) {
    this.show(text, 'warning', duration);
  }
  
  /**
   * Info message shorthand
   */
  info(text, duration = 5000) {
    this.show(text, 'info', duration);
  }
}

// Global message instance
const messageSystem = new MessageComponent();
