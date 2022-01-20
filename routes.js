const express = require('express');
const router = express.Router();
const controllers = require('./controllers');

const userAuthenticated = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.json({
      type: 'error',
      err: 'User not authenticated'
    });
  }
  next();
}

router.get('/', (req, res) => { res.end('Greetings traveler.') });
router.post('/login', express.json(), controllers.postLogin);
router.post('/register', controllers.postRegister);
router.post('/latest', express.json(), userAuthenticated, controllers.postLatest);
router.post('/feed', express.json(), userAuthenticated, controllers.postFeed);
router.get('/artist/:name', userAuthenticated, controllers.getArtist);
router.get('/song/:id', userAuthenticated, controllers.getSongRoute);
router.get('/album/:id', userAuthenticated, controllers.getAlbumRoute);
router.get('/file/:id', userAuthenticated, controllers.getFile);
router.post('/upload', express.json(), userAuthenticated, controllers.postUpload);
router.post('/comment', express.json(), userAuthenticated, controllers.postComment);
router.post('/pinned', express.json(), userAuthenticated, controllers.postPinned);
router.post('/search', express.json(), userAuthenticated, controllers.postSearch);
router.post('/delete', express.json(), userAuthenticated, controllers.postDelete);
router.post('/following', express.json(), userAuthenticated, controllers.postFollowing);
router.get('/follow/:id', express.json(), userAuthenticated, controllers.getFollow);
router.get('/unfollow/:id', express.json(), userAuthenticated, controllers.getUnfollow);
router.post('/changepassword', express.json(), userAuthenticated, controllers.postChangePassword);
router.post('/changelocation', express.json(), userAuthenticated, controllers.postChangeLocation);
router.post('/changebio', express.json(), userAuthenticated, controllers.postChangeBio);
router.get('/logout', userAuthenticated, controllers.getLogout);

module.exports = router;
