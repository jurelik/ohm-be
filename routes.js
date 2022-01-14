const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.end('Greetings traveler.');
});

router.post('/login', express.json(), (req, res) => {
  helpers.postLogin(req, res);
});

router.post('/register', (req, res) => {
  helpers.postRegister(req, res);
});

router.post('/latest', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postLatest(req, res);
});

router.post('/feed', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postFeed(req, res);
});

router.get('/artist/:name', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getArtist(req, res);
});

router.get('/song/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getSongRoute(req, res);
});

router.get('/album/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getAlbumRoute(req, res);
});

router.get('/file/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.getFile(req, res);
});

router.post('/upload', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postUpload(req, res);
});

router.post('/comment', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  helpers.postComment(req, res);
});
