# Production Deployment Guide

## Prerequisites
- Node.js ≥ 18
- npm or yarn

## Quick Start

```bash
# Install dependencies
npm install --production

# Copy and configure environment
cp .env.example .env
# Edit .env with your production values

# Run
NODE_ENV=production node server.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `NODE_ENV` | `development` | `production` enables static caching |
| `CORS_ORIGIN` | `*` | Allowed origins (comma-separated) |
| `MAX_PLAYERS` | `20` | Max concurrent players |

## Health Check

```
GET /health → { status, uptime, players, env }
```

## Deployment Options

### Docker (recommended)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

### systemd

```ini
[Unit]
Description=KlawCraft
After=network.target

[Service]
Type=simple
User=klawcraft
WorkingDirectory=/opt/klaw-craft
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Reverse Proxy (nginx)

WebSocket support is required:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Security Notes

- Set `CORS_ORIGIN` to your domain in production (not `*`)
- Use a reverse proxy with TLS termination
- Socket connections are rate-limited (5 connections/min per IP, 100 events/sec per socket)
- All socket inputs are validated and sanitized
