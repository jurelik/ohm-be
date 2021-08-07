module.exports = {
  apps : [{
    name: "ipfs-daemon",
    script: "ipfs daemon --enable-gc"
  },
  {
    name: "main",
    script: "npm",
    args: "start"
  },
  {
    name: "cron",
    script: "cron.js"
  }]
}
