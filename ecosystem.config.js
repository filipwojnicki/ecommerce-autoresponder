module.exports = {
  apps: [
    {
      name: 'ecommerce-autoresponder',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      watch: false,
      max_memory_restart: '300M',
      env_file: '.env',
      min_uptime: '60s',
      max_restarts: 5,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      node_args: ['--max-old-space-size=256'],
    },
  ],
};
