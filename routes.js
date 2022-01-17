const express = require('express');
const router = express.Router();
const controllers = require('./controllers');
const helpers = require('./helpers');

router.get('/', (req, res) => {
  res.end('Greetings traveler.');
});

router.post('/login', express.json(), (req, res) => {
  controllers.postLogin(req, res);
});

router.post('/register', (req, res) => {
  controllers.postRegister(req, res);
});

router.post('/latest', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postLatest(req, res);
});

router.post('/feed', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postFeed(req, res);
});

router.get('/artist/:name', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getArtist(req, res);
});

router.get('/song/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getSongRoute(req, res);
});

router.get('/album/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getAlbumRoute(req, res);
});

router.get('/file/:id', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getFile(req, res);
});

router.post('/upload', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postUpload(req, res);
});

router.post('/comment', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postComment(req, res);
});

router.post('/pinned', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postPinned(req, res);
});

router.post('/search', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postSearch(req, res);
});

router.post('/delete', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postDelete(req, res);
});

router.post('/following', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postFollowing(req, res);
});

router.get('/follow/:id', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getFollow(req, res);
});

router.get('/unfollow/:id', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getUnfollow(req, res);
});

router.post('/changepassword', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postChangePassword(req, res);
});

router.post('/changelocation', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postChangeLocation(req, res);
});

router.post('/changebio', express.json(), (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.postChangeBio(req, res);
});

router.get('/logout', (req, res) => {
  if (!helpers.userAuthenticated(req, res)) return;
  controllers.getLogout(req, res);
});

module.exports = router;
