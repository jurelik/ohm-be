const { Sequelize } = require('sequelize');
const helpers = require('./helpers');
const db = require('./helpers/db');
const ipfs = require('./helpers/ipfs');
const currentlyUploading = []; //Keep track of clients currently uploading to prevent double uploads.

const postLogin = async (req, res) => {
  if (req.session.authenticated) { //Check if session is already established
    try {
      const id = process.env.NODE_ENV === 'development' ? null : await ipfs.id(); //Get server multiaddr

      return res.json({
        type: 'success',
        session: req.session,
        multiaddr: id ? `/p2p/${id.id}` : null
      });
    }
    catch (err) {
      return res.json({
        type: 'error',
        err: err.message
      });
    }
  }

  const payload = req.body;
  const t = await db.transaction();

  try {
    if (!req.body || Object.keys(req.body).length === 0) throw new Error('No running session found, please login.') //If no session is established, req.body is required

    if (payload.artist && payload.pw) {
      const artistId = await helpers.checkPassword(payload, t);
      const id = process.env.NODE_ENV === 'development' ? null : await ipfs.id(); //Get server multiaddr

      //Append data to session and include cookie in response
      req.session.authenticated = true;
      req.session.artist = payload.artist;
      req.session.artistId = artistId;

      await t.commit();
      return res.json({
        type: 'success',
        session: req.session,
        multiaddr: id ? `/p2p/${id.id}` : null
      });
    }
    else throw new Error('Artist or password not included in payload');
  }
  catch (err) {
    await t.rollback();
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postRegister = (req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk }); //Parse form data
  req.on('end', async () => {
    const t = await db.transaction();
    const params = new URLSearchParams(raw);
    const parsed = Object.fromEntries(params);

    try {
      if (!parsed || !parsed.artist || !parsed.pw || !parsed.confirm) throw new Error('Artist name, password and password confirmation need to be included in the request.') //Check if all data is included
      if (parsed.pw !== parsed.confirm) throw new Error("Passwords don't match."); //Check if passwords match
      if (!helpers.allowedFormat(parsed.artist)) throw new Error('Username can only contain numbers, letters and underscores.'); //Check username for bad characters

      const { hash, salt } = await helpers.generateHash(parsed.pw);
      await db.query(`INSERT INTO artists (name, bio, location, pw, salt, "createdAt", "updatedAt") VALUES (:artist, 'human', 'hydra forest', :hash, :salt, NOW(), NOW())`, {
        replacements: {
          artist: parsed.artist,
          hash,
          salt
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction: t });

      await t.commit();
      return res.end('Successfully registered an artist account.');
    }
    catch (err) {
      await t.rollback();
      if (err.message === 'Validation error') return res.end('Artist already exists.');
      return res.end(err.message);
    }
  });
}

const postLatest = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const a = [];
    let submissions;

    //Get submissions depending on loadMore attribute
    if (req.body.loadMore) submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE "createdAt" < (SELECT "createdAt" FROM submissions WHERE "${req.body.lastItem.type}Id" = :lastItemId) ORDER BY "createdAt" DESC LIMIT 10`, {
      replacements: {
        lastItemId: req.body.lastItem.id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
    else submissions = await db.query(`SELECT "songId", "albumId" FROM submissions ORDER BY "createdAt" DESC LIMIT 10`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (submissions.length === 0 && req.body.loadMore) throw new Error('Last item reached.'); //Throw error if no more songs/albums can be loaded

    for (let submission of submissions) {
      if (submission.songId) {
        //Get song
        const song = await helpers.getSongShallow(submission.songId, t);
        a.push(song);
      }
      else if (submission.albumId) {
        //Get album
        const album = await helpers.getAlbumShallow(submission.albumId, t);
        a.push(album);
      }
    }

    await t.commit();
    return res.json({
      type: 'success',
      payload: a
    });
  }
  catch (err) {
    await t.rollback();
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postFeed = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const a = [];
    let submissions;

    //Get submissions depending on loadMore attribute
    if (req.body.loadMore) submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE ("artistId" IN (SELECT "followingId" FROM follows WHERE "followerId" = :artistId) OR "artistId" = :artistId) AND "createdAt" < (SELECT "createdAt" FROM submissions WHERE "${req.body.lastItem.type}Id" = :lastItemId) ORDER BY "createdAt" DESC LIMIT 10`, {
      replacements: {
        artistId: req.session.artistId,
        lastItemId: req.body.lastItem.id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
    else submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE "artistId" IN (SELECT "followingId" FROM follows WHERE "followerId" = :artistId) OR "artistId" = :artistId ORDER BY "createdAt" DESC LIMIT 10`, {
      replacements: {
        artistId: req.session.artistId,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    if (submissions.length === 0 && req.body.loadMore) throw new Error('Last item reached.'); //Throw error if no more songs/albums can be loaded

    if (submissions.length > 0) {
      for (let submission of submissions) {
        if (submission.songId) {
          //Get song
          const song = await helpers.getSongShallow(submission.songId, t);
          a.push(song);
        }
        else if (submission.albumId) {
          //Get album
          const album = await helpers.getAlbumShallow(submission.albumId, t);
          a.push(album);
        }
      }
    }

    await t.commit();
    return res.json({
      type: 'success',
      payload: a
    });
  }
  catch (err) {
    await t.rollback();
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getArtist = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.name) throw new Error('No artist name included in request');

    const artist = await db.query(`SELECT id, name, bio, location FROM artists WHERE name = :name`, {
      replacements: {
        name: req.params.name
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
    if (artist.length === 0) throw 'Artist not found';

    artist[0].albums = [];
    artist[0].songs = [];

    //Get albums
    const albums = await db.query(`SELECT id FROM albums WHERE "artistId" = :artistId ORDER BY id DESC`, {
      replacements: {
        artistId: artist[0].id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t })

    for (let _album of albums) {
      let album = await helpers.getAlbumShallow(_album.id, t);
      artist[0].albums.push(album);
    }

    //Get songs
    const songs = await db.query(`SELECT id FROM songs WHERE "artistId" = :artistId AND "albumId" IS NULL ORDER BY id DESC`, {
      replacements: {
        artistId: artist[0].id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    for (let _song of songs) {
      let song = await helpers.getSongShallow(_song.id, t);
      artist[0].songs.push(song);
    }

    //Check if user is following the artist
    const following = await db.query(`SELECT id FROM follows WHERE "followerId" = :sessionArtistId AND "followingId" = :artistId`, {
      replacements: {
        sessionArtistId: req.session.artistId,
        artistId: artist[0].id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    if (following.length === 1) artist[0].following = true;
    else artist[0].following = false;

    await t.commit();
    return res.json({
      type: 'success',
      payload: artist[0]
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getSongRoute = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No song id included in request.');
    let song = await helpers.getSong(req.params.id, t);

    await t.commit();
    return res.json({
      type: 'success',
      payload: song
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getAlbumRoute = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No album id included in request.');
    let album = await helpers.getAlbum(req.params.id, t);

    await t.commit();
    return res.json({
      type: 'success',
      payload: album
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getFile = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No file id included in request.');
    const file = await db.query(`SELECT f.id, f.name, a.name AS artist, s.title AS "songTitle", f.type, f.format, f.license, f.cid, f.tags, f.info FROM files AS f JOIN artists AS a ON a.id = f."artistId" JOIN songs AS s ON s.id = f."songId" WHERE f.id = :id`, {
      replacements: {
        id: req.params.id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    if (file.length === 0) throw new Error(`File with id "${req.params.id}" not found.`);

    await t.commit();
    return res.json({
      type: 'success',
      payload: file[0]
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postUpload = async (req, res) => {
  const t = await db.transaction();
  const controller = new AbortController();
  const progress = { value: 0 }; //Keep track of upload progress
  let uTimeout;
  let uploadStarted = false; //Keep track of whether or not upload has started

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (currentlyUploading.includes(req.session.artistId)) throw new Error('Please wait for the current upload to finish.');

    const payload = helpers.initialisePayload(req); //Initialise payload object
    const cid = payload.album ? payload.album.cid : payload.songs[0].cid;

    if (!payload.artistId) throw new Error('Session is missing artist data. Try to login again.'); //Check for missing data

    if (process.env.NODE_ENV === 'production') await ipfs.swarm.connect(payload.multiaddr, { timeout: 30000 }); //Try to init connection to node

    if (payload.album) {
      const albumId = await helpers.addAlbum(payload, t); //Add album
      await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', :artistId, :albumId, NOW(), NOW())`, { //Add submission
        replacements: {
          artistId: payload.artistId,
          albumId
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction: t });
    }
    else {
      const songId = await helpers.addSong({ song: payload.songs[0], artistId: payload.artistId }, t); //Add song
      await db.query(`INSERT INTO submissions (type, "artistId", "songId",  "createdAt", "updatedAt") VALUES ('song', :artistId, :songId, NOW(), NOW())`, { //Add submission
        replacements: {
          artistId: payload.artistId,
          songId
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction: t });
    }

    // BLACK MAGIC START
    res.append('X-Accel-Buffering', 'no'); //This adds the X-Accel-Buffering header to the response, which allows NGINX to pass through individual res.writes
    // BLACK MAGIC END

    uTimeout = helpers.uploadTimeout({ //Send progress every second
      res,
      cid,
      controller,
      prevProgress: 0,
      count: 0
    }, progress);

    currentlyUploading.push(payload.artistId); //Add artistId to currentlyUploading
    uploadStarted = true;
    await ipfs.pin.add(`/ipfs/${cid}`, { signal: controller.signal });
    clearTimeout(uTimeout); //Stop sending progress
    currentlyUploading.splice(currentlyUploading.indexOf(payload.artistId), 1); //Delete artistId from currentlyUploading

    await t.commit();
    return res.end(JSON.stringify({
      type: 'success'
    }));
  }
  catch (err) {
    await t.rollback();
    clearTimeout(uTimeout); //Stop sending progress
    console.error(err.message);

    if (uploadStarted) currentlyUploading.splice(currentlyUploading.indexOf(req.session.artistId), 1); //Delete artistId from currentlyUploading ONLY IF upload has started

    return res.end(JSON.stringify({
      type: 'error',
      err: err.message
    }));
  }
}

const postComment = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');

    const payload = helpers.initialisePayload(req); //Initialise payload
    if (!payload.songId || !payload.content) throw new Error('Payload is missing data'); //Check for missing data
    if (!payload.artistId) throw new Error('Session is missing artist data. Try to login again.'); //Check for missing data

    await helpers.addComment(payload, t);

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err
    });
  }
}

