# ═══════════════════════════════════════════════════════════════════════
# NexusAI — PM2 Process Configuration
# Usage: pm2 start ecosystem.config.js
# ═══════════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: 'nexusai',
      script: '.next/standalone/server.js',
      cwd: '/opt/nexusai',
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
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/nexusai/error.log',
      out_file: '/var/log/nexusai/out.log',
      merge_logs: true,
      // Increase memory for build/deploy operations
      node_args: '--max-old-space-size=2048',
    },
  ],
};