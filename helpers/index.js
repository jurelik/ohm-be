const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const db = require('./db');
const ipfs = require('./ipfs');

const getSong = async (id, t) => {
  try {
    //Get data
    const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, s.description, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.id = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
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
    const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(id) FROM files WHERE "songId" = :id) AS files, (SELECT COUNT(id) FROM comments WHERE "songId" = :id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.id = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    song[0].type = 'song'; //Append additional data to song

    return song[0];
  }
  catch (err) {
    console.error(err.message)
    throw err.message;
  }
}

const getSongsByCID = async (cids, t) => {
  try {
    //Parse array into string
    let formatted = formatWhereIn(cids);
    if (!formatted) return [];

    //Get data
    const songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(f.id) FROM files AS f WHERE "songId" = s.id) AS files, (SELECT COUNT(c.id) FROM comments AS c WHERE "songId" = s.id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.cid IN (:formatted) AND s."albumId" IS NULL ORDER BY s.id DESC`, {
      replacements: {
        formatted
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

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
        songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(f.id) FROM files AS f WHERE "songId" = s.id) AS files, (SELECT COUNT(c.id) FROM comments AS c WHERE "songId" = s.id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.title LIKE :searchQuery AND s."albumId" IS NULL ${payload.loadMore ? `AND s.id < :lastItemId` : ''} ORDER BY s.id DESC LIMIT 10`, {
          replacements: {
            searchQuery: `%${payload.searchQuery}%`,
            lastItemId: payload.lastItem ? payload.lastItem.id : null
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction: t });
        break;
      case 'tags':
        songs = await db.query(`SELECT s.id, s.title, a.name AS artist, s."albumId" AS "albumId", s.format, s.cid, s.tags, (SELECT COUNT(f.id) FROM files AS f WHERE "songId" = s.id) AS files, (SELECT COUNT(c.id) FROM comments AS c WHERE "songId" = s.id) AS comments, s."createdAt" FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE :searchQuery = ANY(s.tags) AND s."albumId" IS NULL ${payload.loadMore ? `AND s.id < :lastItemId` : ''} ORDER BY s.id DESC LIMIT 10`, {
          replacements: {
            searchQuery: payload.searchQuery,
            lastItemId: payload.lastItem ? payload.lastItem.id : null
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction: t });
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
    const files = await db.query(`SELECT id, type, "fileId" FROM files WHERE "songId" = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
    const a = [];

    for (let _file of files) {
      const file = await db.query(`SELECT f.id, f.name, a.name AS artist, :type AS type, f.format, f.license, f.cid, f.tags, f.info, f."createdAt" FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = ${_file.type === 'internal' ? ':fileId' : ':id'}`, {
        replacements: {
          type: _file.type,
          fileId: _file.fileId,
          id: _file.id
        },
        type: Sequelize.QueryTypes.SELECT,
        transaction: t });

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
        files = await db.query(`SELECT DISTINCT "songId" FROM files WHERE name LIKE :searchQuery AND "fileId" IS NULL ${payload.loadMore ? `AND "createdAt" < (SELECT "createdAt" FROM songs WHERE id = :lastItemId)` : ''} ORDER BY "songId" DESC LIMIT 10`, {
          replacements: {
            searchQuery: `%${payload.searchQuery}%`,
            lastItemId: payload.lastItem ? payload.lastItem.id : null
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction: t });
        break;
      case 'tags':
        files = await db.query(`SELECT DISTINCT "songId" FROM files WHERE :searchQuery = ANY(tags) AND "fileId" IS NULL ${payload.loadMore ? `AND "createdAt" < (SELECT "createdAt" FROM songs WHERE id = :lastItemId)` : ''} ORDER BY "songId" DESC LIMIT 10`, {
          replacements: {
            searchQuery: payload.searchQuery,
            lastItemId: payload.lastItem ? payload.lastItem.id : null
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction: t });
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
    const album = await db.query(`SELECT al.id, al.title, ar.name AS artist, al.cid, al.tags, al.description, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.id = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    //Get songs
    album[0].songs = [];
    const songs = await db.query(`SELECT id FROM songs WHERE "albumId" = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    for (let _song of songs) {
      let song = await getSongShallow(_song.id, t);
      album[0].songs.push(song);
    }

    album[0].type = 'album'; //Append additional data to album

    return album[0];
  }
  catch (err) {
    throw err.message;
  }
}

const getAlbumShallow = async (id, t) => {
  try {
    //Get album
    const album = await db.query(`SELECT al.id, al.title, ar.name AS artist, al.cid, al.tags, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.id = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    //Get songs
    album[0].songs = [];
    const songs = await db.query(`SELECT id FROM songs WHERE "albumId" = :id`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    for (let _song of songs) {
      let song = await getSongShallow(_song.id, t);
      album[0].songs.push(song);
    }

    album[0].type = 'album'; //Append additional data to album

    return album[0];
  }
  catch (err) {
    throw err.message;
  }
}

const getAlbumsByCID = async (cids, t) => {
  try {
    let formatted = formatWhereIn(cids);
    if (!formatted) return [];

    //Get album
    const albums = await db.query(`SELECT al.id, al.title, ar.name AS artist, al.cid, al.tags, (SELECT COUNT(s.id) FROM songs AS s WHERE "albumId" = al.id) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.cid IN (:formatted) ORDER BY al.id DESC`, {
      replacements: {
        formatted
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    for (let album of albums) album.type = 'album'; //Append additional data to album
    return albums;
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
        albums = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags, (SELECT COUNT(s.id) FROM songs AS s WHERE "albumId" = al.id) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.title LIKE :searchQuery ${payload.loadMore ? `AND al.id < :lastItemId` : ''} ORDER BY al.id DESC LIMIT 10`, {
          replacements: {
            searchQuery: `%${payload.searchQuery}%`,
            lastItemId: payload.lastItem ? payload.lastItem.id : null
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction: t });
        break;
      case 'tags':
        albums = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags, (SELECT COUNT(s.id) FROM songs AS s WHERE "albumId" = al.id) AS songs, al."createdAt" FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE :searchQuery = ANY(al.tags) ${payload.loadMore ? `AND al.id < :lastItemId` : ''} ORDER BY al.id DESC LIMIT 10`, {
          replacements: {
            searchQuery: payload.searchQuery,
            lastItemId: payload.lastItem ? payload.lastItem.id : null
          },
          type: Sequelize.QueryTypes.SELECT, transaction: t });
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

const getArtistsBySearch = async (payload, t) => {
  try {
    if (payload.loadMore && !payload.lastItem) throw new Error('Last item reached.'); //If user clicks load more with nothing loaded on initial search
    const artists = await db.query(`SELECT id, name, location FROM artists WHERE name LIKE :searchQuery${payload.loadMore ? ` AND id < :lastItemId` : ''} ORDER BY id DESC LIMIT 10`, {
      replacements: {
        searchQuery: `%${payload.searchQuery}%`,
        lastItemId: payload.lastItem ? payload.lastItem.id : null
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });

    if (payload.loadMore && artists.length === 0) throw new Error('Last item reached.');

    for (let artist of artists) {
      //Check if user is following the artist
      const following = await db.query(`SELECT id FROM follows WHERE "followerId" = :sessionArtistId AND "followingId" = :artistId`, {
        replacements: {
          sessionArtistId: payload.artistId,
          artistId: artist.id
        },
        type: Sequelize.QueryTypes.SELECT,
        transaction: t });

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

const addAlbum = async (payload, t) => {
  if (!allowedFormat(payload.album.title)) throw new Error('Album title can only include letters, numbers and underscores.'); //Check for bad characters in title
  const formattedTags = formatTags(payload.album.tags); //Format and trim tags

  let album = await db.query(`INSERT INTO albums (title, cid, tags, description, "artistId", "createdAt", "updatedAt") VALUES (:title, :cid, ARRAY [:formattedTags], :description, :artistId, NOW(), NOW()) RETURNING id`, {
    replacements: {
      title: payload.album.title,
      cid: payload.album.cid,
      formattedTags,
      description: payload.album.description,
      artistId: payload.artistId
    },
    type: Sequelize.QueryTypes.INSERT,
    transaction: t });
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
    if (!allowedFormat(data.song.title)) throw new Error('Song title can only include letters, numbers and underscores.'); //Check for bad characters in title

    const formattedTags = formatTags(data.song.tags); //Format and trim tags
    let song;

    if (data.albumId) song = await db.query(`INSERT INTO songs (title, format, cid, tags, description, "albumId", "artistId", "createdAt", "updatedAt") VALUES (:title, :format, :cid, ARRAY [:tags], :description, :albumId, :artistId, NOW(), NOW()) RETURNING id`, {
      replacements: {
        title: data.song.title,
        format: data.song.format,
        cid: data.song.cid,
        tags: formattedTags,
        description: data.song.description,
        albumId: data.albumId,
        artistId: data.artistId
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction: t });
    else song = await db.query(`INSERT INTO songs (title, format, cid, tags, description, "artistId", "createdAt", "updatedAt") VALUES (:title, :format, :cid, ARRAY [:tags], :description, :artistId, NOW(), NOW()) RETURNING id`, {
      replacements: {
        title: data.song.title,
        format: data.song.format,
        cid: data.song.cid,
        tags: formattedTags,
        description: data.song.description,
        artistId: data.artistId
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction: t });
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
    if (data.file.type !== 'internal') {
      //Check for wrong license combinations
      if ((data.file.license.includes('NC') || data.file.license.includes('SA') || data.file.license.includes('ND')) && !data.file.license.includes('BY')) throw new Error('Cannot use NC/SA/ND license without also using BY.');
      if (data.file.license.includes('SA') && data.file.license.includes('ND')) throw new Error('Cannot use both SA & ND license at the same time.');
      if (!allowedFormat(data.file.name)) throw new Error('File name can only include letters, numbers and underscores.'); //Check for bad characters in title
    }

    if (data.file.type === 'internal') {
      const original = await db.query(`SELECT a.id AS "artistId" FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE f.id = :id`, {
        replacements: {
          id: data.file.id
        },
        type: Sequelize.QueryTypes.SELECT,
        transaction: t });
      await db.query(`INSERT INTO files (type, "songId", "artistId", "fileId", "createdAt", "updatedAt") VALUES ('internal', :songId, :artistId, :id, NOW(), NOW())`, {
        replacements: {
          songId: data.songId,
          artistId: original[0].artistId,
          id: data.file.id
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction: t });
    }
    else {
      const formattedTags = formatTags(data.file.tags); //Format and trim tags
      const formattedLicense = formatLicense(data.file.license); //Format and trim license

      await db.query(`INSERT INTO files (name, type, format, license, cid, tags, info, "songId", "artistId", "createdAt", "updatedAt") VALUES (:name, :type, :format, ARRAY [:formattedLicense]::varchar[], :cid, ARRAY [:formattedTags], ${data.file.info ? ':info' : 'NULL'}, :songId, :artistId, NOW(), NOW())`, {
        replacements: {
          name: data.file.name,
          type: data.file.type,
          format: data.file.format,
          formattedLicense,
          cid: data.file.cid,
          formattedTags,
          info: data.file.info,
          songId: data.songId,
          artistId: data.artistId
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction: t });
    }
  }
  catch (err) {
    throw err;
  }
}

const getComments = async (id, t) => {
  try {
    const comments = await db.query(`SELECT c.id, c.content, a.name AS artist FROM comments AS c JOIN artists AS a ON a.id = c."artistId" WHERE "songId" = :id ORDER BY c.id DESC`, {
      replacements: {
        id
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
    return comments;
  }
  catch (err) {
    throw err;
  }
}

const addComment = async (payload, t) => {
  try {
    await db.query(`INSERT INTO comments (content, "artistId", "songId", "createdAt", "updatedAt") VALUES (:content, :artistId, :songId, NOW(), NOW())`, {
      replacements: {
        content: payload.content,
        artistId: payload.artistId,
        songId: payload.songId
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction: t });
  }
  catch (err) {
    throw err;
  }
}

const deleteSong = async (payload, t) => {
  try {
    if (payload.sessionArtist !== payload.artist) throw new Error('Permission denied.');
    const deleted = await db.query(`DELETE FROM songs WHERE id = :id AND "albumId" IS NULL RETURNING id`, {
      replacements: {
        id: payload.id
      },
      type: Sequelize.QueryTypes.DELETE,
      transaction: t });
    if (deleted.length === 0) throw new Error('Cannot delete this song.');
  }
  catch (err) {
    throw err;
  }
}

const deleteAlbum = async (payload, t) => {
  try {
    if (payload.sessionArtist !== payload.artist) throw new Error('Permission denied.');
    const deleted = await db.query(`DELETE FROM albums WHERE id = :id RETURNING id`, {
      replacements: {
        id: payload.id
      },
      type: Sequelize.QueryTypes.DELETE,
      transaction: t });
    if (deleted.length === 0) throw new Error('Cannot delete this album.');
  }
  catch (err) {
    throw err;
  }
}

const formatTags = (tags) => {
  if (tags.length === 0) throw new Error ('Tags are missing.');
  const filtered = [];

  for (let tag of tags) {
    const trimmed = tag.trim();

    if (trimmed === '') continue;
    if (!allowedFormat(trimmed)) throw new Error ('Tags can only contain letters, numbers and underscores.')
    filtered.push(trimmed);
  }

  if (filtered.length === 0) throw new Error ('Tags are missing.');
  return filtered;
}

const formatLicense = (license) => {
  return license.map(x => x.trim());
}

const formatWhereIn = (array) => {
  if (array.length === 0) return false;

  return array.map(item => item.trim());
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

const initialisePayload = (req) => {
  const payload = req.body;
  payload.artistId = req.session.artistId || null;
  payload.sessionArtist = req.session.artist || null;
  return payload;
}

const checkPassword = async (payload, t) => {
  try {
    const artist = await db.query(`SELECT id, pw, salt FROM artists WHERE name = :artist`, {
      replacements: {
        artist: payload.artist
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction: t });
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
      console.error(err.message);
      uploadTimeout(data, progress);
    }
  }, 1000)
}

const allowedFormat = (string) => {
  if (string.length === 0) return false;

  const regex = /^[\w ]+$/;
  return regex.test(string);
}

module.exports = {
  getSong,
  getSongShallow,
  getSongsByCID,
  getSongsBySearch,
  getFiles,
  getFilesBySearch,
  getAlbum,
  getAlbumShallow,
  getAlbumsByCID,
  getAlbumsBySearch,
  getArtistsBySearch,
  addAlbum,
  addSong,
  addFile,
  getComments,
  addComment,
  deleteSong,
  deleteAlbum,
  formatTags,
  formatLicense,
  formatWhereIn,
  generateHash,
  initialisePayload,
  checkPassword,
  removePin,
  uploadTimeout,
  allowedFormat
}