const postPinned = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const payload = helpers.initialisePayload(req); //Initialise payload
    const albums = await helpers.getAlbumsByCID(payload.albums, t);
    const songs = await helpers.getSongsByCID(payload.songs, t);
    const _payload = albums.concat(songs).sort((a, b) => {
      return b.createdAt - a.createdAt;
    });

    await t.commit();
    return res.json({
      type: 'success',
      payload: _payload
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err
    });
  }
}

const postSearch = async (req, res) => {
  const t = await db.transaction();
  const _payload = helpers.initialisePayload(req);
  let payload;

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.searchQuery.length === 0) throw new Error('The search query is empty.');

    switch (req.body.searchCategory) {
      case 'songs':
        payload = await helpers.getSongsBySearch(_payload, t);
        break;
      case 'albums':
        payload = await helpers.getAlbumsBySearch(_payload, t);
        break;
      case 'artists':
        payload = await helpers.getArtistsBySearch(_payload, t);
        break;
      case 'files':
        payload = await helpers.getFilesBySearch(_payload, t);
        break;
      default:
        throw new Error('Search category not provided.');
    }

    await t.commit();
    return res.json({
      type: 'success',
      payload
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postDelete = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');

    const payload = helpers.initialisePayload(req); //Initialise payload
    await helpers.removePin(payload.cid);
    payload.type === 'song' ? await helpers.deleteSong(payload, t) : await helpers.deleteAlbum(payload, t); //Delete song or album

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postFollowing = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const payload = helpers.initialisePayload(req); //Initialise payload

    const following = await db.query(`SELECT a.id, a.name, a.location FROM follows AS f JOIN artists AS a ON a.id = f."followingId" WHERE f."followerId" = :artistId ${payload.loadMore ? `AND f."createdAt" < (SELECT "createdAt" FROM follows WHERE "followingId" = :lastItemId AND "followerId" = :artistId)` : ''} ORDER BY f."createdAt" DESC LIMIT 10`, {
      replacements: {
        artistId: req.session.artistId,
        lastItemId: payload.lastItem ? payload.lastItem.id : null
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    if (payload.loadMore && following.length === 0) throw new Error('Last item reached.');

    for (let follow of following) follow.following = true; //All results are artists that the user is following

    await t.commit();
    return res.json({
      type: 'success',
      payload: following
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getFollow = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No user id included in request.');
    if (req.params.id === req.session.artistId.toString()) throw new Error('You cannot follow yourself.');

    await db.query(`INSERT INTO follows ("followerId", "followingId", "createdAt", "updatedAt") VALUES (:artistId, :id, NOW(), NOW())`, {
      replacements: {
        artistId: req.session.artistId,
        id: req.params.id
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction: t });

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getUnfollow = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No user id included in request.');
    await db.query(`DELETE FROM follows WHERE "followerId" = :artistId AND "followingId" = :id`, {
      replacements: {
        artistId: req.session.artistId,
        id: req.params.id
      },
      type: Sequelize.QueryTypes.DELETE, transaction: t });

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postChangePassword = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');

    const payload = helpers.initialisePayload(req); //Initialise payload
    const artistId = await helpers.checkPassword({ pw: payload.old, artist: payload.sessionArtist }, t);
    const { hash, salt } = await helpers.generateHash(payload.new);

    await db.query(`UPDATE artists SET pw = :hash, salt = :salt WHERE id = :artistId`, {
      replacements: {
        hash,
        salt,
        artistId
      },
      type: Sequelize.QueryTypes.UPDATE,
      transaction: t }); //Add submission

    await req.session.destroy(); //Destroy session, forcing user to login again
    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postChangeLocation = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    const payload = initialisePayload(req); //Initialise payload
    if (!payload.location || typeof payload.location !== 'string') throw new Error ('No location included in request.');

    await db.query(`UPDATE artists SET location = :location WHERE id = :artistId`, {
      replacements: {
        location: payload.location,
        artistId: req.session.artistId
      },
      type: Sequelize.QueryTypes.UPDATE,
      transaction: t }); //Add submission

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const postChangeBio = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    const payload = initialisePayload(req); //Initialise payload
    if (!payload.bio || typeof payload.bio !== 'string') throw new Error ('No bio included in request.');

    await db.query(`UPDATE artists SET bio = :bio WHERE id = :artistId`, { //Add submission
      replacements: {
        bio: payload.bio,
        artistId: req.session.artistId
      },
      type: Sequelize.QueryTypes.UPDATE,
      transaction: t });

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const getLogout = async (req, res) => {
  try {
    await req.session.destroy();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err.message);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

module.exports = {
  postLogin,
  postRegister,
  postLatest,
  postFeed,
  getArtist,
  getSongRoute,
  getAlbumRoute,
  getFile,
  postUpload,
  postComment,
  postPinned,
  postSearch,
  postDelete,
  postFollowing,
  getFollow,
  getUnfollow,
  postChangePassword,
  postChangeLocation,
  postChangeBio,
  getLogout
}
