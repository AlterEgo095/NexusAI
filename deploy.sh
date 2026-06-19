#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# NexusAI — VPS Deployment Script
# Target: nexus.aenews.net on /opt/nexusai
# Stack: Nginx + Certbot + PM2 + Bun
#
# Usage (run ON the VPS as root or with sudo):
#   bash deploy.sh              # First deployment or update
#   bash deploy.sh --force      # Force clean rebuild
#   bash deploy.sh --ssl-only   # Renew/update SSL certificate only
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ── Config ──
APP_NAME="nexusai"
DOMAIN="nexus.aenews.net"
APP_DIR="/opt/nexusai"
LOG_DIR="/var/log/nexusai"
DATA_DIR="/opt/nexusai/data"
REPO_URL="https://github.com/AlterEgo095/NexusAI.git"
BRANCH="main"
NODE_VERSION="20"
FORCE="${1:-}"

# ── Helpers ──
info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}  ✅ $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()  { echo -e "\n${YELLOW}${BOLD}━━━ $* ━━━${NC}"; }

# ═══════════════════════════════════════════════════════════════════════
# STEP 0: Examine existing VPS environment
# ═══════════════════════════════════════════════════════════════════════
examine_vps() {
    step "0/9 — Examining VPS environment"

    echo -e "\n${CYAN}── OS & System ──${NC}"
    echo -e "  Hostname:  $(hostname 2>/dev/null || echo 'unknown')"
    echo -e "  OS:        $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"' || echo 'unknown')"
    echo -e "  Kernel:    $(uname -r 2>/dev/null || echo 'unknown')"
    echo -e "  Uptime:    $(uptime -p 2>/dev/null || echo 'unknown')"
    echo -e "  RAM:       $(free -h 2>/dev/null | awk '/Mem:/{print $2}' || echo 'unknown')"
    echo -e "  CPU:       $(nproc 2>/dev/null || echo 'unknown') cores"

    echo -e "\n${CYAN}── Existing deployments in /opt ──${NC}"
    if [ -d /opt ]; then
        ls -la /opt/ 2>/dev/null | tail -n +2 | while read -r line; do
            echo -e "  $line"
        done
    else
        echo -e "  /opt does not exist (will be created)"
    fi

    echo -e "\n${CYAN}── Installed services ──${NC}"
    # Check Nginx
    if command -v nginx &>/dev/null || systemctl is-active nginx &>/dev/null; then
        NGINX_VERSION=$(nginx -v 2>&1 | head -1)
        echo -e "  Nginx:     ${GREEN}installed${NC} ($NGINX_VERSION)"
        echo -e "  Nginx sites:"
        ls /etc/nginx/sites-enabled/ 2>/dev/null | while read -r site; do
            echo -e "    → $site"
        done
    else
        echo -e "  Nginx:     ${RED}not installed${NC}"
    fi

    # Check certbot
    if command -v certbot &>/dev/null; then
        CERTBOT_VERSION=$(certbot --version 2>&1)
        echo -e "  Certbot:   ${GREEN}installed${NC} ($CERTBOT_VERSION)"
        echo -e "  Existing certificates:"
        certbot certificates 2>/dev/null | grep -E "Certificate Name|Expiry Date" | while read -r line; do
            echo -e "    $line"
        done
    else
        echo -e "  Certbot:   ${RED}not installed${NC}"
    fi

    # Check PM2
    if command -v pm2 &>/dev/null; then
        echo -e "  PM2:       ${GREEN}installed${NC} ($(pm2 --version 2>/dev/null))"
        echo -e "  PM2 processes:"
        pm2 list 2>/dev/null | tail -n +3 | while read -r line; do
            echo -e "    $line"
        done
    else
        echo -e "  PM2:       ${RED}not installed${NC}"
    fi

    # Check Docker
    if command -v docker &>/dev/null; then
        echo -e "  Docker:    ${GREEN}installed${NC} ($(docker --version 2>/dev/null))"
        docker ps --format "    → {{.Names}} ({{.Image}}) — {{.Status}}" 2>/dev/null
    else
        echo -e "  Docker:    ${RED}not installed${NC}"
    fi

    # Check Node/Bun
    if command -v node &>/dev/null; then
        echo -e "  Node.js:   ${GREEN}installed${NC} ($(node -v 2>/dev/null))"
    else
        echo -e "  Node.js:   ${RED}not installed${NC}"
    fi
    if command -v bun &>/dev/null; then
        echo -e "  Bun:       ${GREEN}installed${NC} ($(bun --version 2>/dev/null))"
    else
        echo -e "  Bun:       ${RED}not installed${NC}"
    fi

    # Check port 80/443
    echo -e "\n${CYAN}── Port usage ──${NC}"
    ss -tlnp 2>/dev/null | grep -E ':(80|443|3000)\s' | while read -r line; do
        echo -e "  $line"
    done || echo -e "  (ss not available)"

    echo -e "\n${GREEN}━━━ VPS examination complete ━━━${NC}\n"
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Install prerequisites
# ═══════════════════════════════════════════════════════════════════════
install_prerequisites() {
    step "1/9 — Installing prerequisites"

    # Update package lists
    info "Updating package lists..."
    apt-get update -qq

    # Install common tools
    apt-get install -y -qq curl wget git software-properties-common build-essential > /dev/null 2>&1
    ok "Base packages"

    # ── Node.js 20 LTS ──
    if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
        info "Installing Node.js ${NODE_VERSION}..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
        apt-get install -y -qq nodejs > /dev/null 2>&1
        ok "Node.js $(node -v)"
    else
        ok "Node.js $(node -v) (already installed)"
    fi

    # ── Bun ──
    if ! command -v bun &>/dev/null; then
        info "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        # Also make it system-wide
        ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun 2>/dev/null || true
        ok "Bun $(bun --version)"
    else
        ok "Bun $(bun --version) (already installed)"
    fi

    # ── PM2 ──
    if ! command -v pm2 &>/dev/null; then
        info "Installing PM2..."
        npm install -g pm2 > /dev/null 2>&1
        pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
        ok "PM2 $(pm2 --version)"
    else
        ok "PM2 $(pm2 --version) (already installed)"
    fi

    # ── Nginx ──
    if ! command -v nginx &>/dev/null; then
        info "Installing Nginx..."
        apt-get install -y -qq nginx > /dev/null 2>&1
        systemctl enable nginx > /dev/null 2>&1
        ok "Nginx installed and enabled"
    else
        ok "Nginx $(nginx -v 2>&1 | grep -oP 'nginx/\K[0-9.]+') (already installed)"
    fi

    # ── Certbot ──
    if ! command -v certbot &>/dev/null; then
        info "Installing Certbot..."
        apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
        ok "Certbot installed"
    else
        ok "Certbot $(certbot --version 2>&1) (already installed)"
    fi

    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Clone or update repository
# ═══════════════════════════════════════════════════════════════════════
setup_repo() {
    step "2/9 — Setting up application code"

    if [ "$FORCE" = "--force" ] && [ -d "$APP_DIR" ]; then
        warn "Force mode: removing existing installation..."
        pm2 delete "$APP_NAME" 2>/dev/null || true
        rm -rf "$APP_DIR"
    fi

    if [ -d "$APP_DIR/.git" ]; then
        info "Updating existing repository..."
        cd "$APP_DIR"
        git fetch origin "$BRANCH"
        git reset --hard "origin/$BRANCH"
        ok "Code updated to latest"
    else
        info "Cloning repository..."
        mkdir -p "$APP_DIR"
        git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
        ok "Repository cloned to $APP_DIR"
    fi

    cd "$APP_DIR"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: Install dependencies
# ═══════════════════════════════════════════════════════════════════════
install_deps() {
    step "3/9 — Installing dependencies"
    cd "$APP_DIR"
    bun install --frozen-lockfile 2>&1 || bun install
    ok "Dependencies installed"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Configure environment
# ═══════════════════════════════════════════════════════════════════════
configure_env() {
    step "4/9 — Configuring environment"
    cd "$APP_DIR"

    if [ ! -f .env.local ]; then
        if [ -f .env.production ]; then
            cp .env.production .env.local
        else
            # Create minimal env
            cat > .env.local << ENVEOF
DATABASE_URL="file:$APP_DIR/data/nexusai.db"
NEXTAUTH_SECRET="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
NEXTAUTH_URL="https://$DOMAIN"
AI_PROVIDER="zai"
PORT=3000
HOSTNAME="0.0.0.0"
NODE_ENV="production"
ENVEOF
        fi

        # Generate secret
        SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        sed -i "s/CHANGE_ME_GENERATE_A_32_CHAR_SECRET/$SECRET/" .env.local

        # Set correct domain and paths
        sed -i "s|https://your-domain.com|https://$DOMAIN|g" .env.local
        sed -i "s|file:/app/data/nexusai.db|file:$APP_DIR/data/nexusai.db|g" .env.local

        ok ".env.local created with generated secret"
    else
        ok ".env.local already exists (not overwritten)"
    fi

    # Ensure data directory exists
    mkdir -p "$DATA_DIR"
    ok "Data directory: $DATA_DIR"

    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    ok "Log directory: $LOG_DIR"

    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Initialize database
# ═══════════════════════════════════════════════════════════════════════
init_database() {
    step "5/9 — Initializing database"
    cd "$APP_DIR"
    bun run db:push
    ok "Database ready"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 6: Build application
# ═══════════════════════════════════════════════════════════════════════
build_app() {
    step "6/9 — Building NexusAI"
    cd "$APP_DIR"

    # Enable standalone output for production build
    if ! grep -q 'output.*standalone' next.config.mjs; then
        info "Enabling standalone output for production build..."
        cp next.config.mjs next.config.mjs.bak
        sed -i 's|const nextConfig = {|const nextConfig = {\n  output: "standalone",|' next.config.mjs
    fi

    NODE_ENV=production bun run build

    # Restore original config
    if [ -f next.config.mjs.bak ]; then
        mv next.config.mjs.bak next.config.mjs
    fi

    ok "Build complete"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 7: Configure PM2
# ═══════════════════════════════════════════════════════════════════════
configure_pm2() {
    step "7/9 — Configuring PM2"
    cd "$APP_DIR"

    # Ensure ecosystem.config.js uses correct paths
    if [ -f ecosystem.config.js ]; then
        sed -i "s|/home/nexusai/app|$APP_DIR|g" ecosystem.config.js
        sed -i "s|/home/nexusai/logs|$LOG_DIR|g" ecosystem.config.js
    fi

    # Stop existing process
    pm2 delete "$APP_NAME" 2>/dev/null || true

    # Start the app
    pm2 start ecosystem.config.js 2>/dev/null || pm2 start "bun .next/standalone/server.js" --name "$APP_NAME"
    pm2 save

    # Wait for app to be ready
    info "Waiting for NexusAI to start..."
    for i in $(seq 1 30); do
        if curl -sf http://127.0.0.1:3000/ > /dev/null 2>&1; then
            ok "NexusAI is running on port 3000"
            return 0
        fi
        sleep 2
    done
    err "NexusAI failed to start. Check: pm2 logs $APP_NAME"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 8: Configure Nginx
# ═══════════════════════════════════════════════════════════════════════
configure_nginx() {
    step "8/9 — Configuring Nginx"

    # Create certbot webroot directory
    mkdir -p /var/www/certbot

    # Copy Nginx config
    if [ -f "$APP_DIR/nexus.conf" ]; then
        cp "$APP_DIR/nexus.conf" /etc/nginx/sites-available/$DOMAIN
    else
        # Fallback: generate config inline
        cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name nexus.aenews.net;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
NGINXEOF
    fi

    # Ensure domain is correct
    sed -i "s/nexus\.aenews\.net/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

    # Remove default site if it conflicts
    if [ -f /etc/nginx/sites-enabled/default ] && [ "$(ls /etc/nginx/sites-enabled/ | wc -l)" -le 1 ]; then
        rm -f /etc/nginx/sites-enabled/default
        info "Removed default Nginx site"
    fi

    # Enable site
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

    # Test config
    nginx -t 2>&1 || err "Nginx configuration test failed"

    # Reload Nginx
    systemctl reload nginx 2>/dev/null || systemctl restart nginx
    ok "Nginx configured for $DOMAIN"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 9: SSL with Certbot
# ═══════════════════════════════════════════════════════════════════════
setup_ssl() {
    step "9/9 — Setting up SSL certificate"

    # Check if certificate already exists
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        info "Certificate exists, attempting renewal..."
        certbot renew --cert-name "$DOMAIN" --quiet 2>&1 && ok "Certificate renewed" || warn "Renewal skipped (not due yet)"
    else
        info "Obtaining SSL certificate for $DOMAIN..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>&1
        if [ $? -eq 0 ]; then
            ok "SSL certificate obtained!"
        else
            warn "Certbot failed. You may need to run manually:"
            warn "  certbot --nginx -d $DOMAIN"
            warn ""
            warn "Common issues:"
            warn "  - DNS not yet pointing to this VPS"
            warn "  - Port 80 blocked by firewall"
            warn "  - Another service using port 80"
        fi
    fi

    # Set up auto-renewal cron
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        info "Setting up automatic certificate renewal..."
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
        ok "Auto-renewal cron added (daily at 3 AM)"
    else
        ok "Auto-renewal cron already exists"
    fi

    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# SSL-only mode
# ═══════════════════════════════════════════════════════════════════════
ssl_only() {
    step "SSL Renewal Mode"
    setup_ssl
    exit 0
}

# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════
main() {
    # Check root
    if [ "$(id -u)" -ne 0 ]; then
        err "This script must be run as root (or with sudo)"
    fi

    echo -e "\n${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  NexusAI — VPS Deployment${NC}"
    echo -e "${GREEN}${BOLD}  Domain: $DOMAIN${NC}"
    echo -e "${GREEN}${BOLD}  Path:   $APP_DIR${NC}"
    echo -e "${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}\n"

    # SSL-only shortcut
    if [ "$FORCE" = "--ssl-only" ]; then
        ssl_only
    fi

    # Run all steps
    examine_vps
    install_prerequisites
    setup_repo
    install_deps
    configure_env
    init_database
    build_app
    configure_pm2
    configure_nginx
    setup_ssl

    # ── Final Summary ──
    echo -e "\n${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ NexusAI deployed successfully!${NC}"
    echo -e "${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}\n"
    echo -e "  🌐 URL:         ${GREEN}https://$DOMAIN${NC}"
    echo -e "  📁 App dir:     $APP_DIR"
    echo -e "  📁 Data dir:    $DATA_DIR"
    echo -e "  📁 Log dir:     $LOG_DIR"
    echo -e "  🔧 PM2 process: $APP_NAME"
    echo ""
    echo -e "  ${BOLD}📋 Useful commands:${NC}"
    echo -e "    pm2 logs $APP_NAME            # View live logs"
    echo -e "    pm2 restart $APP_NAME          # Restart the app"
    echo -e "    pm2 stop $APP_NAME             # Stop the app"
    echo -e "    pm2 monit                      # Monitor dashboard"
    echo -e "    systemctl status nginx         # Check Nginx"
    echo -e "    certbot certificates           # List SSL certs"
    echo -e "    certbot renew                  # Renew SSL"
    echo ""
    echo -e "  ${BOLD}🔄 To update later:${NC}"
    echo -e "    cd $APP_DIR && bash deploy.sh"
    echo ""
    echo -e "  ${BOLD}🔧 First-time setup after deploy:${NC}"
    echo -e "    1. Open https://$DOMAIN in your browser"
    echo -e "    2. Click 'Admin' in the sidebar"
    echo -e "    3. Go to 'Configuration' tab to set API keys"
    echo -e "    4. Go to 'Marketplace' tab to manage agents"
    echo ""
}

main "$@"