![logo](./icon.svg)

back-end for [ohm](https://github.com/jurelik/ohm).

## setup
```
git clone https://github.com/jurelik/ohm-be.git && cd ohm-be
```

To start a local instance you will need a running PostgreSQL database and an `.env.development` file in the root folder of ohm-be with the following structure:
```
PORT=3000 //Port of the api server
DB_PORT=5432
DB_USER=username
DB_PASSWORD=password
DB_URL=localhost
DB_NAME=ohm-dev
COOKIE_SECRET=secret
```

You will also need a reverse proxy capable of serving https on localhost. By default, ohm-be is configured to work with [Caddy](https://caddyserver.com/). You will need to set the path to caddy in `config/development.config.js` or change the script entirely if you are using a different reverse proxy:
```
module.exports = {
  apps : [{
    name: "reverse-proxy",
    script: "/path/to/caddy reverse-proxy --from localhost:443 --to localhost:3000" //set path to Caddy or change the line entirely if you are using a different reverse-proxy
  },
  {
    name: "main",
    script: "node",
    args: "index.js"
  }]
}
```

## run
```
npm install
npm run init_db_dev
npm run init_ipfs //OPTIONAL - only if you don't have an .ohm-ipfs repo set up locally yet
npm install pm2 -g //OPTIONAL - only if you don't have pm2 installed yet
npm run dev
```

To stop the server use the `npm stop` command.

## advanced
Make sure to adjust the `max_memory_restart` setting in the relevant config files for pm2 when deploying to production. This setting specifies the RAM usage limit at which the pm2 process will reboot to prevent the server from crashing.
