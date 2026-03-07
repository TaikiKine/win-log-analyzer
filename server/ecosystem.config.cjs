/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "win-log-analyzer",
      // tsx バイナリをそのまま使って TypeScript を直接実行
      script: "./node_modules/.bin/tsx",
      args: "src/index.ts",
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // ログは server/logs/ 以下に出力
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
