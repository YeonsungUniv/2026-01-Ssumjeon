module.exports = {
  apps: [
    {
      name: 'ssumjeon',
      script: 'dist/src/app.js',
      cwd: '/home/ec2-user/ssumjeon/backend',
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
