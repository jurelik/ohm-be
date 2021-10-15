module.exports = {
  apps : [{
    name: "caddy",
    script: "/usr/local/opt/caddy/bin/caddy reverse-proxy --from localhost:443 --to localhost:3000"
  },
  {
    name: "main",
    script: "node",
    args: "index.js"
  }]
}
