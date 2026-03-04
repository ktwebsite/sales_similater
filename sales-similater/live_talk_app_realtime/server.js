/**
 * Express server for proxying Gemini API requests
 * This server handles API key management securely on the server side
 */

// Load environment variables from .env file in development
require('dotenv-flow').config();

const express = require('express');
const path = require('path');
const app = express();

// Port configuration - Cloud Run uses PORT environment variable
const PORT = process.env.PORT || 8080;

// Get API key from environment variable or Secret Manager
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

// Middleware
app.use(express.json());

// CORS configuration for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});


app.get('/api/gemini/config', (req, res) => {
  try {
    res.json({ apiKey: GEMINI_API_KEY });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Failed to fetch API configuration' });
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all handler: serve index.html for any route not matched above
// This enables client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});