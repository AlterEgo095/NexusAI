#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# NexusAI — VPS Deployment Script
# Usage: bash deploy.sh [domain]
#   domain: your domain (e.g., nexusai.example.com)
#           If omitted, deploys with IP-only access (no SSL)
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  NexusAI — VPS Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Prerequisites Check ──
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

for cmd in docker docker-compose git curl; do
    if ! command -v "$cmd" &>/dev/null; then
        echo -e "${RED}  ✗ $cmd not found. Please install it first.${NC}"
        exit 1
    fi
    echo -e "  ✅ $cmd"
done

# Check if docker compose v2 is available
if ! docker compose version &>/dev/null; then
    echo -e "${RED}  ✗ Docker Compose v2 not found. Upgrade Docker.${NC}"
    exit 1
fi
echo -e "  ✅ docker compose v2"
echo ""

# ── Environment Setup ──
echo -e "${YELLOW}[2/7] Setting up environment...${NC}"

if [ ! -f .env.local ]; then
    if [ -f .env.production ]; then
        cp .env.production .env.local
        echo -e "  ✅ Created .env.local from .env.production"

        # Generate a random NEXTAUTH_SECRET
        SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        sed -i "s/CHANGE_ME_GENERATE_A_32_CHAR_SECRET/$SECRET/" .env.local

        if [ -n "$DOMAIN" ]; then
            sed -i "s|https://your-domain.com|https://$DOMAIN|g" .env.local
            echo -e "  ✅ Set NEXTAUTH_URL to https://$DOMAIN"
        else
            # Remove domain requirement for IP-based access
            sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')|g" .env.local
            echo -e "  ⚠️  No domain set — using IP-based access (no SSL)"
        fi

        echo -e "  ⚠️  IMPORTANT: Edit .env.local to configure your API keys!"
        echo -e "     You can also configure them via the Admin Panel after startup."
    else
        echo -e "${RED}  ✗ .env.production not found. Cannot create .env.local${NC}"
        exit 1
    fi
else
    echo -e "  ✅ .env.local already exists (not overwritten)"
fi
echo ""

# ── Caddy Configuration ──
echo -e "${YELLOW}[3/7] Configuring Caddy...${NC}"

if [ -n "$DOMAIN" ]; then
    # Replace placeholder domain
    sed -i "s/your-domain.com/$DOMAIN/g" Caddyfile
    echo -e "  ✅ Caddy configured for https://$DOMAIN (auto SSL)"
else
    # Enable IP-based block, disable domain block
    sed -i 's/^your-domain.com {/# your-domain.com {/' Caddyfile
    sed -i 's/^# :80 {/:80 {/' Caddyfile
    sed -i 's/^#     reverse_proxy/    reverse_proxy/' Caddyfile
    sed -i 's/^#     request_body/    request_body/' Caddyfile
    sed -i 's/^#     encode/    encode/' Caddyfile
    echo -e "  ✅ Caddy configured for IP-based access (port 80)"
fi
echo ""

# ── Pull Latest Code ──
echo -e "${YELLOW}[4/7] Pulling latest code...${NC}"
git pull origin main || echo -e "  ⚠️  Git pull skipped (first deployment?)"
echo ""

# ── Build & Deploy ──
echo -e "${YELLOW}[5/7] Building Docker image...${NC}"
docker compose build --no-cache 2>&1 | tail -5
echo -e "  ✅ Build complete"
echo ""

echo -e "${YELLOW}[6/7] Starting services...${NC}"
docker compose down 2>/dev/null || true
docker compose up -d

# Wait for app to be healthy
echo -e "  ⏳ Waiting for NexusAI to start..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/api/stats >/dev/null 2>&1; then
        echo -e "  ✅ NexusAI is running!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}  ✗ NexusAI failed to start. Check logs:${NC}"
        echo "    docker compose logs nexusai --tail 50"
        exit 1
    fi
    sleep 2
done
echo ""

# ── Database Init ──
echo -e "${YELLOW}[7/7] Initializing database...${NC}"
docker compose exec nexusai bun run db:push 2>&1 | tail -3
echo -e "  ✅ Database initialized"
echo ""

# ── Done! ──
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ NexusAI deployed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
if [ -n "$DOMAIN" ]; then
    echo -e "  🌐 URL: ${GREEN}https://$DOMAIN${NC}"
else
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "<YOUR_VPS_IP>")
    echo -e "  🌐 URL: ${GREEN}http://$IP${NC}"
fi
echo ""
echo -e "  📋 Useful commands:"
echo -e "    docker compose logs -f          # View logs"
echo -e "    docker compose restart          # Restart"
echo -e "    docker compose down             # Stop"
echo -e "    docker compose up -d --build    # Rebuild & start"
echo ""
echo -e "  🔧 First-time setup:"
echo -e "    1. Open the URL above in your browser"
echo -e "    2. Click 'Admin' in the sidebar"
echo -e "    3. Go to 'Configuration' tab to set API keys"
echo -e "    4. Go to 'Marketplace' tab to manage agents"
echo ""