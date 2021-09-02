module.exports = {
  apps : [{
    name: "ipfs-daemon",
    script: "ipfs daemon --enable-gc",
    max_memory_restart: "500M"
  },
  {
    name: "main",
    script: "node",
    args: "index.js",
    max_memory_restart: "500M"
  },
  {
    name: "cron",
    script: "node",
    args: "cron.js"
  }]
}
