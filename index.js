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
  name: 'ohm_cookie',
  secret: 'test', //Change this in production
  resave: false,
  rolling: true,
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
});

app.get('/api/latest', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getLatest(req, res);
});

app.get('/api/feed', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getFeed(req, res);
});

app.get('/api/artist/:name', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getArtist(req, res);
});

app.get('/api/song/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getSongRoute(req, res);
});

app.post('/api/upload', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postUpload(req, res);
});

app.post('/api/comment', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postComment(req, res);
});

app.post('/api/pinned', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postPinned(req, res);
});

app.post('/api/delete', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postDelete(req, res);
});

app.get('/api/follow/:id', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getFollow(req, res);
});

app.get('/api/unfollow/:id', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getUnfollow(req, res);
});

app.post('/api/changepassword', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postChangePassword(req, res);
});

app.get('/api/logout', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getLogout(req, res);
});

app.listen(process.env.PORT, () => {
  console.log('Server is listening on port ' + process.env.PORT + '.');
});

