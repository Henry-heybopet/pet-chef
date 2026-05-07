// Vercel Serverless entrypoint
// Routes all /api/* traffic to the Express application
const app = require('../backend/src/index.js');
module.exports = app;
