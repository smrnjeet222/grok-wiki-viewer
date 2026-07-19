const serverProc = Bun.spawn(["bun", "--watch", "server/index.ts"], {
  stdout: "inherit",
  stderr: "inherit",
  env: { ...process.env, PORT: process.env.PORT || "4173" },
});

const webProc = Bun.spawn(["bunx", "vite"], {
  stdout: "inherit",
  stderr: "inherit",
});

const shutdown = () => {
  serverProc.kill();
  webProc.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.all([serverProc.exited, webProc.exited]);
export {};
