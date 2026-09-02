module.exports = {
  apps: [
    {
      name: 'digital-lending-os-dev',
      script: 'npx',
      args: 'next dev -p 3000 -H 0.0.0.0',
      cwd: process.cwd(),
      env: {
        NODE_OPTIONS: '--max-old-space-size=3072',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      watch: false,
      max_memory_restart: '3G',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'digital-lending-os-prod',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: process.cwd(),
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        HOSTNAME: '0.0.0.0',
        PORT: '3000',
      },
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
