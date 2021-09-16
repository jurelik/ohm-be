![logo](./icon.svg)

back-end for [ohm](https://github.com/jurelik/ohm).

## setup
To start a local instance you will need a running PostgreSQL database and an `.env.development` file in the root folder of ohm-be with the following structure:
```
PORT=3000 //Port of the api server
DB_PORT=5432
DB_USER=username
DB_PASSWORD=password
DB_URL=localhost
DB_NAME=ohm-dev
COOKIE_SECRET=secret
REGISTRATION_SECRET=secret
```

After that run:
```
npm install
npm run init_db_dev
npm run init_ipfs //OPTIONAL - only if you don't have an .ohm-ipfs repo set up locally yet
npm run dev
```

To stop the server use the `npm stop` command.

## advanced
Make sure to adjust the `max_memory_restart` setting in the relevant config files for pm2 when deploying to production. This setting specifies the RAM usage limit at which the pm2 process will reboot to prevent the server from crashing.
