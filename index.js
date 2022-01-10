require('dotenv-flow').config();
const express = require('express');
const app = express();
const cors = require('cors');
const helpers = require('./helpers');
const session = require('express-session');
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

app.get('/', (req, res) => {
  res.end('Greetings traveler.');
});

app.post('/login', express.json(), (req, res) => {
  helpers.postLogin(req, res);
});

app.post('/register', (req, res) => {
  helpers.postRegister(req, res);
});

app.post('/latest', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postLatest(req, res);
});

app.post('/feed', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postFeed(req, res);
});

app.get('/artist/:name', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getArtist(req, res);
});

app.get('/song/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getSongRoute(req, res);
});

app.get('/album/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getAlbumRoute(req, res);
});

app.get('/file/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getFile(req, res);
});

app.post('/upload', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postUpload(req, res);
});

app.post('/comment', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postComment(req, res);
});

app.post('/pinned', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postPinned(req, res);
});

app.post('/search', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postSearch(req, res);
});

app.post('/delete', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postDelete(req, res);
});

app.post('/following', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postFollowing(req, res);
});

app.get('/follow/:id', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getFollow(req, res);
});

app.get('/unfollow/:id', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getUnfollow(req, res);
});

app.post('/changepassword', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postChangePassword(req, res);
});

app.post('/changelocation', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postChangeLocation(req, res);
});

app.post('/changebio', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postChangeBio(req, res);
});

app.get('/logout', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getLogout(req, res);
});

app.listen(process.env.PORT, () => {
  console.log('Server is listening on port ' + process.env.PORT + '.');
});

