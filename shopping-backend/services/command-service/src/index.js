require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const { parseCommand } = require('./llm.service');
const { connectProducer, publishShoppingCommand } = require('./kafka/producer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// The command service understands what the user said. It does not own the
// shopping list itself -- it publishes an intent onto Kafka and lets the
// shopping service, which owns that data, apply it.
app.post('/api/commands', async (req, res) => {
  const { text, userId } = req.body;
  if (!text || !userId) {
    return res.status(400).json({ error: 'text and userId are required' });
  }

  try {
    const parsed = await parseCommand(text);

    const event = {
      event: `SHOPPING_ITEM_${parsed.intent}`,
      eventId: uuid(),
      userId,
      item: parsed.item,
      raw: text,
      timestamp: new Date().toISOString(),
    };

    await publishShoppingCommand(event);

    res.status(202).json({ accepted: true, parsed: event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'command-service' }));

app.listen(PORT, async () => {
  await connectProducer();
  console.log(`Command service listening on ${PORT}`);
});
