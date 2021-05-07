const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const db = require('../db');
const models = require('../models');
const createClient = require('ipfs-http-client');
const ipfs = createClient();

const initDB = () => {
  models.sequelize.sync().then(async () => {
    const t = await db.transaction();

    try {
      const { hash, salt } = await generateHash('test');
      await db.query(`INSERT INTO artists (name, bio, location, pw, salt, "createdAt", "updatedAt") VALUES ('test1', 'hello world', 'earth','${hash}', '${salt}', NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO artists (name, bio, location, pw, salt, "createdAt", "updatedAt") VALUES ('test2', 'hello world', 'earth','${hash}', '${salt}', NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      ////Song
      //await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('comp357', 'mp3', 'QmU1B9JdMvhm4EB8kj487GfwQzfVtocKCm9XNAHkUtHz4f', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO submissions (type, "artistId", "songId",  "createdAt", "updatedAt") VALUES ('song', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO files (name, type, "fileType", cid, tags, "songId", "artistId", "createdAt", "updatedAt") VALUES ('snare', 'original', 'wav', 'QmTp7eeKm1ymt6SZD3SPMD3mKkAFomE8x5xtJhqK48a8qy', ARRAY ['snare', 'lofi'], 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO comments (content, "artistId", "songId", "createdAt", "updatedAt") VALUES ('this is a comment', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

      ////Album
      //await db.query(`INSERT INTO albums (title, cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('test album', 'Qme1T1BJ1JVvNi85dEKiMWay1WzMDQjQibvjPSvzPB5pia', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('comp360', 'mp3', 'QmTaYbC9V42pVXj6jWzwR4frqEgjttYW3HPczFbSosnQP9', ARRAY ['lofi', 'hiphop'], 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

      //await db.query(`INSERT INTO albums (title, cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('test album 2', 'Qme1T1BJ1JVvNi85dEKiMWay1WzMDQjQibvjPSvzPB5pia', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', 1, 2, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('snare', 'wav', 'QmTp7eeKm1ymt6SZD3SPMD3mKkAFomE8x5xtJhqK48a8qy', ARRAY ['lofi', 'hiphop'], 2, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('test', 'mp3', 'QmRcBg5fRfb443nCbZG9KW2RkBhvaX3riRkPwQ1CEmhoNC', ARRAY ['lofi', 'hiphop'], 2, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

      await t.commit();
    }
    catch (err) {
      await t.rollback();
      throw err;
    }
  }).catch(err => {
    console.error(err);
  });
}

//Helpers
const getSong = async (id, t) => {
  try {
    //Get data
    const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s.format, s.cid, s.tags FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    const files = await getFiles(id, t);
    const comments = await db.query(`SELECT c.id, c.content, a.name AS artist FROM comments AS c JOIN artists AS a ON a.id = c."artistId" WHERE "songId" = ${id} ORDER BY c.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    //Append additional data to song
    song[0].type = 'song';
    song[0].files = files;
    song[0].comments = comments;

    return song[0];
  }
  catch (err) {
    throw err.message;
  }
}

const getSongsByCID = async (cids, t) => {
  try {
    //Parse array into string
    let parsed = stringifyWhereIn(cids);
    if (!parsed) return [];

    //Get data
    const songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s.format, s.cid, s.tags FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.cid IN (${parsed}) AND s."albumId" IS NULL ORDER BY s.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let song of songs) {
      const files = await getFiles(song.id, t);
      const comments = await db.query(`SELECT c.id, c.content, a.name AS artist FROM comments AS c JOIN artists AS a ON a.id = c."artistId" WHERE "songId" = ${song.id} ORDER BY c.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

      //Append additional data to song
      song.type = 'song';
      song.files = files;
      song.comments = comments;
    }

    return songs;
  }
  catch (err) {
    throw err.message;
  }
}

const getFiles = async (id, t) => {
  try {
    const files = await db.query(`SELECT id, type, "fileId" FROM files WHERE "songId" = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    const a = [];

    for (let _file of files) {
      const file = await db.query(`SELECT f.id, f.name, a.name AS artist, '${_file.type}' AS type, f.format, f.cid, f.tags, f.info FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = ${_file.type === 'internal' ? _file.fileId : _file.id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

      a.push(file[0]);
    }

    return a;
  }
  catch (err) {
    throw err;
  }
}

const getAlbum = async (id, t) => {
  try {
    //Get album
    const album = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags, al.description FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    //Get songs
    album[0].songs = [];
    const songs = await db.query(`SELECT id FROM songs WHERE "albumId" = '${id}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let _song of songs) {
      let song = await getSong(_song.id, t);
      album[0].songs.push(song);
    }

    //Append additional data to album
    album[0].type = 'album';

    return album[0];
  }
  catch (err) {
    throw err.message;
  }
}

const getAlbumsByArtistAndTitle = async (payload, t) => {
  try {
    //Parse array into string
    let parsed = stringifyWhereInAlbum(payload);
    if (!parsed) return [];

    //Get album
    const albums = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags, al.description FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE (ar.name, al.title) IN (${parsed}) ORDER BY al.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    //Get songs
    for (let album of albums) {
      album.songs = [];
      const songs = await db.query(`SELECT id FROM songs WHERE "albumId" = '${album.id}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

      for (let _song of songs) {
        let song = await getSong(_song.id, t);
        album.songs.push(song);
      }

      //Append additional data to album
      album.type = 'album';
    }

    return albums;
  }
  catch (err) {
    throw err.message;
  }
}

const addAlbum = async (payload, t) => {
  //Convert tags into a string for postgres
  let stringifiedTags = stringifyTags(payload.album.tags);

  let album = await db.query(`INSERT INTO albums (title, cid, tags, description, "artistId", "createdAt", "updatedAt") VALUES ('${payload.album.title}', '${payload.album.cid}', ARRAY [${stringifiedTags}], '${payload.album.description}', ${payload.artistId}, NOW(), NOW()) RETURNING id`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
  let albumId = album[0][0].id;

  //Add songs
  for (let _song of payload.songs) {
    await addSong({ song: _song, albumId, artistId: payload.artistId }, t); //Add song
  }

  return albumId;
}

const addSong = async (data, t) => {
  try {
    if (data.song.format !== 'mp3') throw new Error('Song files must be mp3 only.'); //Only allow mp3s as original song files

    //Convert tags into a string for postgres
    const stringifiedTags = stringifyTags(data.song.tags);
    let song;

    if (data.albumId) song = await db.query(`INSERT INTO songs (title, format, cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('${data.song.title}', '${data.song.format}', '${data.song.cid}', ARRAY [${stringifiedTags}], ${data.albumId}, ${data.artistId}, NOW(), NOW()) RETURNING id`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
    else song = await db.query(`INSERT INTO songs (title, format, cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('${data.song.title}', '${data.song.format}', '${data.song.cid}', ARRAY [${stringifiedTags}], ${data.artistId}, NOW(), NOW()) RETURNING id`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
    let songId = song[0][0].id;

    //Add files
    for (let file of data.song.files) {
      await addFile({ file, songId, artistId: data.artistId }, t);
    }

    return songId;
  }
  catch (err) {
    throw err;
  }
}

const addFile = async (data, t) => {
  try {
    //Convert tags into a string for postgres
    let stringifiedTags = stringifyTags(data.file.tags);

    if (data.file.type === 'internal') {
      const original = await db.query(`SELECT a.id AS "artistId" FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = ${data.file.id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
      await db.query(`INSERT INTO files (type, "songId", "artistId", "fileId", "createdAt", "updatedAt") VALUES ('internal', ${data.songId}, ${original[0].artistId}, ${data.file.id}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
    }
    else await db.query(`INSERT INTO files (name, type, format, cid, tags, info, "songId", "artistId", "createdAt", "updatedAt") VALUES ('${data.file.name}', '${data.file.type}', '${data.file.format}', '${data.file.cid}', ARRAY [${stringifiedTags}], ${data.file.info ? `'${data.file.info}'` : 'NULL'}, ${data.songId}, ${data.artistId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
  }
  catch (err) {
    throw err;
  }
}

const addComment = async (payload, t) => {
  try {
    await db.query(`INSERT INTO comments (content, "artistId", "songId", "createdAt", "updatedAt") VALUES ('${payload.content}', ${payload.artistId}, ${payload.songId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
  }
  catch (err) {
    throw err;
  }
}

const deleteSong = async (payload, t) => {
  try {
    if (payload.sessionArtist !== payload.artist) throw new Error('Permission denied.');
    const deleted = await db.query(`DELETE FROM songs WHERE id = ${payload.id} AND "albumId" IS NULL RETURNING id`, { type: Sequelize.QueryTypes.DELETE, transaction: t });
    if (deleted.length === 0) throw new Error('Cannot delete this song.');
  }
  catch (err) {
    throw err;
  }
}

const deleteAlbum = async (payload, t) => {
  try {
    if (payload.sessionArtist !== payload.artist) throw new Error('Permission denied.');
    const deleted = await db.query(`DELETE FROM albums WHERE id = ${payload.id} RETURNING id`, { type: Sequelize.QueryTypes.DELETE, transaction: t });
    if (deleted.length === 0) throw new Error('Cannot delete this album.');
  }
  catch (err) {
    throw err;
  }
}

//Convert tags into a string for postgres
const stringifyTags = (tags) => {
  return tags.split(/[,;]+/).map(tag => {
    tag.trim();
    return `'${tag}'`;
  }).join(", ");
}

//Parse array into string
const stringifyWhereIn = (array) => {
  if (array.length === 0) return false;

  return array.map(item => {
    item.trim();
    return `'${item}'`;
  }).join(', ');
}

//Parse array of objects into string
const stringifyWhereInAlbum = (array) => {
  if (array.length === 0) return false;

  return array.map(item => {
    return `('${item.artist}', '${item.title}')`;
  }).join(', ');
}

const generateHash = (pw, salt) => {
  return new Promise((resolve, reject) => {
    const _salt = salt || crypto.randomBytes(24).toString('base64');

    crypto.pbkdf2(pw, _salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);

      const hash = derivedKey.toString('base64');
      resolve({ hash, salt: _salt });
    });
  });
}

const userAuthenticated = (req, res) => {
  if (!req.session.authenticated) {
    res.json({
      type: 'error',
      err: 'User not authenticated'
    });
    return false;
  }
  return true;
}

const initialisePayload = (req) => {
  const payload = req.body;
  payload.artistId = req.session.artistId || null;
  payload.sessionArtist = req.session.artist || null;
  return payload;
}

const checkPassword = async (payload, t) => {
  try {
    const artist = await db.query(`SELECT id, pw, salt FROM artists WHERE name = '${payload.artist}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    if (artist.length === 0) throw new Error('Artist not found.');

    const { hash } = await generateHash(payload.pw, artist[0].salt) //Check password
    if (hash !== artist[0].pw) throw new Error('Wrong password.');

    return artist[0].id;
  }
  catch (err) {
    throw err;
  }
}

const removePin = async (cid) => {
  try {
    for await (const pin of ipfs.pin.ls({ type: 'recursive' })) {
      if(pin.cid.string === cid) await ipfs.pin.rm(pin.cid, { recursive: true }); //Remove pin from IPFS
    }
  }
  catch (err) {
    return; //Ignore as this means that the file is no longer pinned already
  }
}

const uploadInterval = (res, cid) => {
  return setInterval(async () => {
    try {
      const stat = await ipfs.files.stat(`/ipfs/${cid}`, { withLocal: true, timeout: 2000 });
      const percentage = Math.round(stat.sizeLocal / stat.cumulativeSize * 100);
      res.write(`${percentage}`);
    }
    catch (err) {
      res.write(err.message);
    }
  }, 1000)
}

//Route handlers
const postLogin = async (req, res) => {
  if (req.session.authenticated) { //Check if session is already established
    return res.json({
      type: 'success',
      session: req.session
    });
  }

  const payload = req.body;
  const t = await db.transaction();

  try {
    if (!req.body || Object.keys(req.body).length === 0) throw new Error('No running session found, please login.') //If no session is established, req.body is required

    if (payload.artist && payload.pw) {
      const artistId = await checkPassword(payload, t);

      //Append data to session and include cookie in response
      req.session.authenticated = true;
      req.session.artist = payload.artist;
      req.session.artistId = artistId;

      await t.commit();
      return res.json({
        type: 'success',
        session: req.session
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

const getLatest = async (req, res) => {
  const t = await db.transaction();

  try {
    const a = [];
    const submissions = await db.query(`SELECT "songId", "albumId" FROM submissions ORDER BY "createdAt" DESC LIMIT 10`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let submission of submissions) {
      if (submission.songId) {
        //Get song
        const song = await getSong(submission.songId, t);
        a.push(song);
      }
      else if (submission.albumId) {
        //Get album
        const album = await getAlbum(submission.albumId, t);
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

const getFeed = async (req, res) => {
  const t = await db.transaction();

  try {
    const a = [];
    const submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE "artistId" IN (SELECT "followingId" FROM follows WHERE "followerId" = ${req.session.artistId}) OR "artistId" = ${req.session.artistId} ORDER BY "createdAt" DESC LIMIT 10`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (submissions.length > 0) {
      for (let submission of submissions) {
        if (submission.songId) {
          //Get song
          const song = await getSong(submission.songId, t);
          a.push(song);
        }
        else if (submission.albumId) {
          //Get album
          const album = await getAlbum(submission.albumId, t);
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

    const artist = await db.query(`SELECT id, name, bio, location FROM artists WHERE name = '${req.params.name}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    if (artist.length === 0) throw 'Artist not found';

    artist[0].albums = [];
    artist[0].songs = [];

    //Get albums
    const albums = await db.query(`SELECT id FROM albums WHERE "artistId" = '${artist[0].id}' ORDER BY id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t })

    for (let _album of albums) {
      let album = await getAlbum(_album.id, t);
      artist[0].albums.push(album);
    }

    //Get songs
    const songs = await db.query(`SELECT id FROM songs WHERE "artistId" = '${artist[0].id}' AND "albumId" IS NULL ORDER BY id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let _song of songs) {
      let song = await getSong(_song.id, t);
      artist[0].songs.push(song);
    }

    //Check if user is following the artist
    const following = await db.query(`SELECT id FROM follows WHERE "followerId" = ${req.session.artistId} AND "followingId" = ${artist[0].id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
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
    console.error(err);
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
    let song = await getSong(req.params.id, t);

    await t.commit();
    return res.json({
      type: 'success',
      payload: song
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

const uploadTimeout = (res, cid, timeout) => {
  return setTimeout(async () => {
    try {
      const stat = await ipfs.files.stat(`/ipfs/${cid}`, { withLocal: true, timeout: 2000 });
      const percentage = Math.round(stat.sizeLocal / stat.cumulativeSize * 100);
      res.write(`${percentage}`);
      timeout = uploadTimeout(res, cid);
    }
    catch (err) {
      console.log(err.message)
      timeout = uploadTimeout(res, cid);
    }
  }, 1000);
}

const postUpload = async (req, res) => {
  const t = await db.transaction();
  let interval;

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');

    const payload = initialisePayload(req); //Initialise payload object
    const cid = payload.album ? payload.album.cid : payload.songs[0].cid;

    if (!payload.artistId) throw new Error('Session is missing artist data. Try to login again.'); //Check for missing data

    process.env.NODE_ENV === 'production' ? await ipfs.swarm.connect(payload.multiaddr) : null; //Try to init connection to node

    if (payload.album) {
      const albumId = await addAlbum(payload, t); //Add album
      await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', ${payload.artistId}, ${albumId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t }); //Add submission
    }
    else {
      const songId = await addSong({ song: payload.songs[0], artistId: payload.artistId }, t); //Add song
      await db.query(`INSERT INTO submissions (type, "artistId", "songId",  "createdAt", "updatedAt") VALUES ('song', ${payload.artistId}, ${songId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t }); //Add submission
    }

    interval = uploadInterval(res, cid); //Send progress every second
    await ipfs.pin.add(`/ipfs/${cid}`);
    clearInterval(interval); //Stop sending progress

    await t.commit();
    return res.end(JSON.stringify({
      type: 'success'
    }));
  }
  catch (err) {
    await t.rollback();
    clearInterval(interval);
    console.error(err);
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

    const payload = initialisePayload(req); //Initialise payload
    if (!payload.songId || !payload.content) throw new Error('Payload is missing data'); //Check for missing data
    if (!payload.artistId) throw new Error('Session is missing artist data. Try to login again.'); //Check for missing data

    await addComment(payload, t);

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
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

    const payload = initialisePayload(req); //Initialise payload
    const albums = await getAlbumsByArtistAndTitle(payload.albums, t);
    const songs = await getSongsByCID(payload.songs, t);

    await t.commit();
    return res.json({
      type: 'success',
      payload: {
        albums,
        songs
      }
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
    return res.json({
      type: 'error',
      err
    });
  }
}

const postDelete = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');

    const payload = initialisePayload(req); //Initialise payload
    await removePin(payload.cid);
    payload.type === 'song' ? await deleteSong(payload, t) : await deleteAlbum(payload, t); //Delete song or album

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
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

    await db.query(`INSERT INTO follows ("followerId", "followingId", "createdAt", "updatedAt") VALUES (${req.session.artistId}, ${req.params.id}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
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
    await db.query(`DELETE FROM follows WHERE "followerId" = ${req.session.artistId} AND "followingId" = ${req.params.id}`, { type: Sequelize.QueryTypes.DELETE, transaction: t });

    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
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

    const payload = initialisePayload(req); //Initialise payload
    const artistId = await checkPassword({ pw: payload.old, artist: payload.sessionArtist }, t);
    const { hash, salt } = await generateHash(payload.new);

    await db.query(`UPDATE artists SET pw = '${hash}', salt = '${salt}' WHERE id = ${artistId}`, { type: Sequelize.QueryTypes.UPDATE, transaction: t }); //Add submission

    await req.session.destroy(); //Destroy session, forcing user to login again
    await t.commit();
    return res.json({
      type: 'success'
    });
  }
  catch (err) {
    await t.rollback();
    console.error(err);
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
    console.error(err);
    return res.json({
      type: 'error',
      err: err.message
    });
  }
}

module.exports = {
  initDB,
  userAuthenticated,
  postLogin,
  getLatest,
  getFeed,
  getArtist,
  getSongRoute,
  postUpload,
  postComment,
  postPinned,
  postDelete,
  getFollow,
  getUnfollow,
  postChangePassword,
  getLogout
}
