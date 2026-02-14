// Autonomous AI Bot system for KlawCraft
// Bots simulate players: wander, break/place blocks, build structures

const BOT_NAMES = [
  'BuilderBot', 'MinerMike', 'CraftyAI', 'BlockBuddy', 'DigiDwarf',
  'PixelPete', 'VoxelVic', 'ChunkChris', 'TerraTina', 'StoneSam',
  'WoodWanda', 'SandySue', 'GrassyGus', 'RockyRita', 'DirtDave',
];

const BLOCK_TYPES = ['grass', 'dirt', 'stone', 'wood', 'sand'];

class AIBot {
  constructor(id, name, io, players, worldBlocks, getTerrainHeight) {
    this.id = `bot-${id}`;
    this.name = name;
    this.io = io;
    this.players = players;
    this.worldBlocks = worldBlocks;
    this.getTerrainHeight = getTerrainHeight;

    // Position & movement
    this.position = { x: Math.random() * 30 - 15, y: 20, z: Math.random() * 30 - 15 };
    this.rotation = { x: 0, y: Math.random() * Math.PI * 2 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isGrounded = false;
    this.speed = 3;

    // AI state
    this.state = 'wander'; // wander, build, break, idle
    this.stateTimer = 0;
    this.targetPos = null;
    this.buildPlan = null;
    this.buildIndex = 0;
    this.actionCooldown = 0;

    // Register as player
    this.player = {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      rotation: { ...this.rotation },
      isBot: true,
    };
    this.players.set(this.id, this.player);
    this.io.emit('playerJoined', this.player);
  }

  // Simple terrain height lookup from world blocks
  getGroundHeight(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    // Scan downward from high up
    for (let y = 30; y >= 0; y--) {
      const key = `${ix},${y},${iz}`;
      const block = this.worldBlocks.get(key);
      if (block && block.type !== 'water') {
        return y + 1;
      }
    }
    // Fallback to terrain generator
    if (this.getTerrainHeight) {
      return this.getTerrainHeight(ix, iz) + 1;
    }
    return 6;
  }

  isWater(x, y, z) {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    const block = this.worldBlocks.get(key);
    return block && block.type === 'water';
  }

  isSolid(x, y, z) {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    const block = this.worldBlocks.get(key);
    return block && block.type !== 'water';
  }

  chooseNewTarget() {
    // Pick a random nearby position, avoiding water
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 15;
      const tx = this.position.x + Math.cos(angle) * dist;
      const tz = this.position.z + Math.sin(angle) * dist;
      const ty = this.getGroundHeight(tx, tz);

      // Avoid water and extreme drops
      if (!this.isWater(tx, ty, tz) && !this.isWater(tx, ty - 1, tz) && ty > 3) {
        this.targetPos = { x: tx, y: ty, z: tz };
        this.rotation.y = Math.atan2(tx - this.position.x, tz - this.position.z);
        return;
      }
    }
    // Fallback: stay put
    this.targetPos = null;
  }

  chooseState() {
    const r = Math.random();
    if (r < 0.5) {
      this.state = 'wander';
      this.stateTimer = 5 + Math.random() * 10;
      this.chooseNewTarget();
    } else if (r < 0.75) {
      this.state = 'build';
      this.stateTimer = 8 + Math.random() * 10;
      this.startBuilding();
    } else if (r < 0.9) {
      this.state = 'break';
      this.stateTimer = 3 + Math.random() * 5;
    } else {
      this.state = 'idle';
      this.stateTimer = 2 + Math.random() * 4;
    }
  }

  startBuilding() {
    // Pick a structure to build near current position
    const bx = Math.floor(this.position.x) + Math.floor(Math.random() * 6) - 3;
    const bz = Math.floor(this.position.z) + Math.floor(Math.random() * 6) - 3;
    const by = this.getGroundHeight(bx, bz);

    const structures = [this.pillarPlan, this.wallPlan, this.hutPlan];
    const plan = structures[Math.floor(Math.random() * structures.length)];
    this.buildPlan = plan(bx, by, bz);
    this.buildIndex = 0;
  }

  // Simple pillar
  pillarPlan(bx, by, bz) {
    const blocks = [];
    const type = BLOCK_TYPES[Math.floor(Math.random() * 3)]; // stone/dirt/wood
    const h = 3 + Math.floor(Math.random() * 3);
    for (let y = 0; y < h; y++) {
      blocks.push({ x: bx, y: by + y, z: bz, type });
    }
    return blocks;
  }

