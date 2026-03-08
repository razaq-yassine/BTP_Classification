module.exports = {
  apps: [
    {
      name: "btp-backend",
      script: "node",
      args: "dist/index.js",
      cwd: "/home/BTP_Classification/backend",
      env: {
        NODE_ENV: "production",
        PORT: 8001,
        APP_URL: "https://btp.smarttechnologies.ma"
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true
    },
    {
      name: "btp-frontend",
      script: "npm",
      args: "run preview -- --port 3002 --host 127.0.0.1",
      cwd: "/home/BTP_Classification/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3002
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true
    }
  ]
};
