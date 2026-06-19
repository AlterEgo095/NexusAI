#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# NexusAI — Bare Metal VPS Deploy (without Docker)
# Requires: Node.js 20+, Bun, PM2
# Usage: bash deploy-bare.sh [domain]
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/home/nexusai/app"
LOG_DIR="/home/nexusai/logs"
DOMAIN="${1:-}"

echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  NexusAI — Bare Metal VPS Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"

# ── 1. Prerequisites ──
echo -e "${YELLOW}[1/8] Installing prerequisites...${NC}"

# Install bun if missing
if ! command -v bun &>/dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo -e "  ✅ bun installed"
fi

# Install PM2 if missing
if ! command -v pm2 &>/dev/null; then
    npm install -g pm2
    echo -e "  ✅ pm2 installed"
fi

# Install Caddy if missing
if ! command -v caddy &>/dev/null; then
    apt-get update -qq && apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy
    echo -e "  ✅ caddy installed"
fi

echo -e "  ✅ All prerequisites ready"

# ── 2. Clone / Pull ──
echo -e "${YELLOW}[2/8] Setting up application...${NC}"

if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin main
    echo -e "  ✅ Code updated"
else
    mkdir -p "$(dirname "$APP_DIR")"
    # CHANGE THIS to your repo URL
    git clone https://github.com/AlterEgo095/NexusAI.git "$APP_DIR"
    cd "$APP_DIR"
    echo -e "  ✅ Code cloned"
fi

# ── 3. Install Dependencies ──
echo -e "${YELLOW}[3/8] Installing dependencies...${NC}"
bun install --production=false
echo -e "  ✅ Dependencies installed"

# ── 4. Environment ──
echo -e "${YELLOW}[4/8] Configuring environment...${NC}"

if [ ! -f .env.local ]; then
    cp .env.production .env.local
    SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i "s/CHANGE_ME_GENERATE_A_32_CHAR_SECRET/$SECRET/" .env.local

    if [ -n "$DOMAIN" ]; then
        sed -i "s|https://your-domain.com|https://$DOMAIN|g" .env.local
    fi
    echo -e "  ✅ .env.local created"
else
    echo -e "  ✅ .env.local exists"
fi

# ── 5. Database ──
echo -e "${YELLOW}[5/8] Initializing database...${NC}"
bun run db:push
echo -e "  ✅ Database ready"

# ── 6. Build ──
echo -e "${YELLOW}[6/8] Building application...${NC}"

# Enable standalone output for production
cp next.config.mjs next.config.mjs.bak
sed -i 's|const nextConfig = {|const nextConfig = {\n  output: "standalone",|' next.config.mjs

NODE_ENV=production bun run build

# Restore original config
mv next.config.mjs.bak next.config.mjs

echo -e "  ✅ Build complete"

# ── 7. PM2 Start ──
echo -e "${YELLOW}[7/8] Starting NexusAI with PM2...${NC}"

mkdir -p "$LOG_DIR"
pm2 delete nexusai 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo -e "  ✅ NexusAI running (PID: $(pm2 pid nexusai))"

# ── 8. Caddy ──
echo -e "${YELLOW}[8/8] Configuring reverse proxy...${NC}"

if [ -n "$DOMAIN" ]; then
    sed -i "s/your-domain.com/$DOMAIN/g" Caddyfile
    sed -i 's|nexusai:3000|localhost:3000|g' Caddyfile

    # Remove IP block if present
    sed -i '/^:80 {/,/^}/d' Caddyfile

    cp Caddyfile /etc/caddy/Caddyfile
    systemctl restart caddy
    echo -e "  ✅ Caddy configured for https://$DOMAIN"
else
    # IP-only mode
    cat > /etc/caddy/Caddyfile << 'EOF'
:80 {
    reverse_proxy localhost:3000
    request_body { max_size 50MB }
    encode gzip zstd
}
EOF
    systemctl restart caddy
    echo -e "  ✅ Caddy configured for port 80 (IP access)"
fi

# ── Done ──
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ NexusAI deployed!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
if [ -n "$DOMAIN" ]; then
    echo -e "  🌐 https://$DOMAIN"
else
    echo -e "  🌐 http://$(hostname -I | awk '{print $1}')"
fi
echo ""
echo -e "  📋 Commands: pm2 logs nexusai | pm2 restart | pm2 stop"