const apiUrl = '/api/environments';
let apiToken = '';
let userId = '';
let baseDomain = '';

// Load saved credentials from localStorage
function loadSavedCredentials() {
  try {
    const savedCredentials = localStorage.getItem('cloud_dev_credentials');
    if (savedCredentials) {
      const { token, id, domain } = JSON.parse(savedCredentials);
      if (token && id) {
        return { token, id, domain };
      }
    }
  } catch (err) {
    console.error('Error loading saved credentials:', err);
  }
  return null;
}

// Show a message using the message component
function showMessage(message, type = 'info') {
  if (typeof messageSystem !== 'undefined') {
    switch (type) {
      case 'success':
        messageSystem.success(message);
        break;
      case 'error':
        messageSystem.error(message);
        break;
      case 'warning':
        messageSystem.warning(message);
        break;
      default:
        messageSystem.info(message);
    }
  } else {
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

// Toggle loading spinner
function toggleLoading(isLoading) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.toggle('hidden', !isLoading);
  }
}

// On page load, check authentication and setup the UI
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated
  const savedCredentials = loadSavedCredentials();
  
  if (!savedCredentials) {
    // No saved credentials, redirect to login page
    window.location.href = '/login.html';
    return;
  }
  
  // Set global variables
  apiToken = savedCredentials.token;
  userId = savedCredentials.id;
  baseDomain = savedCredentials.domain || '';

  // Display user information
  const userDisplayEl = document.getElementById('user-display');
  if (userDisplayEl) {
    userDisplayEl.textContent = `User: ${userId}`;
  }
  
  // Setup the main UI
  setupMainUI();
  
  // Load environments
  loadEnvironments();
});

// Setup main UI event handlers
function setupMainUI() {
  // Create environment form
  const createForm = document.getElementById('create-form');
  if (createForm) {
    createForm.addEventListener('submit', createEnvironment);
  }
  
  // Refresh button
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadEnvironments);
  }
  
  // Logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      // Clear saved credentials
      localStorage.removeItem('cloud_dev_credentials');
      
      // Clear sensitive data
      apiToken = '';
      userId = '';
      
      // Redirect to login page
      window.location.href = '/login.html';
    });
  }
}

// Create a new environment
async function createEnvironment(e) {
  e.preventDefault();
  
  const typeSelect = document.getElementById('env-type');
  const type = typeSelect.value;
  
  if (!type) {
    showMessage('Please select an environment type', 'error', 'main');
    return;
  }
  
  // Show loading state
  toggleLoading(true);
  
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
        'x-user-id': userId
      },
      body: JSON.stringify({ type })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to create environment');
    }
    
    const createdEnv = await res.json();
    
    showMessage(
      `Environment ${createdEnv.name || type} created successfully!`,
      'success',
      'main'
    );
    
    // Reset select to default
    typeSelect.selectedIndex = 0;
    
    // Refresh the environments list
    loadEnvironments();
  } catch (err) {
    console.error('Error creating environment:', err);
    showMessage('Error creating environment: ' + err.message, 'error', 'main');
  } finally {
    toggleLoading(false);
  }
}

// Load all environments
async function loadEnvironments() {
  toggleLoading(true);
  
  try {
    const res = await fetch(apiUrl, {
      headers: { 
        'x-api-token': apiToken, 
        'x-user-id': userId 
      }
    });
    
    const body = await res.json();
    
    if (!res.ok) {
      console.error('API error loading environments:', body);
      showMessage('Failed to load environments', 'error', 'main');
      return;
    }
    
    if (!Array.isArray(body)) {
      console.error('Unexpected response format:', body);
      showMessage('Invalid data format from server', 'error', 'main');
      return;
    }
    
    const envs = body;
    
    // Update no environments message visibility
    const noEnvsMessage = document.getElementById('no-environments-message');
    if (noEnvsMessage) {
      noEnvsMessage.classList.toggle('hidden', envs.length > 0);
    }
    
    // Render environments as cards and in table
    renderEnvironmentCards(envs);
    renderEnvironmentTable(envs);
  } catch (err) {
    console.error('Error loading environments:', err);
    showMessage('Error loading environments: ' + err.message, 'error', 'main');
  } finally {
    toggleLoading(false);
  }
}

