import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Redis Pub/Sub setup
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPublisher = createClient({ url: redisUrl });
const redisSubscriber = createClient({ url: redisUrl });

redisPublisher.on('error', (err) => console.error('Redis Publisher Error:', err));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

(async () => {
  try {
    await redisPublisher.connect();
    await redisSubscriber.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

// Store user subscriptions (in-memory for demo)
const userSubscriptions = new Map<any, string[]>(); // ws -> following list

// WebSocket connections
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to WebSocket server' }));

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'create_post') {
        // Broadcast to all followers via Redis
        await redisPublisher.publish('new_post', JSON.stringify(msg.post));
      }
      if (msg.type === 'subscribe') {
        // Save following list for this connection
        userSubscriptions.set(ws, msg.following || []);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    userSubscriptions.delete(ws);
  });
});

// Redis subscriber: broadcast new posts to relevant clients
redisSubscriber.subscribe('new_post', (message) => {
  const post = JSON.parse(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      const following = userSubscriptions.get(client);
      // Only send to public users following the celebrity, or all if not public
      if (!following || following.length === 0 || following.includes(post.author)) {
        client.send(JSON.stringify({ type: 'new_post', post }));
      }
    }
  });
});

// Example API route
app.get('/', (req, res) => {
  res.send('Social App Backend Running');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
