require('dotenv-flow').config();
const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session');
const routes = require('./routes');
const SessionStore = require('./helpers/sessionStore')(session.Store);
const db = require('./helpers/db');

app.use(cors());
app.use(session({
  name: 'ohm_cookie',
  secret: process.env.COOKIE_SECRET,
  resave: false,
  rolling: true,
  saveUninitialized: false,
  store: new SessionStore({}, db),
  proxy: true,
  cookie: {
    secure: true,
    maxAge: process.env.NODE_ENV === 'development' ? 1000 * 60 * 60 : 1000 * 60 * 60 * 24 * 3,
    sameSite: 'none'
  }
}));
app.use(routes);

app.listen(process.env.PORT, () => {
  console.log('Server is listening on port ' + process.env.PORT + '.');
});

