module.exports = {
  apps: [
    {
      name: "glowy-backend",
      script: "dist/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
