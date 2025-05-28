// src/app.js
const express = require('express');
const environmentRoutes = require('./routes/environmentRoutes');
const path = require('path');
const packageJson = require('../package.json');

const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

// Serve frontend static files (no auth required)
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: packageJson.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth middleware for API routes only
function authMiddleware(req, res, next) {
    const token = req.headers['x-api-token'] || req.headers['authorization'];
    // More permissive for testing
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized - API token required' });
    }
    next();
}

// Protect API endpoints
app.use('/api/environments', authMiddleware, environmentRoutes);

// Basic error handler (can be improved)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;
