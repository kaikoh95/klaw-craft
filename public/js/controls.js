// Input controls for desktop and mobile
class Controls {
  constructor(player, canvas) {
    this.player = player;
    this.canvas = canvas;
    
    // Mouse/touch state
    this.isPointerLocked = false;
    this.isTouching = false;
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
        case 'KeyE':
          // Break block with E key
          if (this.onBreak) this.onBreak();
          break;
        case 'KeyQ':
          // Place block with Q key
          if (this.onPlace) this.onPlace();
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
    this.canvas.addEventListener('click', (e) => {
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
    if (!this.joystickZone) return;

    // Virtual joystick
    this.joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      this.joystickActive = true;
      this.joystickStartX = touch.clientX;
      this.joystickStartY = touch.clientY;
    }, { passive: false });
    
    this.joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.joystickActive) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.joystickStartX;
      const deltaY = touch.clientY - this.joystickStartY;
      
      const maxRadius = 60;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > maxRadius) {
        this.joystickX = (deltaX / distance) * maxRadius;
        this.joystickY = (deltaY / distance) * maxRadius;
      } else {
        this.joystickX = deltaX;
        this.joystickY = deltaY;
      }
      
      this.joystickStick.style.transform = 
        `translate(calc(-50% + ${this.joystickX}px), calc(-50% + ${this.joystickY}px))`;
      
      const normalizedX = this.joystickX / maxRadius;
      const normalizedY = this.joystickY / maxRadius;
      
      this.player.moveForward = normalizedY < -0.3;
      this.player.moveBackward = normalizedY > 0.3;
      this.player.moveLeft = normalizedX < -0.3;
      this.player.moveRight = normalizedX > 0.3;
    }, { passive: false });
    
    this.joystickZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.joystickActive = false;
      this.joystickX = 0;
      this.joystickY = 0;
      this.joystickStick.style.transform = 'translate(-50%, -50%)';
      this.player.moveForward = false;
      this.player.moveBackward = false;
      this.player.moveLeft = false;
      this.player.moveRight = false;
    }, { passive: false });
    
    // Touch controls for camera (swipe on canvas)
    let lookTouchId = null;
    
    this.canvas.addEventListener('touchstart', (e) => {
      for (let touch of e.changedTouches) {
        if (lookTouchId === null) {
          lookTouchId = touch.identifier;
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        }
      }
    }, { passive: true });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let touch of e.changedTouches) {
        if (touch.identifier === lookTouchId) {
          const deltaX = touch.clientX - this.lastTouchX;
          const deltaY = touch.clientY - this.lastTouchY;
          this.player.rotate(deltaX * 2, deltaY * 2);
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        }
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      for (let touch of e.changedTouches) {
        if (touch.identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    }, { passive: true });
    
    // Action buttons - BOTH touch AND click handlers
    const setupButton = (btn, downAction, upAction) => {
      if (!btn) return;
      
      // Touch events
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        downAction();
      }, { passive: false });
      
      if (upAction) {
        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          upAction();
        }, { passive: false });
      }
      
      // Click events (for desktop/fallback)
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        downAction();
      });
      
      if (upAction) {
        btn.addEventListener('mouseup', (e) => {
          e.preventDefault();
          e.stopPropagation();
          upAction();
        });
      }
    };
    
    setupButton(this.jumpBtn, 
      () => this.player.jump(), 
      () => this.player.stopJump()
    );
    
    setupButton(this.breakBtn, 
      () => { if (this.onBreak) this.onBreak(); },
      null
    );
    
    setupButton(this.placeBtn, 
      () => { if (this.onPlace) this.onPlace(); },
      null
    );
  }
}
