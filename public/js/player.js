// Player movement and physics
class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    
    // Position and movement  
    this.position = new THREE.Vector3(0, 30, 0); // Start higher so we can see the fall
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = { x: -0.3, y: 0 }; // Look slightly down to see terrain
    
    // Physics
    this.speed = 5;
    this.jumpForce = 8;
    this.gravity = -25;
    this.isGrounded = false;
    this.height = 1.8;
    this.radius = 0.3;
    
    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.jumping = false;
    
    // Raycaster for block interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 5; // Reach distance
    
    // Place camera at player position
    this.updateCameraPosition();
  }
  
  updateCameraPosition() {
    this.camera.position.copy(this.position);
    this.camera.position.y += this.height - 0.2;
    this.camera.rotation.x = this.rotation.x;
    this.camera.rotation.y = this.rotation.y;
  }
  
  // Update player physics and movement
  update(deltaTime) {
    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;
    
    // Calculate movement direction
    const direction = new THREE.Vector3();
    
    if (this.moveForward) direction.z -= 1;
    if (this.moveBackward) direction.z += 1;
    if (this.moveLeft) direction.x -= 1;
    if (this.moveRight) direction.x += 1;
    
    // Normalize and apply speed
    if (direction.length() > 0) {
      direction.normalize();
      
      // Rotate direction based on camera rotation
      const angle = this.rotation.y;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const moveX = direction.x * cos - direction.z * sin;
      const moveZ = direction.x * sin + direction.z * cos;
      
      this.velocity.x = moveX * this.speed;
      this.velocity.z = moveZ * this.speed;
    } else {
      this.velocity.x *= 0.8; // Friction
      this.velocity.z *= 0.8;
    }
    
    // Jump
    if (this.jumping && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }
    
    // Apply velocity
    const newPos = this.position.clone();
    newPos.x += this.velocity.x * deltaTime;
    newPos.y += this.velocity.y * deltaTime;
    newPos.z += this.velocity.z * deltaTime;
    
    // Collision detection
    this.handleCollisions(newPos);
    
    // Update camera
    this.updateCameraPosition();
  }
  
  handleCollisions(newPos) {
    // Check ground collision
    this.isGrounded = false;
    
    // Check blocks around player
    const minX = Math.floor(newPos.x - this.radius);
    const maxX = Math.ceil(newPos.x + this.radius);
    const minY = Math.floor(newPos.y);
    const maxY = Math.ceil(newPos.y + this.height);
    const minZ = Math.floor(newPos.z - this.radius);
    const maxZ = Math.ceil(newPos.z + this.radius);
    
    let collision = false;
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.isSolid(x, y, z)) {
            // Check Y collision (ground/ceiling)
            if (newPos.y < y + 1 && this.position.y >= y + 1) {
              // Hit ceiling
              newPos.y = y + 1;
              this.velocity.y = 0;
              collision = true;
            } else if (newPos.y + this.height > y && this.position.y + this.height <= y) {
              // Hit ground
              newPos.y = y - this.height;
              this.velocity.y = 0;
              this.isGrounded = true;
              collision = true;
            }
            
            // Check X collision
            if (Math.abs(newPos.x - x - 0.5) < this.radius + 0.5 &&
                newPos.y + this.height > y && newPos.y < y + 1) {
              if (newPos.x > x + 0.5) {
                newPos.x = x + 1 + this.radius;
              } else {
                newPos.x = x - this.radius;
              }
              this.velocity.x = 0;
              collision = true;
            }
            
            // Check Z collision
            if (Math.abs(newPos.z - z - 0.5) < this.radius + 0.5 &&
                newPos.y + this.height > y && newPos.y < y + 1) {
              if (newPos.z > z + 0.5) {
                newPos.z = z + 1 + this.radius;
              } else {
                newPos.z = z - this.radius;
              }
              this.velocity.z = 0;
              collision = true;
            }
          }
        }
      }
    }
    
    this.position.copy(newPos);
  }
  
  // Get the block player is looking at
  getTargetBlock() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.world.scene.children);
    
    if (intersects.length > 0) {
      const block = intersects[0].object;
      if (block.userData.x !== undefined) {
        return {
          block: block,
          position: block.userData,
          face: intersects[0].face,
          point: intersects[0].point
        };
      }
    }
    return null;
  }
  
  // Break block player is looking at
  breakBlock() {
    const target = this.getTargetBlock();
    if (target) {
      const { x, y, z } = target.position;
      return { x, y, z };
    }
    return null;
  }
  
  // Place block adjacent to target
  placeBlock(blockType) {
    const target = this.getTargetBlock();
    if (target && target.face) {
      const { x, y, z } = target.position;
      const normal = target.face.normal;
      
      // Place on the face that was hit
      const newX = x + Math.round(normal.x);
      const newY = y + Math.round(normal.y);
      const newZ = z + Math.round(normal.z);
      
      // Don't place inside player
      const dist = Math.sqrt(
        Math.pow(newX - this.position.x, 2) +
        Math.pow(newY - this.position.y, 2) +
        Math.pow(newZ - this.position.z, 2)
      );
      
      if (dist > 1) {
        return { x: newX, y: newY, z: newZ, blockType };
      }
    }
    return null;
  }
  
  // Set movement state
  setMovement(forward, backward, left, right) {
    this.moveForward = forward;
    this.moveBackward = backward;
    this.moveLeft = left;
    this.moveRight = right;
  }
  
  jump() {
    this.jumping = true;
  }
  
  stopJump() {
    this.jumping = false;
  }
  
  // Rotate camera
  rotate(deltaX, deltaY) {
    this.rotation.y -= deltaX * 0.002;
    this.rotation.x -= deltaY * 0.002;
    
    // Clamp vertical rotation
    this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
  }
}
