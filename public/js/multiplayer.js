// Multiplayer networking with Socket.io
class Multiplayer {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.socket = null;
    this.playerId = null;
    this.players = new Map();
    this.updateInterval = 50; // Send updates every 50ms
    this.lastUpdate = 0;
    
    // Player mesh geometry (simple colored cube for other players)
    this.playerGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    this.playerMaterials = [
      new THREE.MeshLambertMaterial({ color: 0xff6b6b }), // Red
      new THREE.MeshLambertMaterial({ color: 0x4ecdc4 }), // Cyan
      new THREE.MeshLambertMaterial({ color: 0xffe66d }), // Yellow
      new THREE.MeshLambertMaterial({ color: 0x95e1d3 })  // Mint
    ];
    this.nextColorIndex = 0;
  }
  
  connect(playerName, onConnected) {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket.emit('join', playerName);
    });
    
    this.socket.on('init', (data) => {
      this.playerId = data.playerId;
      console.log('Joined as player:', this.playerId);
      
      // Load existing players
      data.players.forEach(player => {
        if (player.id !== this.playerId) {
          this.addPlayer(player);
        }
      });
      
      // Load existing blocks
      data.blocks.forEach(([key, block]) => {
        const [x, y, z] = key.split(',').map(Number);
        this.world.placeBlock(x, y, z, block.type);
      });
      
      this.updatePlayerCount();
      
      if (onConnected) onConnected();
    });
    
    this.socket.on('playerJoined', (player) => {
      console.log('Player joined:', player.name);
      this.addPlayer(player);
      this.updatePlayerCount();
    });
    
    this.socket.on('playerLeft', (playerId) => {
      console.log('Player left:', playerId);
      this.removePlayer(playerId);
      this.updatePlayerCount();
    });
    
    this.socket.on('playerMoved', (data) => {
      const player = this.players.get(data.id);
      if (player) {
        // Smooth interpolation
        player.targetPosition = data.position;
        player.targetRotation = data.rotation;
      }
    });
    
    this.socket.on('blockPlaced', (data) => {
      // Don't place if it's our own block (already placed locally)
      if (!this.world.getBlock(data.x, data.y, data.z)) {
        this.world.placeBlock(data.x, data.y, data.z, data.blockType);
      }
    });
    
    this.socket.on('blockBroken', (data) => {
      this.world.breakBlock(data.x, data.y, data.z);
    });
  }
  
  addPlayer(playerData) {
    const material = this.playerMaterials[this.nextColorIndex % this.playerMaterials.length];
    this.nextColorIndex++;
    
    const mesh = new THREE.Mesh(this.playerGeometry, material);
    mesh.position.set(
      playerData.position.x,
      playerData.position.y + 0.9,
      playerData.position.z
    );
    
    // Add name label (using a simple sprite)
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(playerData.name, 128, 42);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 0.5, 1);
    sprite.position.y = 1.5;
    
    mesh.add(sprite);
    
    this.scene.add(mesh);
    
    this.players.set(playerData.id, {
      mesh: mesh,
      targetPosition: playerData.position,
      targetRotation: playerData.rotation,
      name: playerData.name
    });
  }
  
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.scene.remove(player.mesh);
      this.players.delete(playerId);
    }
  }
  
  updatePlayerCount() {
    const countElement = document.getElementById('player-count');
    if (countElement) {
      countElement.textContent = `👤 Players: ${this.players.size + 1}`;
    }
  }
  
  sendMovement(position, rotation) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('move', { position, rotation });
      this.lastUpdate = now;
    }
  }
  
  sendBlockPlaced(x, y, z, blockType) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('placeBlock', { x, y, z, blockType });
    }
  }
  
  sendBlockBroken(x, y, z) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('breakBlock', { x, y, z });
    }
  }
  
  update(deltaTime) {
    // Smooth interpolation for other players
    this.players.forEach(player => {
      if (player.targetPosition) {
        // Lerp position
        player.mesh.position.x += (player.targetPosition.x - player.mesh.position.x) * 0.3;
        player.mesh.position.y += (player.targetPosition.y + 0.9 - player.mesh.position.y) * 0.3;
        player.mesh.position.z += (player.targetPosition.z - player.mesh.position.z) * 0.3;
      }
      
      if (player.targetRotation) {
        // Rotate to face movement direction
        player.mesh.rotation.y = player.targetRotation.y;
      }
    });
  }
}
