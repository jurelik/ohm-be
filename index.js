require('dotenv-flow').config();
const express = require('express');
const app = express();;
const cors = require('cors');
const helpers = require('./helpers');
const session = require('express-session');
const SessionStore = require('./sessionStore')(session.Store);
const db = require('./db');

//helpers.initDB(); //Uncomment only when initialising db locally

app.use(cors());
app.use(session({
  secret: 'test', //Change this in production
  resave: true,
  saveUninitialized: false,
  store: new SessionStore({}, db),
  cookie: {
    secure: false, //Change this in production
    maxAge: 1000 * 60 * 60 //Change this in production
  }
}))

app.get('/', (req, res) => {
  res.end('Hello world');
});

app.post('/api/login', express.json(), (req, res) => {
  helpers.postLogin(req, res);
})

app.get('/api/latest', (req, res) => {
  helpers.getLatest(req, res);
});

app.get('/api/artist/:name', (req, res) => {
  helpers.getArtist(req, res);
});

app.post('/api/upload', express.json(), (req, res) => {
  helpers.postUpload(req, res);
});

app.post('/api/comment', express.json(), (req, res) => {
  helpers.postComment(req, res);
});

app.post('/api/pinned', express.json(), (req, res) => {
  helpers.postPinned(req, res);
});

app.listen(process.env.PORT, () => {
  console.log('Server is listening on port ' + process.env.PORT + '.');
});

