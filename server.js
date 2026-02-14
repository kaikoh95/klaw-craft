const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static('public'));

// Game state
const players = new Map();
const worldBlocks = new Map(); // Shared world state

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Player join
  socket.on('join', (playerName) => {
    const player = {
      id: socket.id,
      name: playerName || `Player${players.size + 1}`,
      position: { x: 0, y: 20, z: 0 },
      rotation: { x: 0, y: 0 }
    };
    
    players.set(socket.id, player);
    
    // Send current players and world state to new player
    socket.emit('init', {
      playerId: socket.id,
      players: Array.from(players.values()),
      blocks: Array.from(worldBlocks.entries())
    });
    
    // Notify others
    socket.broadcast.emit('playerJoined', player);
    
    console.log(`${player.name} joined. Total players: ${players.size}`);
  });
  
  // Player movement
  socket.on('move', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      
      // Broadcast to other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: data.position,
        rotation: data.rotation
      });
    }
  });
  
  // Block placed
  socket.on('placeBlock', (data) => {
    const key = `${data.x},${data.y},${data.z}`;
    worldBlocks.set(key, { ...data, type: data.blockType });
    
    // Broadcast to all players
    io.emit('blockPlaced', data);
  });
  
  // Block broken
  socket.on('breakBlock', (data) => {
    const key = `${data.x},${data.y},${data.z}`;
    worldBlocks.delete(key);
    
    // Broadcast to all players
    io.emit('blockBroken', data);
  });
  
  // Player disconnect
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`${player.name} disconnected. Remaining: ${players.size - 1}`);
      players.delete(socket.id);
      io.emit('playerLeft', socket.id);
    }
  });
});

http.listen(PORT, () => {
  console.log(`🎮 KlawCraft server running on http://localhost:${PORT}`);
  console.log(`👥 Ready for up to 4 players!`);
});
