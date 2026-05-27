module.exports = {
  apps: [
    {
      name: 'ssumjeon',
      script: 'dist/src/app.js',
      cwd: '/home/ubuntu/ssumjeon/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
}
