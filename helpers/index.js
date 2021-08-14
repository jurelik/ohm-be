const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const db = require('./db');
const { create } = require('ipfs-http-client');
const ipfs = create();
const currentlyUploading = []; //Keep track of clients currently uploading to prevent double uploads.

//Helpers
const getSong = async (id, t) => {
  try {
    //Get data
    const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, s.description, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    const files = await getFiles(id, t);
    const comments = await getComments(id, t);

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

const getSongShallow = async (id, t) => {
  try {
    //Get data
    const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(id) FROM files WHERE "songId" = ${id}) AS files, (SELECT COUNT(id) FROM comments WHERE "songId" = ${id}) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    song[0].type = 'song'; //Append additional data to song

    return song[0];
  }
  catch (err) {
    console.log(err)
    throw err.message;
  }
}

const getSongsByCID = async (cids, t) => {
  try {
    //Parse array into string
    let parsed = stringifyWhereIn(cids);
    if (!parsed) return [];

    //Get data
    const songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(f.id) FROM files AS f WHERE "songId" = s.id) AS files, (SELECT COUNT(c.id) FROM comments AS c WHERE "songId" = s.id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.cid IN (${parsed}) AND s."albumId" IS NULL ORDER BY s.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let song of songs) song.type = 'song'; //Append additional data to song
    return songs;
  }
  catch (err) {
    throw err.message;
  }
}

