// Input controls for desktop and mobile
class Controls {
  constructor(player, canvas) {
    this.player = player;
    this.canvas = canvas;
    
    // Mouse/touch state
    this.isPointerLocked = false;
    this.isTouching = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    
    // Joystick state
    this.joystickActive = false;
    this.joystickStartX = 0;
    this.joystickStartY = 0;
    this.joystickX = 0;
    this.joystickY = 0;
    
    // Mobile elements
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickStick = document.getElementById('joystick-stick');
    this.jumpBtn = document.getElementById('jump-btn');
    this.breakBtn = document.getElementById('break-btn');
    this.placeBtn = document.getElementById('place-btn');
    
    // Action callbacks
    this.onBreak = null;
    this.onPlace = null;
    
    this.setupDesktopControls();
    this.setupMobileControls();
  }
  
  setupDesktopControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      switch(e.code) {
        case 'KeyW': this.player.moveForward = true; break;
        case 'KeyS': this.player.moveBackward = true; break;
        case 'KeyA': this.player.moveLeft = true; break;
        case 'KeyD': this.player.moveRight = true; break;
        case 'Space': 
          e.preventDefault();
          this.player.jump(); 
          break;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      switch(e.code) {
        case 'KeyW': this.player.moveForward = false; break;
        case 'KeyS': this.player.moveBackward = false; break;
        case 'KeyA': this.player.moveLeft = false; break;
        case 'KeyD': this.player.moveRight = false; break;
        case 'Space': this.player.stopJump(); break;
      }
    });
    
    // Mouse for looking (pointer lock)
    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.player.rotate(e.movementX, e.movementY);
      }
    });
    
    // Mouse buttons for break/place
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isPointerLocked) {
        e.preventDefault();
        if (e.button === 0) { // Left click = break
          if (this.onBreak) this.onBreak();
        } else if (e.button === 2) { // Right click = place
          if (this.onPlace) this.onPlace();
        }
      }
    });
    
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  setupMobileControls() {
    // Virtual joystick
    this.joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.joystickActive = true;
      this.joystickStartX = touch.clientX;
      this.joystickStartY = touch.clientY;
    });
    
    this.joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.joystickStartX;
      const deltaY = touch.clientY - this.joystickStartY;
      
      // Limit joystick radius
      const maxRadius = 60;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > maxRadius) {
        this.joystickX = (deltaX / distance) * maxRadius;
        this.joystickY = (deltaY / distance) * maxRadius;
      } else {
        this.joystickX = deltaX;
        this.joystickY = deltaY;
      }
      
      // Update joystick visual
      this.joystickStick.style.transform = 
        `translate(calc(-50% + ${this.joystickX}px), calc(-50% + ${this.joystickY}px))`;
      
      // Update player movement
      const normalizedX = this.joystickX / maxRadius;
      const normalizedY = this.joystickY / maxRadius;
      
      this.player.moveForward = normalizedY < -0.3;
      this.player.moveBackward = normalizedY > 0.3;
      this.player.moveLeft = normalizedX < -0.3;
      this.player.moveRight = normalizedX > 0.3;
    });
    
    this.joystickZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.joystickActive = false;
      this.joystickX = 0;
      this.joystickY = 0;
      
      // Reset joystick visual
      this.joystickStick.style.transform = 'translate(-50%, -50%)';
      
      // Stop movement
      this.player.moveForward = false;
      this.player.moveBackward = false;
      this.player.moveLeft = false;
      this.player.moveRight = false;
    });
    
    // Touch controls for camera (swipe on right side)
    let lookTouchId = null;
    
    this.canvas.addEventListener('touchstart', (e) => {
      for (let touch of e.touches) {
        // Right half of screen for looking
        if (touch.clientX > window.innerWidth / 2) {
          lookTouchId = touch.identifier;
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        }
      }
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let touch of e.touches) {
        if (touch.identifier === lookTouchId) {
          const deltaX = touch.clientX - this.lastTouchX;
          const deltaY = touch.clientY - this.lastTouchY;
          
          this.player.rotate(deltaX * 2, deltaY * 2);
          
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        }
      }
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      for (let touch of e.changedTouches) {
        if (touch.identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    });
    
    // Action buttons
    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.jump();
    });
    
    this.jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.stopJump();
    });
    
    this.breakBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.onBreak) this.onBreak();
    });
    
    this.placeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.onPlace) this.onPlace();
    });
    
    // Prevent default touch behaviors
    document.body.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
}
