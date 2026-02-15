# KlawCraft Roadmap

## ✅ MVP Complete (v1.0)
- [x] Basic 3D terrain with blocks
- [x] Player movement (WASD)
- [x] Camera controls (mouse/touch)
- [x] Multiplayer (Socket.io, up to 20 players)
- [x] Ground plane collision
- [x] Join World screen
- [x] Mobile controls (joystick + buttons)
- [x] Production hardening (rate limiting, security headers, health check)
- [x] AI bots (3 autonomous players)
- [x] Optimized rendering (~2k blocks, 30+ FPS)

## 🚧 In Progress (v1.1)
- [ ] Minecraft-like controls (smoother, less floaty)
- [ ] Pixelated rendering style
- [ ] Fix block placement mechanics
- [ ] Improve jump feel
- [ ] Better terrain visibility

## 📋 Next Up (v1.2)
- [ ] **Block Breaking** - Actually remove blocks when clicking
- [ ] **Block Placing** - Place blocks where you're looking
- [ ] **Inventory System** - Switch between block types
- [ ] **Chunk Loading** - Load/unload terrain as player moves
- [ ] **Better Terrain** - Hills, valleys, varied height
- [ ] **Trees & Structures** - Re-enable procedural trees

## 🎯 Future Features (v2.0+)

### Gameplay
- [ ] Mining animations
- [ ] Block durability (different tools for different blocks)
- [ ] Crafting system
- [ ] Building mode vs survival mode
- [ ] Day/night cycle improvements (moon, stars)
- [ ] Weather (rain, snow)
- [ ] Biomes (desert, forest, snow, water)

### Multiplayer
- [ ] Player names above heads
- [ ] Chat system
- [ ] Private worlds/rooms
- [ ] Persistent world saving
- [ ] Player skins/avatars
- [ ] Spectator mode

### Performance
- [ ] Merged geometry (combine blocks into chunks)
- [ ] Frustum culling (don't render what you can't see)
- [ ] LOD (level of detail for distant terrain)
- [ ] Web Workers for terrain generation
- [ ] Instanced rendering

### AI Bots
- [ ] Smarter pathfinding
- [ ] Build actual structures (houses, towers)
- [ ] Follow players
- [ ] Configurable behaviors
- [ ] Bot skins/names

### Polish
- [ ] Sound effects (footsteps, block break/place)
- [ ] Music
- [ ] Particle effects (block break particles)
- [ ] Better textures (actual Minecraft-style block faces)
- [ ] Shadows
- [ ] Water physics/animation
- [ ] Tutorial/onboarding

### Deployment
- [ ] Docker compose setup
- [ ] Kubernetes deployment
- [ ] Horizontal scaling (multiple servers)
- [ ] Database for world persistence
- [ ] CDN for static assets
- [ ] Custom domain

## 💡 Nice-to-Have
- [ ] Modding API
- [ ] Plugin system
- [ ] Admin commands
- [ ] World editor
- [ ] Replay system
- [ ] Achievements
- [ ] Leaderboards
- [ ] Mobile app (React Native or PWA)

## 🐛 Known Issues
- Browser cache causes old JS to load (fixed with ?v=2)
- FPS drops with >5k blocks (need chunk merging)
- Mobile joystick sometimes loses touch
- AI bots can walk through walls
- Water blocks aren't transparent enough
- No collision with placed blocks

---

**Goal:** Make this a genuinely fun, playable multiplayer voxel game that works on desktop and mobile.

**Philosophy:** Ship fast, iterate based on feedback, keep it simple and performant.
