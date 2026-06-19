# ═══════════════════════════════════════════════════════════════════════
# NexusAI — PM2 Configuration (alternative to Docker)
# Usage: pm2 start ecosystem.config.js
# ═══════════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: 'nexusai',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/nexusai/app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/nexusai/logs/error.log',
      out_file: '/home/nexusai/logs/out.log',
      merge_logs: true,
    },
  ],
};