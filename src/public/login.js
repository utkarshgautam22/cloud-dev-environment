const apiUrl = '/api/environments';

// Load saved credentials from localStorage if available
function loadSavedCredentials() {
  try {
    const savedCredentials = localStorage.getItem('cloud_dev_credentials');
    if (savedCredentials) {
      const { token, id, domain } = JSON.parse(savedCredentials);
      if (token && id) {
        document.getElementById('api-token').value = token;
        document.getElementById('user-id').value = id;
        if (domain) document.getElementById('base-domain').value = domain;
        return { token, id, domain };
      }
    }
  } catch (err) {
    console.error('Error loading saved credentials:', err);
  }
  return null;
}

// Save credentials to localStorage
function saveCredentials(token, id, domain) {
  try {
    localStorage.setItem(
      'cloud_dev_credentials',
      JSON.stringify({ token, id, domain })
    );
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

// Show a message in the login form
function showMessage(message, type = 'error') {
  const messageEl = document.getElementById('login-message');
  if (!messageEl) return;
  
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
  
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 5000);
  }
}

// Toggle loading state
function toggleLoading(isLoading) {
  const loginButton = document.querySelector('#login-form button[type="submit"]');
  if (loginButton) {
    loginButton.disabled = isLoading;
    loginButton.innerHTML = isLoading ? 
      '<i class="fas fa-spinner fa-spin"></i> Logging in...' : 
      '<i class="fas fa-sign-in-alt"></i> Login';
  }
}

// On page load, setup event listeners and check saved credentials
document.addEventListener('DOMContentLoaded', () => {
  // Setup login form
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', handleLogin);
  
  // Check for auto-login
  const savedCredentials = loadSavedCredentials();
  if (savedCredentials) {
    // Show auto-login message
    showMessage('Attempting auto-login with saved credentials...', 'info');
    
    // Auto login after a short delay
    setTimeout(() => {
      validateAndLogin(savedCredentials.token, savedCredentials.id, savedCredentials.domain);
    }, 500);
  }
});

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  
  const token = document.getElementById('api-token').value;
  const id = document.getElementById('user-id').value;
  const domain = document.getElementById('base-domain').value;
  
  if (!token || !id) {
    showMessage('Please provide both API Token and User ID');
    return;
  }
  
  validateAndLogin(token, id, domain);
}

// Validate credentials and redirect to main page
async function validateAndLogin(token, id, domain) {
  // Show loading state
  toggleLoading(true);
  
  try {
    const res = await fetch(apiUrl, { 
      headers: { 
        'x-api-token': token, 
        'x-user-id': id 
      } 
    });
    
    if (!res.ok) {
      showMessage('Login failed: Invalid API token or User ID');
      toggleLoading(false);
      return;
    }
    
    // Save valid credentials
    saveCredentials(token, id, domain);
    
    // Show success message
    showMessage('Login successful. Redirecting...', 'success');
    
    // Redirect to main page
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1000);
    
  } catch (err) {
    console.error('Login error:', err);
    showMessage('Login error: ' + err.message);
    toggleLoading(false);
  }
}
