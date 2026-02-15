// Player movement and physics
class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    
    // Position and movement  
    this.position = new THREE.Vector3(0, 10, 0); // Spawn closer to ground
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // Rotation - store separately from camera
    this.yaw = 0; // Horizontal rotation (left/right)
    this.pitch = 0; // Vertical rotation (up/down)
    
    // Physics - Minecraft-like
    this.speed = 4.3; // Slower, more controlled
    this.jumpForce = 7; // Lower jump
    this.gravity = -20; // Less floaty
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
    // Update camera position
    this.camera.position.copy(this.position);
    this.camera.position.y += this.height - 0.2; // Eye level
    
    // Update camera rotation using Euler angles (proper order)
    this.camera.rotation.order = 'YXZ'; // Yaw-Pitch-Roll order
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0; // No roll
  }
  
  // Update player physics and movement
  update(deltaTime) {
    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;
    
    // Get camera direction for movement
    const direction = new THREE.Vector3();
    
    // Calculate forward/right vectors from camera rotation
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawQuat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yawQuat);
    
    // Apply WASD movement
    if (this.moveForward) direction.add(forward);
    if (this.moveBackward) direction.sub(forward);
    if (this.moveRight) direction.add(right);
    if (this.moveLeft) direction.sub(right);
    
    // Normalize and apply speed
    if (direction.length() > 0) {
      direction.normalize();
      this.velocity.x = direction.x * this.speed;
      this.velocity.z = direction.z * this.speed;
    } else {
      // Friction when not moving
      this.velocity.x *= 0.8;
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
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.isSolid(x, y, z)) {
            // Y collision (vertical)
            if (newPos.y < y + 1 && this.position.y >= y + 1) {
              // Hit ceiling
              newPos.y = y + 1;
              this.velocity.y = 0;
            } else if (newPos.y + this.height > y && this.position.y + this.height <= y) {
              // Hit ground
              newPos.y = y - this.height;
              this.velocity.y = 0;
              this.isGrounded = true;
            }
            
            // X collision (horizontal)
            const playerFeetY = newPos.y;
            const playerHeadY = newPos.y + this.height;
            const blockBottomY = y;
            const blockTopY = y + 1;
            
            if (playerHeadY > blockBottomY && playerFeetY < blockTopY) {
              // Check if player overlaps block in X direction
              const distX = Math.abs(newPos.x - (x + 0.5));
              if (distX < this.radius + 0.5) {
                if (newPos.x > x + 0.5) {
                  newPos.x = x + 1 + this.radius;
                } else {
                  newPos.x = x - this.radius;
                }
                this.velocity.x = 0;
              }
            }
            
            // Z collision (horizontal)
            if (playerHeadY > blockBottomY && playerFeetY < blockTopY) {
              // Check if player overlaps block in Z direction
              const distZ = Math.abs(newPos.z - (z + 0.5));
              if (distZ < this.radius + 0.5) {
                if (newPos.z > z + 0.5) {
                  newPos.z = z + 1 + this.radius;
                } else {
                  newPos.z = z - this.radius;
                }
                this.velocity.z = 0;
              }
            }
          }
        }
      }
    }
    
    this.position.copy(newPos);
  }
  
  // Get the block player is looking at
  getTargetBlock() {
    // Raycast from camera center
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    
    this.raycaster.set(this.camera.position, direction);
    
    const intersects = this.raycaster.intersectObjects(this.world.scene.children, false);
    
    if (intersects.length > 0) {
      for (let intersect of intersects) {
        const block = intersect.object;
        if (block.userData.x !== undefined) {
          return {
            block: block,
            position: block.userData,
            face: intersect.face,
            point: intersect.point,
            distance: intersect.distance
          };
        }
      }
    }
    return null;
  }
  
  // Break block player is looking at
  breakBlock() {
    const target = this.getTargetBlock();
    if (target) {
      const { x, y, z } = target.position;
      console.log('Breaking block at:', x, y, z);
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
      
      // Calculate adjacent position based on face normal
      const newX = Math.floor(x + Math.round(normal.x));
      const newY = Math.floor(y + Math.round(normal.y));
      const newZ = Math.floor(z + Math.round(normal.z));
      
      console.log('Placing block at:', newX, newY, newZ, 'from target:', x, y, z, 'normal:', normal);
      
      // Don't place inside player (check if player would collide)
      const playerMinX = Math.floor(this.position.x - this.radius);
      const playerMaxX = Math.ceil(this.position.x + this.radius);
      const playerMinY = Math.floor(this.position.y);
      const playerMaxY = Math.ceil(this.position.y + this.height);
      const playerMinZ = Math.floor(this.position.z - this.radius);
      const playerMaxZ = Math.ceil(this.position.z + this.radius);
      
      // Check if new block would overlap player
      if (newX >= playerMinX && newX <= playerMaxX &&
          newY >= playerMinY && newY <= playerMaxY &&
          newZ >= playerMinZ && newZ <= playerMaxZ) {
        console.log('Cannot place block - would overlap player');
        return null;
      }
      
      // Don't place if position already has a block
      if (this.world.isSolid(newX, newY, newZ)) {
        console.log('Cannot place block - position already occupied');
        return null;
      }
      
      return { x: newX, y: newY, z: newZ, blockType };
    }
    console.log('No target block found for placement');
    return null;
  }
  
  // Rotate camera - smooth Minecraft-like sensitivity
  rotate(deltaX, deltaY) {
    // Adjust yaw (horizontal rotation)
    this.yaw -= deltaX * 0.002; // Smooth horizontal
    
    // Adjust pitch (vertical rotation)
    this.pitch -= deltaY * 0.002; // Smooth vertical
    
    // Clamp pitch to prevent camera flip
    const maxPitch = Math.PI / 2 - 0.01; // Just under 90 degrees
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    
    // Normalize yaw to stay within -PI to PI
    while (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    while (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  }
  
  // Get current rotation for multiplayer sync
  getRotation() {
    return {
      x: this.pitch,
      y: this.yaw
    };
  }
}
