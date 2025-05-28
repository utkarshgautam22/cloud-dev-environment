/**
 * Dark mode functionality for the Cloud Development Environment UI
 */

// Check if user prefers dark mode
const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Check if user has a saved preference
const savedTheme = localStorage.getItem('cloud_dev_theme');

// Apply theme on page load
if (savedTheme === 'dark' || (!savedTheme && prefersDarkMode)) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Toggle dark mode
function toggleDarkMode() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Store preference
  localStorage.setItem('cloud_dev_theme', newTheme);
  
  // Apply theme
  document.documentElement.setAttribute('data-theme', newTheme);
  
  // Update button icon if it exists
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  if (themeToggleIcon) {
    themeToggleIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
  
  // Show message about theme change
  if (typeof messageSystem !== 'undefined') {
    messageSystem.info(`Switched to ${newTheme} mode`);
  }
}

// Add theme toggle button when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create theme toggle button
  const themeButton = document.createElement('button');
  themeButton.id = 'theme-toggle';
  themeButton.className = 'theme-toggle';
  themeButton.setAttribute('aria-label', 'Toggle dark/light mode');
  themeButton.innerHTML = `<i id="theme-toggle-icon" class="${document.documentElement.getAttribute('data-theme') === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}"></i>`;
  
  // Add click event
  themeButton.addEventListener('click', toggleDarkMode);
  
  // Find appropriate container to add the button
  const userInfo = document.querySelector('.user-info');
  if (userInfo) {
    userInfo.prepend(themeButton);
  } else {
    // Fallback to adding to body
    document.body.appendChild(themeButton);
  }
});
