# 🎮 KlawCraft

A fully functional web-based Minecraft clone with multiplayer support, built with Three.js and Socket.io. Optimized for mobile browsers with intuitive touch controls.

![KlawCraft](https://img.shields.io/badge/minecraft-clone-brightgreen) ![Multiplayer](https://img.shields.io/badge/multiplayer-4%20players-blue) ![Mobile](https://img.shields.io/badge/mobile-optimized-orange)

## ✨ Features

- 🎮 **Mobile-First Design**: Virtual joystick, swipe-to-look, tap-to-interact
- 🌍 **Procedural Terrain**: Hills, caves, trees, water bodies
- 🧱 **6 Block Types**: Grass, dirt, stone, wood, sand, water
- 👥 **Multiplayer**: Up to 4 players can play together in real-time
- 🌅 **Day/Night Cycle**: Dynamic lighting and sky colors
- ⚡ **Optimized Performance**: Mobile-friendly render distance
- 🎯 **Instant Play**: No build tools, runs directly in browser

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/kaikoh95/klaw-craft.git
cd klaw-craft

# Install dependencies
npm install

# Start the server
npm start
```

The game will be running at `http://localhost:3000`

### Controls

**Desktop:**
- `W/A/S/D` - Move around
- `Mouse` - Look around (click to lock pointer)
- `Space` - Jump
- `Left Click` - Break block
- `Right Click` - Place block
- `1-6` or `Mouse Wheel` - Select block type

**Mobile:**
- `Virtual Joystick` (left side) - Move around
- `Swipe` (right side) - Look around
- `Jump Button` - Jump
- `Break Button` - Break block
- `Place Button` - Place block
- `Tap inventory` - Select block type

## 🏗️ Architecture

### Project Structure

```
klaw-craft/
├── server.js           # Express + Socket.io server
├── public/
│   ├── index.html      # Game UI
│   ├── css/
│   │   └── style.css   # Styling
│   └── js/
│       ├── game.js     # Main game loop
│       ├── world.js    # Terrain generation
│       ├── player.js   # Player physics
│       ├── controls.js # Input handling
│       ├── inventory.js # Block selection
│       └── multiplayer.js # Network sync
├── package.json
└── README.md
```

### Tech Stack

- **Frontend**: Three.js (3D rendering), Socket.io client
- **Backend**: Node.js, Express, Socket.io
- **No Build Tools**: Uses CDN imports for simplicity

### Multiplayer Architecture

- Server maintains authoritative game state
- Position updates sent at 20Hz (50ms intervals)
- Block changes broadcast to all clients instantly
- Smooth interpolation for remote players
- Player limit: 4 concurrent players

## 🎨 Customization

### Adding New Block Types

Edit `public/js/world.js`:

```javascript
this.blockTypes = {
  grass: 0x7cbd6b,
  dirt: 0x8b5a3c,
  stone: 0x808080,
  wood: 0x8b6914,
  sand: 0xf4e7c7,
  water: 0x4a90e2,
  yourblock: 0xFFFFFF  // Add your color
};
```

Add to inventory in `public/index.html`:

```html
<div class="inv-slot" data-block="yourblock" style="background: #FFFFFF;">🎨</div>
```

### Adjust Render Distance

Edit `public/js/world.js`:

```javascript
this.renderDistance = 2; // Change this (higher = more terrain)
```

### Change Day/Night Speed

Edit `public/js/game.js`:

```javascript
this.daySpeed = 0.01; // Higher = faster day/night cycle
```

## 📱 Deployment

### Local Network

```bash
# Find your local IP
ifconfig | grep inet  # Mac/Linux
ipconfig              # Windows

# Share: http://YOUR_IP:3000
```

### Public Deployment

Deploy to any Node.js hosting platform:

- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **DigitalOcean**: Deploy to App Platform
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:3000`

## 🐛 Troubleshooting

**Issue**: Low FPS on mobile
- **Solution**: Reduce `renderDistance` in `world.js`

**Issue**: Players can't connect
- **Solution**: Check firewall settings, ensure port 3000 is open

**Issue**: Joystick not responding
- **Solution**: Ensure touch events aren't being blocked by browser

## 🤝 Contributing

Contributions welcome! Ideas:
- More block types and textures
- Crafting system
- Biomes (desert, snow, forest)
- Mobs/enemies
- Save/load worlds
- Better terrain generation (Perlin noise)

## 📄 License

MIT License - feel free to use this project however you like!

## 🎯 Credits

Built with ❤️ using:
- [Three.js](https://threejs.org/) - 3D graphics
- [Socket.io](https://socket.io/) - Real-time multiplayer
- [Express](https://expressjs.com/) - Server framework

---

**Have fun crafting! ⛏️**
