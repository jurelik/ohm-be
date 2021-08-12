module.exports = {
  apps : [{
    name: "ipfs-daemon",
    script: "ipfs daemon --enable-gc"
  },
  {
    name: "main",
    script: "node",
    args: "index.js"
  },
  {
    name: "cron",
    script: "node",
    args: "cron.js"
  }]
}
