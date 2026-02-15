// Main game engine
class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.player = null;
    this.controls = null;
    this.inventory = null;
    this.multiplayer = null;
    
    this.clock = new THREE.Clock();
    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // Day/night cycle
    this.timeOfDay = 0.3; // 0 = midnight, 0.5 = noon, 1 = midnight
    this.daySpeed = 0.01; // How fast time passes
    
    this.init();
  }
  
  init() {
    // Setup Three.js scene
    this.setupScene();
    
    // Create world
    this.world = new World(this.scene);
    this.world.generateTerrain(0, 0);
    
    // Create player
    this.player = new Player(this.camera, this.world);
    
    // Setup controls
    this.controls = new Controls(this.player, this.renderer.domElement);
    this.controls.onBreak = () => this.handleBreakBlock();
    this.controls.onPlace = () => this.handlePlaceBlock();
    
    // Setup inventory
    this.inventory = new Inventory();
    
    // Setup multiplayer
    this.multiplayer = new Multiplayer(this.scene, this.world);
    
    // Welcome screen
    this.setupWelcomeScreen();
    
    // Start game loop
    this.animate();
  }
  
  setupScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 80);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200 // Increased from 1000 to match fog distance
    );
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for mobile performance
    document.body.appendChild(this.renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.scene.add(this.directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  setupWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const joinBtn = document.getElementById('join-btn');
    const nameInput = document.getElementById('player-name');
    
    // Generate random name
    const adjectives = ['Swift', 'Bold', 'Epic', 'Cool', 'Wild', 'Brave'];
    const nouns = ['Miner', 'Builder', 'Crafter', 'Explorer', 'Hero', 'Legend'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
    nameInput.value = randomName;
    
    joinBtn.addEventListener('click', () => {
      console.log('Join button clicked!');
      const playerName = nameInput.value.trim() || randomName;
      console.log('Connecting as:', playerName);
      
      // Connect to multiplayer
      this.multiplayer.connect(playerName, () => {
        console.log('Connected! Hiding welcome screen');
        // Hide welcome screen
        welcomeScreen.style.display = 'none';
        
        // Show HUD
        document.getElementById('hud').style.display = 'block';
        
        // Enable canvas pointer events
        this.renderer.domElement.style.pointerEvents = 'auto';
      });
    });
    
    // Allow Enter key to join
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinBtn.click();
      }
    });
  }
  
  handleBreakBlock() {
    const blockPos = this.player.breakBlock();
    if (blockPos) {
      this.world.breakBlock(blockPos.x, blockPos.y, blockPos.z);
      this.multiplayer.sendBlockBroken(blockPos.x, blockPos.y, blockPos.z);
    }
  }
  
  handlePlaceBlock() {
    const blockType = this.inventory.getSelectedBlock();
    const blockPos = this.player.placeBlock(blockType);
    if (blockPos) {
      this.world.placeBlock(blockPos.x, blockPos.y, blockPos.z, blockPos.blockType);
      this.multiplayer.sendBlockPlaced(blockPos.x, blockPos.y, blockPos.z, blockPos.blockType);
    }
  }
  
  updateDayNightCycle(deltaTime) {
    // Update time
    this.timeOfDay += deltaTime * this.daySpeed;
    if (this.timeOfDay > 1) this.timeOfDay = 0;
    
    // Calculate sun position and color
    const sunAngle = this.timeOfDay * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    
    // Update sky color
    let skyColor;
    if (sunHeight > 0) {
      // Day
      const t = sunHeight;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff7f50), // Sunrise orange
        new THREE.Color(0x87ceeb), // Day blue
        t
      );
    } else {
      // Night
      const t = Math.abs(sunHeight);
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff7f50), // Sunset orange
        new THREE.Color(0x0a0a1a), // Night dark blue
        t
      );
    }
    
    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;
    
    // Update lighting
    const lightIntensity = Math.max(0.3, sunHeight * 0.8 + 0.4);
    this.directionalLight.intensity = lightIntensity;
    
    // Update sun position
    this.directionalLight.position.x = Math.cos(sunAngle) * 50;
    this.directionalLight.position.y = Math.sin(sunAngle) * 50 + 50;
  }
  
  updateHUD() {
    // Update position display
    const pos = this.player.position;
    document.getElementById('position').textContent = 
      `X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`;
    
    // Update FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.fpsUpdateTime > 1000) {
      const fps = Math.round(this.frameCount / ((now - this.fpsUpdateTime) / 1000));
      document.getElementById('fps').textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    
    // Update player
    this.player.update(deltaTime);
    
    // Update multiplayer
    this.multiplayer.update(deltaTime);
    
    // Send position to other players
    this.multiplayer.sendMovement(
      {
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z
      },
      {
        x: this.player.rotation.x,
        y: this.player.rotation.y
      }
    );
    
    // Update day/night cycle
    this.updateDayNightCycle(deltaTime);
    
    // Update HUD
    this.updateHUD();
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game when page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, checking dependencies...');
  console.log('THREE available:', typeof THREE);
  console.log('io available:', typeof io);
  
  try {
    console.log('Creating game instance...');
    window.game = new Game();
    console.log('Game created successfully');
    console.log('Terrain blocks:', window.game.world.blocks.size);
    console.log('Scene children:', window.game.scene.children.length);
  } catch (e) {
    console.error('Failed to create game:', e);
    alert('Failed to start game. Check console for errors.');
  }
});
