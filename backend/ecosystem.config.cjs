module.exports = {
  apps: [
    {
      name: "glowy-backend",
      script: "server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
