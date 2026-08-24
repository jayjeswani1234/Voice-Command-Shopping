require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Single entry point: the frontend only ever talks to the gateway.
// Each downstream service owns its own path prefix and database.
const routes = {
  '/api/commands': process.env.COMMAND_SERVICE_URL || 'http://localhost:3001',
  '/api/shopping': process.env.SHOPPING_SERVICE_URL || 'http://localhost:3002',
  '/api/products': process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  '/api/recommendations': process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3004',
};

for (const [path, target] of Object.entries(routes)) {
  app.use(path, createProxyMiddleware({ target, changeOrigin: true }));
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

app.listen(PORT, () => console.log(`API gateway listening on ${PORT}`));