  // Simple wall
  wallPlan(bx, by, bz) {
    const blocks = [];
    const type = BLOCK_TYPES[Math.floor(Math.random() * 4)];
    const len = 3 + Math.floor(Math.random() * 4);
    const h = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < len; i++) {
      for (let y = 0; y < h; y++) {
        blocks.push({ x: bx + i, y: by + y, z: bz, type });
      }
    }
    return blocks;
  }

  // Simple hut (4 walls, no roof)
  hutPlan(bx, by, bz) {
    const blocks = [];
    const type = 'wood';
    const size = 3;
    const h = 3;
    for (let y = 0; y < h; y++) {
      for (let i = 0; i <= size; i++) {
        // Skip door
        if (y < 2 && i === Math.floor(size / 2)) continue;
        blocks.push({ x: bx + i, y: by + y, z: bz, type });
        blocks.push({ x: bx + i, y: by + y, z: bz + size, type });
        blocks.push({ x: bx, y: by + y, z: bz + i, type });
        blocks.push({ x: bx + size, y: by + y, z: bz + i, type });
      }
    }
    return blocks;
  }

  placeBlock(x, y, z, type) {
    const key = `${x},${y},${z}`;
    if (this.worldBlocks.has(key)) return;
    this.worldBlocks.set(key, { x, y, z, type });
    this.io.emit('blockPlaced', { x, y, z, blockType: type });
  }

  breakBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    if (!this.worldBlocks.has(key)) return;
    const block = this.worldBlocks.get(key);
    // Don't break water or bedrock-level
    if (block.type === 'water' || y <= 1) return;
    this.worldBlocks.delete(key);
    this.io.emit('blockBroken', { x, y, z });
  }

  update(dt) {
    this.stateTimer -= dt;
    this.actionCooldown -= dt;

    if (this.stateTimer <= 0) {
      this.chooseState();
    }

    switch (this.state) {
      case 'wander':
        this.updateWander(dt);
        break;
      case 'build':
        this.updateBuild(dt);
        break;
      case 'break':
        this.updateBreak(dt);
        break;
      case 'idle':
        // Just stand still, maybe look around
        this.rotation.y += dt * 0.5;
        break;
    }

    // Gravity / ground snap
    const groundY = this.getGroundHeight(this.position.x, this.position.z);
    if (this.position.y > groundY + 0.1) {
      this.position.y -= 10 * dt; // fall
      if (this.position.y < groundY) this.position.y = groundY;
    } else {
      this.position.y = groundY;
    }

    // Keep within world bounds
    this.position.x = Math.max(-60, Math.min(60, this.position.x));
    this.position.z = Math.max(-60, Math.min(60, this.position.z));

    // Update player record and broadcast
    this.player.position = { ...this.position };
    this.player.rotation = { ...this.rotation };

    this.io.emit('playerMoved', {
      id: this.id,
      position: this.player.position,
      rotation: this.player.rotation,
    });
  }

  updateWander(dt) {
    if (!this.targetPos) {
      this.chooseNewTarget();
      return;
    }

    const dx = this.targetPos.x - this.position.x;
    const dz = this.targetPos.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1) {
      this.chooseNewTarget();
      return;
    }

    // Move toward target
    const moveSpeed = this.speed * dt;
    this.position.x += (dx / dist) * moveSpeed;
    this.position.z += (dz / dist) * moveSpeed;
    this.rotation.y = Math.atan2(dx, dz);

    // Check if walking into water - turn around
    const nextGround = this.getGroundHeight(this.position.x + (dx / dist) * 2, this.position.z + (dz / dist) * 2);
    if (this.isWater(this.position.x + (dx / dist) * 2, nextGround, this.position.z + (dz / dist) * 2)) {
      this.chooseNewTarget();
    }
  }

  updateBuild(dt) {
    if (!this.buildPlan || this.buildIndex >= this.buildPlan.length) {
      this.state = 'wander';
      this.stateTimer = 5;
      this.chooseNewTarget();
      return;
    }

    if (this.actionCooldown > 0) return;

    const block = this.buildPlan[this.buildIndex];
    this.placeBlock(block.x, block.y, block.z, block.type);
    this.buildIndex++;
    this.actionCooldown = 0.3 + Math.random() * 0.3;

    // Face toward build
    const dx = block.x - this.position.x;
    const dz = block.z - this.position.z;
    this.rotation.y = Math.atan2(dx, dz);
  }

  updateBreak(dt) {
    if (this.actionCooldown > 0) return;

    // Find a nearby block to break
    const px = Math.floor(this.position.x);
    const pz = Math.floor(this.position.z);
    const py = Math.floor(this.position.y);

    for (let attempt = 0; attempt < 5; attempt++) {
      const bx = px + Math.floor(Math.random() * 5) - 2;
      const bz = pz + Math.floor(Math.random() * 5) - 2;
      const by = py + Math.floor(Math.random() * 3) - 1;

      const key = `${bx},${by},${bz}`;
      const block = this.worldBlocks.get(key);
      if (block && block.type !== 'water' && by > 1) {
        this.breakBlock(bx, by, bz);
        this.actionCooldown = 0.5 + Math.random() * 0.5;
        this.rotation.y = Math.atan2(bx - this.position.x, bz - this.position.z);
        return;
      }
    }

    this.actionCooldown = 1;
  }

  destroy() {
    this.players.delete(this.id);
    this.io.emit('playerLeft', this.id);
  }
}

class AIBotManager {
  constructor(io, players, worldBlocks, getTerrainHeight) {
    this.io = io;
    this.players = players;
    this.worldBlocks = worldBlocks;
    this.getTerrainHeight = getTerrainHeight;
    this.bots = [];
    this.tickInterval = null;
  }

  start(count) {
    console.log(`[AI] Spawning ${count} AI bots`);
    for (let i = 0; i < count; i++) {
      const name = BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? `_${Math.floor(i / BOT_NAMES.length)}` : '');
      const bot = new AIBot(i, `🤖${name}`, this.io, this.players, this.worldBlocks, this.getTerrainHeight);
      this.bots.push(bot);
    }

    // Tick bots at ~10 Hz
    this.tickInterval = setInterval(() => {
      const dt = 0.1;
      for (const bot of this.bots) {
        try {
          bot.update(dt);
        } catch (err) {
          console.error(`[AI] Bot ${bot.name} error:`, err.message);
        }
      }
    }, 100);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const bot of this.bots) {
      bot.destroy();
    }
    this.bots = [];
    console.log('[AI] All bots stopped');
  }
}

module.exports = { AIBotManager };
