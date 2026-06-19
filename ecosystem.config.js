module.exports = {
  apps: [
    {
      name: 'nexusai',
      script: 'server.js',
      cwd: '/opt/nexusai/.next/standalone',
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
      error_file: '/opt/nexusai/logs/error.log',
      out_file: '/opt/nexusai/logs/out.log',
      merge_logs: true,
    },
  ],
};