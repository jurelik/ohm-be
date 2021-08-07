module.exports = {
  apps : [{
    name: "ipfs-daemon",
    script: "ipfs daemon --enable-gc"
  },
  {
    name: "main",
    script: "index.js"
  },
  {
    name: "cron",
    script: "cron.js"
  }]
}
