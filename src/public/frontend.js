const apiUrl = '/api/environments';
let apiToken = '';
let userId = '';
let baseDomain = '';

// On page load, show login form
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();
  apiToken = document.getElementById('api-token').value;
  userId = document.getElementById('user-id').value;
  baseDomain = document.getElementById('base-domain').value;
  // Validate credentials by attempting to load environments
  try {
    const res = await fetch(apiUrl, { headers: { 'x-api-token': apiToken, 'x-user-id': userId } });
    if (!res.ok) {
      alert('Login failed: Invalid API token or user ID');
      return;
    }
  } catch (err) {
    console.error('Login error:', err);
    alert('Login error, check console for details');
    return;
  }
  // Credentials valid: show main UI
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('main-section').style.display = 'block';
  // Initialize create form and load environments
  document.getElementById('create-form').addEventListener('submit', createEnvironment);
  loadEnvironments();
}

async function createEnvironment(e) {
  e.preventDefault();
  const type = document.getElementById('env-type').value;
  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
        'x-user-id': userId
      },
      body: JSON.stringify({ type })
    });
    loadEnvironments();
  } catch (err) {
    console.error('Error creating environment:', err);
  }
}

async function loadEnvironments() {
  try {
    const res = await fetch(apiUrl, {
      headers: { 'x-api-token': apiToken, 'x-user-id': userId }
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('API error loading environments:', body);
      return;
    }
    if (!Array.isArray(body)) {
      console.error('Unexpected response format:', body);
      return;
    }
    const envs = body;

    const tbody = document.querySelector('#env-table tbody');
    tbody.innerHTML = '';
    envs.forEach(env => {
      const tr = document.createElement('tr');
      // Use subdomain routing for IDE if baseDomain provided
      const ideUrl = baseDomain ? `http://${env.name}.${baseDomain}` : env.connectionDetails.ide_url;
      tr.innerHTML = `
        <td>${env.id}</td>
        <td>${env.name}</td>
        <td>${env.image.split('-')[2].split(':')[0]}</td>
        <td>${env.ports.ssh}</td>
        <td><a href="${ideUrl}" target="_blank">IDE Link</a></td>
        <td><button class="delete" onclick="deleteEnv('${env.id}')">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading environments:', err);
  }
}

async function deleteEnv(id) {
  if (!confirm('Are you sure you want to delete this environment?')) return;
  try {
    await fetch(`${apiUrl}/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-token': apiToken, 'x-user-id': userId }
    });
    loadEnvironments();
  } catch (err) {
    console.error('Error deleting environment:', err);
  }
}
