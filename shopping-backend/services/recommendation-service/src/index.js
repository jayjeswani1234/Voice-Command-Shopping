require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { startConsumer } = require('./kafka/consumer');
const { getRecommendations } = require('./services/recommendationService');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.get('/api/recommendations', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const result = await getRecommendations(userId);
  res.json(result);
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'recommendation-service' }));

async function start() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/recommendations');
  console.log('Recommendation service connected to MongoDB');

  await startConsumer();

  app.listen(PORT, () => console.log(`Recommendation service listening on ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start recommendation service:', err);
  process.exit(1);
});