const getSongsBySearch = async (payload, t) => {
  try {
    let songs;
    if (payload.loadMore && !payload.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    switch (payload.searchBy) {
      case 'title':
        songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(f.id) FROM files AS f WHERE "songId" = s.id) AS files, (SELECT COUNT(c.id) FROM comments AS c WHERE "songId" = s.id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.title LIKE '%${payload.searchQuery}%' AND s."albumId" IS NULL ${payload.loadMore ? `AND s.id <${payload.lastItem.id}` : ''} ORDER BY s.id DESC LIMIT 1`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        break;
      case 'tags':
        songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(f.id) FROM files AS f WHERE "songId" = s.id) AS files, (SELECT COUNT(c.id) FROM comments AS c WHERE "songId" = s.id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE '${payload.searchQuery}' = ANY(s.tags) AND s."albumId" IS NULL ${payload.loadMore ? `AND s.id < ${payload.lastItem.id}` : ''} ORDER BY s.id DESC LIMIT 1`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        break;
      default:
        throw new Error('searchBy value not provided.');
    }

    if (payload.loadMore && songs.length === 0) throw new Error('Last item reached.');

    for (let song of songs) song.type = 'song'; //Append additional data to song
    return songs;
  }
  catch (err) {
    throw err;
  }
}

const getFiles = async (id, t) => {
  try {
    const files = await db.query(`SELECT id, type, "fileId" FROM files WHERE "songId" = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    const a = [];

    for (let _file of files) {
      const file = await db.query(`SELECT f.id, f.name, a.name AS artist, '${_file.type}' AS type, f.format, f.license, f.cid, f.tags, f.info, f."createdAt" FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = ${_file.type === 'internal' ? _file.fileId : _file.id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

      a.push(file[0]);
    }

    return a;
  }
  catch (err) {
    throw err;
  }
}

const getFilesBySearch = async (payload, t) => {
  try {
    if (payload.loadMore && !payload.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search
    let songs = [];
    let files;

    switch (payload.searchBy) {
      case 'title':
        files = await db.query(`SELECT DISTINCT "songId" FROM files WHERE name LIKE '%${payload.searchQuery}%' AND "fileId" IS NULL ${payload.loadMore ? `AND "createdAt" < (SELECT "createdAt" FROM songs WHERE id = ${payload.lastItem.id})` : ''} ORDER BY "songId" DESC LIMIT 2`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        break;
      case 'tags':
        files = await db.query(`SELECT DISTINCT "songId" FROM files WHERE '${payload.searchQuery}' = ANY(tags) AND "fileId" IS NULL ${payload.loadMore ? `AND "createdAt" < (SELECT "createdAt" FROM songs WHERE id = ${payload.lastItem.id})` : ''} ORDER BY "songId" DESC LIMIT 2`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        break;
      default:
        throw new Error('searchBy value not provided.');
    }

    if (payload.loadMore && files.length === 0) throw new Error('Last item reached.');

    for (let file of files) {
      let song = await getSong(file.songId, t);
      songs.push(song);
    }

    return songs;
  }
  catch (err) {
    throw err;
  }
}

const getAlbum = async (id, t) => {
  try {
    //Get album
    const album = await db.query(`SELECT al.id, al.title, ar.name AS artist, al.cid, al.tags, al.description, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    //Get songs
    album[0].songs = [];
    const songs = await db.query(`SELECT id FROM songs WHERE "albumId" = '${id}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let _song of songs) {
      let song = await getSongShallow(_song.id, t);
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

const getAlbumShallow = async (id, t) => {
  try {
    //Get album
    const album = await db.query(`SELECT al.id, al.title, ar.name AS artist, al.cid, al.tags, (SELECT COUNT(id) FROM songs WHERE "albumId" = ${id}) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    album[0].type = 'album'; //Append additional data to album

    return album[0];
  }
  catch (err) {
    throw err.message;
  }
}

const getAlbumsBySearch = async (payload, t) => {
  try {
    if (payload.loadMore && !payload.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search
    let albums;

    //Get albums
    switch (payload.searchBy) {
      case 'title':
        albums = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags, (SELECT COUNT(s.id) FROM songs AS s WHERE "albumId" = al.id) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.title LIKE '%${payload.searchQuery}%' ${payload.loadMore ? `AND al.id < ${payload.lastItem.id}` : ''} ORDER BY al.id DESC LIMIT 1`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        break;
      case 'tags':
        albums = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags, (SELECT COUNT(s.id) FROM songs AS s WHERE "albumId" = al.id) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE '${payload.searchQuery}' = ANY(al.tags) ${payload.loadMore ? `AND al.id < ${payload.lastItem.id}` : ''} ORDER BY al.id DESC LIMIT 1`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        break;
      default:
        throw new Error('searchBy value not provided.');
    }

    if (payload.loadMore && albums.length === 0) throw new Error('Last item reached.');

    for (let album of albums) album.type = 'album'; //Append additional data to album
    return albums;
  }
  catch (err) {
    throw err;
  }
}

const getAlbumsByCID = async (cids, t) => {
  try {
    let parsed = stringifyWhereIn(cids);
    if (!parsed) return [];

    //Get album
    const albums = await db.query(`SELECT al.id, al.title, ar.name AS artist, al.cid, al.tags, (SELECT COUNT(s.id) FROM songs AS s WHERE "albumId" = al.id) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.cid IN (${parsed}) ORDER BY al.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let album of albums) album.type = 'album'; //Append additional data to album
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

    if (data.albumId) song = await db.query(`INSERT INTO songs (title, format, cid, tags, description, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('${data.song.title}', '${data.song.format}', '${data.song.cid}', ARRAY [${stringifiedTags}], '${data.song.description}', ${data.albumId}, ${data.artistId}, NOW(), NOW()) RETURNING id`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
    else song = await db.query(`INSERT INTO songs (title, format, cid, tags, description, "artistId", "createdAt", "updatedAt") VALUES ('${data.song.title}', '${data.song.format}', '${data.song.cid}', ARRAY [${stringifiedTags}], '${data.song.description}', ${data.artistId}, NOW(), NOW()) RETURNING id`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
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
    //Check for wrong license combinations
    if ((data.file.license.includes('NC') || data.file.license.includes('SA') || data.file.license.includes('ND')) && !data.file.license.includes('BY')) throw new Error('Cannot use NC/SA/ND license without also using BY.');
    if (data.file.license.includes('SA') && data.file.license.includes('ND')) throw new Error('Cannot use both SA & ND license at the same time.');

    //Convert tags into a string for postgres
    let stringifiedTags = stringifyTags(data.file.tags);
    let stringifiedLicense = stringifyLicense(data.file.license);

    if (data.file.type === 'internal') {
      const original = await db.query(`SELECT a.id AS "artistId" FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = ${data.file.id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
      await db.query(`INSERT INTO files (type, "songId", "artistId", "fileId", "createdAt", "updatedAt") VALUES ('internal', ${data.songId}, ${original[0].artistId}, ${data.file.id}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
    }
    else await db.query(`INSERT INTO files (name, type, format, license, cid, tags, info, "songId", "artistId", "createdAt", "updatedAt") VALUES ('${data.file.name}', '${data.file.type}', '${data.file.format}', ARRAY [${stringifiedLicense}]::varchar[], '${data.file.cid}', ARRAY [${stringifiedTags}], ${data.file.info ? `'${data.file.info}'` : 'NULL'}, ${data.songId}, ${data.artistId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
  }
  catch (err) {
    throw err;
  }
}

const getComments = async (id, t) => {
  try {
    const comments = await db.query(`SELECT c.id, c.content, a.name AS artist FROM comments AS c JOIN artists AS a ON a.id = c."artistId" WHERE "songId" = ${id} ORDER BY c.id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    return comments;
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
  tags.split(/[,;]+/).reduce((acc, current) => {
    if (typeof acc === 'string') acc = [ `'${acc}'` ]; //Initialize accumulator
    const trimmed = current.trim();

    if (trimmed === '') return [ ...acc ]; //Ignore empty tags
    return [ ...acc, `'${trimmed}'` ];
  }).join(", ");
}

//Convert license into a string for postgres
const stringifyLicense = (license) => {
  return license.map(x => {
    x.trim();
    return `'${x}'`;
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
      if(pin.cid.toString() === cid) await ipfs.pin.rm(pin.cid, { recursive: true }); //Remove pin from IPFS
    }
  }
  catch (err) {
    return; //Ignore as this means that the file is no longer pinned already
  }
}

const uploadTimeout = (data, progress) => {
  setTimeout(async () => {
    try {
      if (progress.value === data.prevProgress) data.count++;
      else data.count = 0;

      if (data.count >= 30) return data.controller.abort('Timed out.');
      data.prevProgress = progress.value;

      //Get new progress
      const stat = await ipfs.files.stat(`/ipfs/${data.cid}`, { withLocal: true, timeout: 1000 });
      const percentage = Math.round(stat.sizeLocal / stat.cumulativeSize * 100);
      progress.value = percentage;
      data.res.write(`${percentage}`);
      uploadTimeout(data, progress);
    }
    catch (err) {
      console.log(err.message);
      uploadTimeout(data, progress);
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

const postRegister = async (req, res) => {
  const payload = req.body;
  const t = await db.transaction();

  try {
    if (!req.body || !req.body.artist || !req.body.pw || !req.body.secret) throw new Error('Artist name, password and secret need to be included in the request.') //Check if all data is included
    if (req.body.secret !== process.env.REGISTRATION_SECRET) throw new Error('Secret does not match.') //Check if secret matches the server secret

    const { hash, salt } = await generateHash(payload.pw);
    await db.query(`INSERT INTO artists (name, bio, location, pw, salt, "createdAt", "updatedAt") VALUES ('${payload.artist}', 'human', 'hydra forest','${hash}', '${salt}', NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

    await t.commit();
    return res.json({
      type: 'success'
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

const postLatest = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const a = [];
    let submissions;

    //Get submissions depending on loadMore attribute
    if (req.body.loadMore) submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE "createdAt" < (SELECT "createdAt" FROM submissions WHERE "${req.body.lastItem.type}Id" = ${req.body.lastItem.id}) ORDER BY "createdAt" DESC LIMIT 2`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    else submissions = await db.query(`SELECT "songId", "albumId" FROM submissions ORDER BY "createdAt" DESC LIMIT 2`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (submissions.length === 0 && req.body.loadMore) throw new Error('Last item reached.'); //Throw error if no more songs/albums can be loaded

    for (let submission of submissions) {
      if (submission.songId) {
        //Get song
        const song = await getSongShallow(submission.songId, t);
        a.push(song);
      }
      else if (submission.albumId) {
        //Get album
        const album = await getAlbumShallow(submission.albumId, t);
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
    if (req.body.loadMore) submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE ("artistId" IN (SELECT "followingId" FROM follows WHERE "followerId" = ${req.session.artistId}) OR "artistId" = ${req.session.artistId}) AND "createdAt" < (SELECT "createdAt" FROM submissions WHERE "${req.body.lastItem.type}Id" = ${req.body.lastItem.id}) ORDER BY "createdAt" DESC LIMIT 2`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    else submissions = await db.query(`SELECT "songId", "albumId" FROM submissions WHERE "artistId" IN (SELECT "followingId" FROM follows WHERE "followerId" = ${req.session.artistId}) OR "artistId" = ${req.session.artistId} ORDER BY "createdAt" DESC LIMIT 2`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (submissions.length === 0 && req.body.loadMore) throw new Error('Last item reached.'); //Throw error if no more songs/albums can be loaded

    if (submissions.length > 0) {
      for (let submission of submissions) {
        if (submission.songId) {
          //Get song
          const song = await getSongShallow(submission.songId, t);
          a.push(song);
        }
        else if (submission.albumId) {
          //Get album
          const album = await getAlbumShallow(submission.albumId, t);
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
      let album = await getAlbumShallow(_album.id, t);
      artist[0].albums.push(album);
    }

    //Get songs
    const songs = await db.query(`SELECT id FROM songs WHERE "artistId" = '${artist[0].id}' AND "albumId" IS NULL ORDER BY id DESC`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let _song of songs) {
      let song = await getSongShallow(_song.id, t);
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

const getArtistsBySearch = async (payload, t) => {
  try {
    if (payload.loadMore && !payload.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search
    const artists = await db.query(`SELECT id, name, location FROM artists WHERE name LIKE '%${payload.searchQuery}%' ${payload.loadMore ? `AND id < ${payload.lastItem.id}` : ''} ORDER BY id DESC LIMIT 1`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (payload.loadMore && artists.length === 0) throw new Error('Last item reached.');

    for (let artist of artists) {
      //Check if user is following the artist
      const following = await db.query(`SELECT id FROM follows WHERE "followerId" = ${payload.artistId} AND "followingId" = ${artist.id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

      if (following.length === 1) artist.following = true;
      else artist.following = false;

      artist.type = 'artist'; //Include type information
    }

    return artists;
  }
  catch (err) {
    throw err;
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

const getAlbumRoute = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No album id included in request.');
    let album = await getAlbum(req.params.id, t);

    await t.commit();
    return res.json({
      type: 'success',
      payload: album
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

const getFile = async (req, res) => {
  const t = await db.transaction();

  try {
    if (!req.params.id) throw new Error('No file id included in request.');
    const file = await db.query(`SELECT f.id, f.name, a.name AS artist, f.type, f.format, f.license, f.cid, f.tags, f.info FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = ${req.params.id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    await t.commit();
    return res.json({
      type: 'success',
      payload: file[0]
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

const postUpload = async (req, res) => {
  const t = await db.transaction();
  const controller = new AbortController();
  const progress = { value: 0 }; //Keep track of upload progress
  let uTimeout;
  let uploadStarted = false; //Keep track of whether or not upload has started

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (currentlyUploading.includes(req.session.artistId)) throw new Error('Please wait for the current upload to finish.');

    const payload = initialisePayload(req); //Initialise payload object
    const cid = payload.album ? payload.album.cid : payload.songs[0].cid;

    if (!payload.artistId) throw new Error('Session is missing artist data. Try to login again.'); //Check for missing data

    if (process.env.NODE_ENV === 'production') await ipfs.swarm.connect(payload.multiaddr, { timeout: 30000 }); //Try to init connection to node

    if (payload.album) {
      const albumId = await addAlbum(payload, t); //Add album
      await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', ${payload.artistId}, ${albumId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t }); //Add submission
    }
    else {
      const songId = await addSong({ song: payload.songs[0], artistId: payload.artistId }, t); //Add song
      await db.query(`INSERT INTO submissions (type, "artistId", "songId",  "createdAt", "updatedAt") VALUES ('song', ${payload.artistId}, ${songId}, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t }); //Add submission
    }

    uTimeout = uploadTimeout({ //Send progress every second
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
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const payload = initialisePayload(req); //Initialise payload
    const albums = await getAlbumsByCID(payload.albums, t);
    const songs = await getSongsByCID(payload.songs, t);
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
    console.error(err);
    return res.json({
      type: 'error',
      err
    });
  }
}

const postSearch = async (req, res) => {
  const t = await db.transaction();
  const _payload = initialisePayload(req);
  let payload;

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.searchQuery.length === 0) throw new Error('The search query is empty.');

    switch (req.body.searchCategory) {
      case 'songs':
        payload = await getSongsBySearch(_payload, t);
        break;
      case 'albums':
        payload = await getAlbumsBySearch(_payload, t);
        break;
      case 'artists':
        payload = await getArtistsBySearch(_payload, t);
        break;
      case 'files':
        payload = await getFilesBySearch(_payload, t);
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
    console.error(err);
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

const postFollowing = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    if (req.body.loadMore && !req.body.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search

    const payload = initialisePayload(req); //Initialise payload

    const following = await db.query(`SELECT a.id, a.name, a.location FROM follows AS f JOIN artists AS a ON a.id = f."followingId" WHERE f."followerId" = ${payload.artistId} ${payload.loadMore ? `AND f."createdAt" < (SELECT "createdAt" FROM follows WHERE "followingId" = ${payload.lastItem.id} AND "followerId" = ${payload.artistId})` : ''} ORDER BY f."createdAt" DESC LIMIT 1`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

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

const postChangeLocation = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    const payload = initialisePayload(req); //Initialise payload
    if (!payload.location || typeof payload.location !== 'string') throw new Error ('No location included in request.');

    await db.query(`UPDATE artists SET location = '${payload.location}' WHERE id = ${payload.artistId}`, { type: Sequelize.QueryTypes.UPDATE, transaction: t }); //Add submission

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

const postChangeBio = async (req, res) => {
  const t = await db.transaction();

  try {
    if (Object.keys(req.body).length === 0) throw new Error('No payload included in request.');
    const payload = initialisePayload(req); //Initialise payload
    if (!payload.bio || typeof payload.bio !== 'string') throw new Error ('No bio included in request.');

    await db.query(`UPDATE artists SET bio = '${payload.bio}' WHERE id = ${payload.artistId}`, { type: Sequelize.QueryTypes.UPDATE, transaction: t }); //Add submission

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
  userAuthenticated,
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
