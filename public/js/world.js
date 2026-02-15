// World generation and chunk management
class World {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.chunkSize = 16;
    this.renderDistance = 1; // Reduced from 2 for performance
    this.blockSize = 1;
    
    // Block types with colors
    this.blockTypes = {
      grass: 0x7cbd6b,
      dirt: 0x8b5a3c,
      stone: 0x808080,
      wood: 0x8b6914,
      sand: 0xf4e7c7,
      water: 0x4a90e2
    };
    
    // Geometry cache for performance
    this.geometryCache = new Map();
    this.materialCache = new Map();
    
    // Initialize caches
    this.initCaches();
    
    // Add a temporary ground plane so player has something to stand on
    this.addGroundPlane();
  }
  
  initCaches() {
    // Create reusable geometry
    const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
    
    // Create materials for each block type
    for (const [type, color] of Object.entries(this.blockTypes)) {
      const material = new THREE.MeshLambertMaterial({ 
        color: color,
        transparent: type === 'water',
        opacity: type === 'water' ? 0.7 : 1
      });
      this.materialCache.set(type, material);
    }
    
    this.geometryCache.set('block', geometry);
  }
  
  addGroundPlane() {
    // Temporary large ground plane so player always has something to stand on
    const planeGeometry = new THREE.PlaneGeometry(200, 200);
    const planeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x7cbd6b,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    plane.position.y = 0; // At Y=0
    this.scene.add(plane);
  }
  
  // Simple noise function for terrain
  noise(x, z) {
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    
    const n = X + Z * 57;
    const nn = (n << 13) ^ n;
    return (1.0 - ((nn * (nn * nn * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
  }
  
  // Improved terrain height with hills and valleys
  getTerrainHeight(x, z) {
    // Multiple octaves of noise for natural terrain
    let height = 0;
    height += this.noise(x * 0.01, z * 0.01) * 8; // Large hills
    height += this.noise(x * 0.05, z * 0.05) * 4; // Medium details
    height += this.noise(x * 0.1, z * 0.1) * 2;   // Small bumps
    
    return Math.floor(height) + 5; // Base height of 5
  }
  
  // Check if there should be a tree at this position
  shouldPlaceTree(x, z) {
    const hash = (x * 374761393 + z * 668265263) & 0xffffffff;
    return (hash % 100) < 3; // 3% chance of tree
  }
  
  // Place a simple tree
  placeTree(x, baseY, z) {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    
    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      this.placeBlock(x, baseY + y, z, 'wood');
    }
    
    // Leaves (simple sphere)
    const leavesY = baseY + trunkHeight;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 4) {
            const leafX = x + dx;
            const leafY = leavesY + dy;
            const leafZ = z + dz;
            if (!this.getBlock(leafX, leafY, leafZ)) {
              this.placeBlock(leafX, leafY, leafZ, 'grass');
            }
          }
        }
      }
    }
  }
  
  // Generate initial terrain
  generateTerrain(centerX, centerZ) {
    const halfSize = this.chunkSize * this.renderDistance;
    
    for (let x = centerX - halfSize; x < centerX + halfSize; x++) {
      for (let z = centerZ - halfSize; z < centerZ + halfSize; z++) {
        const height = this.getTerrainHeight(x, z);
        
        // Generate vertical column
        for (let y = 0; y <= height; y++) {
          let blockType;
          
          if (y === height) {
            // Top layer
            blockType = height < 6 ? 'sand' : 'grass';
          } else if (y > height - 3) {
            // Below top
            blockType = height < 6 ? 'sand' : 'dirt';
          } else {
            // Deep underground
            blockType = 'stone';
          }
          
          this.placeBlock(x, y, z, blockType);
        }
        
        // Add water at low points
        if (height < 5) {
          for (let y = height + 1; y <= 5; y++) {
            this.placeBlock(x, y, z, 'water');
          }
        }
        
        // Place trees on grass
        if (height >= 6 && this.shouldPlaceTree(x, z)) {
          this.placeTree(x, height + 1, z);
        }
      }
    }
    
    console.log(`Generated terrain: ${this.blocks.size} blocks`);
  }
  
  // Place a block in the world
  placeBlock(x, y, z, type) {
    const key = `${x},${y},${z}`;
    
    // Don't place if already exists
    if (this.blocks.has(key)) return;
    
    const geometry = this.geometryCache.get('block');
    const material = this.materialCache.get(type);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.userData = { x, y, z, type };
    
    this.scene.add(mesh);
    this.blocks.set(key, mesh);
  }
  
  // Remove a block from the world
  breakBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const block = this.blocks.get(key);
    
    if (block) {
      this.scene.remove(block);
      this.blocks.delete(key);
      return true;
    }
    return false;
  }
  
  // Get block at position
  getBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    return this.blocks.get(key);
  }
  
  // Check if position is solid (for collision)
  isSolid(x, y, z) {
    // Ground plane at Y=0
    if (y <= 0) return true;
    
    const block = this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return block && block.userData.type !== 'water';
  }
}
