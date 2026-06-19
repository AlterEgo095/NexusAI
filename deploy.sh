#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# NexusAI — VPS Deployment Script
# Target: nexus.aenews.net on /opt/nexusai
# Pattern: Matches existing VPS setup (PM2 + Nginx + wildcard SSL)
#
# Usage (run ON the VPS):
#   bash deploy.sh              # First deployment or update
#   bash deploy.sh --force      # Force clean rebuild
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

APP_NAME="nexusai"
DOMAIN="nexus.aenews.net"
APP_DIR="/opt/nexusai"
LOG_DIR="/opt/nexusai/logs"
DATA_DIR="/opt/nexusai/data"
REPO_URL="https://github.com/AlterEgo095/NexusAI.git"
BRANCH="main"
FORCE="${1:-}"

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}  ✅ $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()  { echo -e "\n${YELLOW}${BOLD}━━━ $* ━━━${NC}"; }

# ═══════════════════════════════════════════════════════════════════════
# STEP 0: Examine VPS
# ═══════════════════════════════════════════════════════════════════════
examine_vps() {
    step "0/8 — Examining VPS environment"

    echo -e "\n${CYAN}── System ──${NC}"
    echo -e "  OS:        $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2)"
    echo -e "  RAM:       $(free -h 2>/dev/null | awk '/Mem:/{print $2}')"
    echo -e "  CPU:       $(nproc) cores"
    echo -e "  Disk:      $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"

    echo -e "\n${CYAN}── Services ──${NC}"
    for svc in nginx node pm2 bun; do
        if command -v "$svc" &>/dev/null; then
            ver=$("$svc" --version 2>/dev/null | head -1)
            echo -e "  ✅ ${svc:10s} $ver"
        else
            echo -e "  ❌ ${svc:10s} not installed"
        fi
    done

    echo -e "\n${CYAN}── SSL ──${NC}"
    if [ -f /etc/nginx/ssl/aenews.net.crt ]; then
        echo -e "  ✅ Wildcard cert: /etc/nginx/ssl/aenews.net.crt"
    else
        echo -e "  ❌ No wildcard cert found"
    fi

    echo -e "\n${CYAN}── Port 3000 ──${NC}"
    if ss -tlnp 2>/dev/null | grep -q ':3000 '; then
        echo -e "  ❌ Port 3000 already in use!"
        ss -tlnp 2>/dev/null | grep ':3000 '
    else
        echo -e "  ✅ Port 3000 is free"
    fi

    echo -e "\n${CYAN}── /opt contents ──${NC}"
    ls /opt/ 2>/dev/null | head -20

    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Install prerequisites
# ═══════════════════════════════════════════════════════════════════════
install_prerequisites() {
    step "1/8 — Checking prerequisites"

    # Bun (needed for install & build only)
    if ! command -v bun &>/dev/null; then
        info "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun 2>/dev/null || true
        ok "Bun $(bun --version) installed"
    else
        ok "Bun $(bun --version) already installed"
    fi

    # Node (should be v20+)
    if ! command -v node &>/dev/null; then
        info "Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y -qq nodejs
        ok "Node.js $(node -v) installed"
    else
        ok "Node.js $(node -v) already installed"
    fi

    # PM2
    if ! command -v pm2 &>/dev/null; then
        info "Installing PM2..."
        sudo npm install -g pm2
        ok "PM2 installed"
    else
        ok "PM2 already installed"
    fi

    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Clone / Update repo
# ═══════════════════════════════════════════════════════════════════════
setup_repo() {
    step "2/8 — Setting up application code"

    if [ "$FORCE" = "--force" ] && [ -d "$APP_DIR/.git" ]; then
        warn "Force mode: stopping PM2 and removing old build..."
        pm2 delete "$APP_NAME" 2>/dev/null || true
        rm -rf "$APP_DIR/.next"
    fi

    if [ -d "$APP_DIR/.git" ]; then
        info "Updating existing repository..."
        cd "$APP_DIR"
        git fetch origin "$BRANCH"
        git reset --hard "origin/$BRANCH"
        ok "Code updated to latest"
    else
        info "Cloning repository to $APP_DIR..."
        git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
        ok "Repository cloned"
    fi

    cd "$APP_DIR"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: Install dependencies
# ═══════════════════════════════════════════════════════════════════════
install_deps() {
    step "3/8 — Installing dependencies"
    cd "$APP_DIR"
    bun install --frozen-lockfile 2>&1 || bun install
    ok "Dependencies installed"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Configure environment
# ═══════════════════════════════════════════════════════════════════════
configure_env() {
    step "4/8 — Configuring environment"
    cd "$APP_DIR"

    if [ ! -f .env.local ]; then
        cp .env.production .env.local
        # Generate NEXTAUTH_SECRET
        SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        sed -i "s/CHANGE_ME_GENERATE_A_32_CHAR_SECRET/$SECRET/" .env.local
        # Set correct paths for /opt deployment
        sed -i "s|file:/app/data/nexusai.db|file:$APP_DIR/data/nexusai.db|g" .env.local
        sed -i "s|https://your-domain.com|https://$DOMAIN|g" .env.local
        ok ".env.local created"
    else
        ok ".env.local already exists"
    fi

    mkdir -p "$DATA_DIR" "$LOG_DIR"
    ok "Directories ready: data=$DATA_DIR, logs=$LOG_DIR"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Database
# ═══════════════════════════════════════════════════════════════════════
init_database() {
    step "5/8 — Initializing database"
    cd "$APP_DIR"
    bun run db:push
    ok "Database ready"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 6: Build
# ═══════════════════════════════════════════════════════════════════════
build_app() {
    step "6/8 — Building NexusAI"
    cd "$APP_DIR"

    # Enable standalone output for production
    if ! grep -q 'output.*standalone' next.config.mjs; then
        info "Enabling standalone output..."
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
# STEP 7: PM2
# ═══════════════════════════════════════════════════════════════════════
configure_pm2() {
    step "7/8 — Starting with PM2"
    cd "$APP_DIR"

    # Stop if running
    pm2 delete "$APP_NAME" 2>/dev/null || true

    # Start with PM2 (Node.js runtime, like site-builder pattern)
    pm2 start ecosystem.config.js
    pm2 save

    # Wait for app
    info "Waiting for NexusAI to start..."
    for i in $(seq 1 30); do
        if curl -sf http://127.0.0.1:3000/ > /dev/null 2>&1; then
            ok "NexusAI running on port 3000 (PID: $(pm2 pid $APP_NAME))"
            return 0
        fi
        sleep 2
    done
    err "NexusAI failed to start. Run: pm2 logs $APP_NAME"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# STEP 8: Nginx
# ═══════════════════════════════════════════════════════════════════════
configure_nginx() {
    step "8/8 — Configuring Nginx"
    cd "$APP_DIR"

    # Copy Nginx config
    sudo cp nexus.conf /etc/nginx/sites-available/$DOMAIN

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

    # Test and reload
    sudo nginx -t 2>&1 || err "Nginx config test failed"
    sudo systemctl reload nginx
    ok "Nginx configured for $DOMAIN (wildcard SSL)"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════
main() {
    echo -e "\n${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  NexusAI — VPS Deployment${NC}"
    echo -e "${GREEN}${BOLD}  Domain: $DOMAIN${NC}"
    echo -e "${GREEN}${BOLD}  Path:   $APP_DIR${NC}"
    echo -e "${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}\n"

    examine_vps
    install_prerequisites
    setup_repo
    install_deps
    configure_env
    init_database
    build_app
    configure_pm2
    configure_nginx

    echo -e "\n${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ NexusAI deployed successfully!${NC}"
    echo -e "${GREEN}${BOLD}═════════════════════════════════════════════════════════${NC}\n"
    echo -e "  🌐 URL:         ${GREEN}https://$DOMAIN${NC}"
    echo -e "  📁 App dir:     $APP_DIR"
    echo -e "  📁 Data dir:    $DATA_DIR"
    echo -e "  📁 Log dir:     $LOG_DIR"
    echo -e "  🔧 PM2:        $APP_NAME"
    echo ""
    echo -e "  ${BOLD}📋 Commands:${NC}"
    echo -e "    pm2 logs $APP_NAME       # View live logs"
    echo -e "    pm2 restart $APP_NAME     # Restart"
    echo -e "    pm2 stop $APP_NAME        # Stop"
    echo -e "    sudo nginx -t && sudo systemctl reload nginx  # Reload Nginx"
    echo ""
    echo -e "  ${BOLD}🔄 To update later:${NC}"
    echo -e "    cd $APP_DIR && bash deploy.sh"
    echo ""
}

main "$@"