// Render environment cards
function renderEnvironmentCards(environments) {
  const cardsContainer = document.getElementById('env-cards');
  cardsContainer.innerHTML = '';
  
  environments.forEach(env => {
    // Determine environment type and status
    const envType = env.image.includes('-') ? 
      env.image.split('-')[2].split(':')[0] : 
      env.image;
    
    const status = env.status || 'unknown';
    const statusClass = status === 'running' ? 'running' : 'stopped';
    
    // Create URL for IDE
    const ideUrl = baseDomain ? 
      `http://${env.name}.${baseDomain}` : 
      env.connectionDetails.ide_url;
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'env-card';
    card.innerHTML = `
      <div class="env-header">
        <h3>${formatEnvironmentType(envType)}</h3>
        <span class="badge ${statusClass}">${status}</span>
      </div>
      <div class="env-body">
        <p><strong>Name:</strong> ${env.name}</p>
        <p><strong>ID:</strong> ${env.id.substring(0, 8)}...</p>
        
        <div class="connection-details">
          <p>
            <i class="fas fa-terminal"></i>
            SSH: ${env.connectionDetails.ssh}
          </p>
          <p>
            <i class="fas fa-code"></i>
            <a href="${ideUrl}" target="_blank">Open Web IDE</a>
          </p>
        </div>
      </div>
      <div class="env-footer">
        <button class="outline" onclick="copySSHCommand('${env.connectionDetails.ssh}')">
          <i class="fas fa-copy"></i> Copy SSH
        </button>
        <button class="delete" onclick="deleteEnv('${env.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;
    
    cardsContainer.appendChild(card);
  });
}

// Render environment table
function renderEnvironmentTable(environments) {
  const tbody = document.querySelector('#env-table tbody');
  tbody.innerHTML = '';
  
  environments.forEach(env => {
    const tr = document.createElement('tr');
    
    // Determine environment type
    const envType = env.image.includes('-') ? 
      env.image.split('-')[2].split(':')[0] : 
      env.image;
    
    // Create URL for IDE
    const ideUrl = baseDomain ? 
      `http://${env.name}.${baseDomain}` : 
      env.connectionDetails.ide_url;
    
    // Format status
    const status = env.status || 'unknown';
    const statusHtml = `<span class="badge ${status === 'running' ? 'running' : 'stopped'}">${status}</span>`;
    
    tr.innerHTML = `
      <td>${env.id.substring(0, 8)}...</td>
      <td>${env.name}</td>
      <td>${formatEnvironmentType(envType)}</td>
      <td>${statusHtml}</td>
      <td>${env.ports.ssh}</td>
      <td><a href="${ideUrl}" target="_blank"><i class="fas fa-external-link-alt"></i> Open IDE</a></td>
      <td>
        <button class="outline" onclick="copySSHCommand('${env.connectionDetails.ssh}')">
          <i class="fas fa-copy"></i>
        </button>
        <button class="delete" onclick="deleteEnv('${env.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Format environment type for display
function formatEnvironmentType(type) {
  switch (type.toLowerCase()) {
    case 'python': return 'Python';
    case 'nodejs': return 'Node.js';
    case 'cpp': return 'C++';
    case 'c': return 'C';
    default: return type;
  }
}

// Copy SSH command to clipboard
function copySSHCommand(command) {
  navigator.clipboard.writeText(command)
    .then(() => {
      showMessage('SSH command copied to clipboard', 'success', 'main');
    })
    .catch(err => {
      console.error('Error copying to clipboard:', err);
      showMessage('Failed to copy SSH command', 'error', 'main');
    });
}

// Delete an environment
async function deleteEnv(id) {
  if (!confirm('Are you sure you want to delete this environment?')) return;
  
  toggleLoading(true);
  
  try {
    const res = await fetch(`${apiUrl}/${id}`, {
      method: 'DELETE',
      headers: { 
        'x-api-token': apiToken, 
        'x-user-id': userId 
      }
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to delete environment');
    }
    
    showMessage('Environment deleted successfully', 'success', 'main');
    loadEnvironments();
  } catch (err) {
    console.error('Error deleting environment:', err);
    showMessage('Error deleting environment: ' + err.message, 'error', 'main');
  } finally {
    toggleLoading(false);
  }
}
