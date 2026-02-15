# KlawCraft Fix Plan

## Core Issues
1. 70k individual THREE.Mesh objects = 1-2 FPS
2. Player spawns but terrain doesn't render visibly
3. No collision because player falls through

## Quick Win Solution
Instead of fixing the complex instancing, just:

1. **Reduce render distance** from 2 to 1 chunks (70k → ~18k blocks) ✅ DONE
2. **Merge geometry per chunk** - combine all blocks in a chunk into one mesh
3. **Fix player spawn** - ensure they spawn ON terrain, not above it
4. **Add ground plane** - temporary floor so player doesn't fall

## Implementation
- Modify world.js to use THREE.BufferGeometryUtils.mergeBufferGeometries()
- Each chunk = 1 merged mesh instead of 4096 individual meshes
- Should get 60 FPS easily
