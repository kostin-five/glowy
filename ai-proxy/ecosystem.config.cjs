module.exports = {
  apps: [
    {
      name: "glowy-ai-proxy",
      script: "server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
