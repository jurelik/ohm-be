module.exports = {
  apps : [{
    name: "reverse-proxy",
    script: "/usr/local/opt/caddy/bin/caddy reverse-proxy --from localhost:443 --to localhost:3000" //Change this line if your install of Caddy is non-standard or if you are using a different reverse-proxy
  },
  {
    name: "main",
    script: "node",
    args: "index.js"
  }]
}
