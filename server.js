require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS, 10) || 20;
const PLAYER_NAME_MAX_LEN = 24;

// ─── Logger ──────────────────────────────────────────────────────────────────
const log = {
  info: (...args) => console.log(`[${new Date().toISOString()}] INFO `, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] WARN `, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] ERROR`, ...args),
};

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Security headers (CSP relaxed for Three.js inline needs)
app.use(
  helmet({
    contentSecurityPolicy: false, // Three.js / inline scripts need relaxed CSP
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
const corsOptions = {
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  methods: ['GET'],
};
app.use(cors(corsOptions));

// Static files with cache headers
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    players: players.size,
    env: NODE_ENV,
  });
});

// ─── Input validation helpers ────────────────────────────────────────────────
function sanitizeString(str, maxLen = 50) {
  if (typeof str !== 'string') return null;
  return str.replace(/[<>&"'\/]/g, '').trim().slice(0, maxLen);
}

function isValidPosition(pos) {
  if (!pos || typeof pos !== 'object') return false;
  const { x, y, z } = pos;
  return (
    typeof x === 'number' && typeof y === 'number' && typeof z === 'number' &&
    Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) &&
    Math.abs(x) < 10000 && Math.abs(y) < 10000 && Math.abs(z) < 10000
  );
}

function isValidRotation(rot) {
  if (!rot || typeof rot !== 'object') return false;
  const { x, y } = rot;
  return (
    typeof x === 'number' && typeof y === 'number' &&
    Number.isFinite(x) && Number.isFinite(y)
  );
}

function isValidBlockCoord(val) {
  return typeof val === 'number' && Number.isInteger(val) && Math.abs(val) < 10000;
}

// ─── Rate limiting ───────────────────────────────────────────────────────────
const connectionLimiter = new RateLimiterMemory({
  points: 5,    // 5 connections
  duration: 60, // per 60 seconds per IP
});

const eventLimiter = new RateLimiterMemory({
  points: 100,  // 100 events
  duration: 1,  // per second per socket
});

// ─── Game state ──────────────────────────────────────────────────────────────
const players = new Map();
const worldBlocks = new Map();

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 20000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e5, // 100KB max message
});

// Connection rate-limit middleware
io.use(async (socket, next) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  try {
    await connectionLimiter.consume(ip);
    next();
  } catch {
    log.warn(`Connection rate-limited: ${ip}`);
    next(new Error('Too many connections, try again later'));
  }
});

io.on('connection', (socket) => {
  log.info(`Socket connected: ${socket.id}`);

  // Helper: consume event rate limit
  async function rateLimit() {
    try {
      await eventLimiter.consume(socket.id);
      return true;
    } catch {
      return false;
    }
  }

  // ── Join ────────────────────────────────────────────────────────────────
  socket.on('join', async (playerName) => {
    if (!(await rateLimit())) return;

    if (players.has(socket.id)) return; // already joined

    if (players.size >= MAX_PLAYERS) {
      socket.emit('error', { message: 'Server is full' });
      socket.disconnect(true);
      return;
    }

    const name = sanitizeString(playerName, PLAYER_NAME_MAX_LEN) || `Player${players.size + 1}`;

    const player = {
      id: socket.id,
      name,
      position: { x: 0, y: 20, z: 0 },
      rotation: { x: 0, y: 0 },
    };

    players.set(socket.id, player);

    socket.emit('init', {
      playerId: socket.id,
      players: Array.from(players.values()),
      blocks: Array.from(worldBlocks.entries()),
    });

    socket.broadcast.emit('playerJoined', player);
    log.info(`${player.name} joined. Total players: ${players.size}`);
  });

  // ── Move ────────────────────────────────────────────────────────────────
  socket.on('move', async (data) => {
    if (!(await rateLimit())) return;

    const player = players.get(socket.id);
    if (!player) return;
    if (!data || !isValidPosition(data.position) || !isValidRotation(data.rotation)) return;

    player.position = data.position;
    player.rotation = data.rotation;

    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      position: data.position,
      rotation: data.rotation,
    });
  });

  // ── Place block ─────────────────────────────────────────────────────────
  socket.on('placeBlock', async (data) => {
    if (!(await rateLimit())) return;
    if (!players.has(socket.id)) return;

    if (!data || !isValidBlockCoord(data.x) || !isValidBlockCoord(data.y) || !isValidBlockCoord(data.z)) return;
    if (typeof data.blockType !== 'number' && typeof data.blockType !== 'string') return;

    const key = `${data.x},${data.y},${data.z}`;
    worldBlocks.set(key, { x: data.x, y: data.y, z: data.z, type: data.blockType });

    io.emit('blockPlaced', { x: data.x, y: data.y, z: data.z, blockType: data.blockType });
  });

  // ── Break block ─────────────────────────────────────────────────────────
  socket.on('breakBlock', async (data) => {
    if (!(await rateLimit())) return;
    if (!players.has(socket.id)) return;

    if (!data || !isValidBlockCoord(data.x) || !isValidBlockCoord(data.y) || !isValidBlockCoord(data.z)) return;

    const key = `${data.x},${data.y},${data.z}`;
    worldBlocks.delete(key);

    io.emit('blockBroken', { x: data.x, y: data.y, z: data.z });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      log.info(`${player.name} disconnected. Remaining: ${players.size - 1}`);
      players.delete(socket.id);
      io.emit('playerLeft', socket.id);
    }
  });

  // ── Error ───────────────────────────────────────────────────────────────
  socket.on('error', (err) => {
    log.error(`Socket error (${socket.id}):`, err.message);
  });
});

// ─── Global error handlers ───────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
function shutdown(signal) {
  log.info(`${signal} received, shutting down gracefully…`);
  io.emit('error', { message: 'Server shutting down' });
  io.close();
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  log.info(`🎮 KlawCraft server running on http://localhost:${PORT} [${NODE_ENV}]`);
  log.info(`👥 Max players: ${MAX_PLAYERS}`);
});
