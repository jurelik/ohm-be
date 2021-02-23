const { Sequelize } = require('sequelize');
const db = require('../db');
const models = require('../models');

const initDB = () => {
  models.sequelize.sync().then(async () => {
    const t = await db.transaction();

    try {
      await db.query(`INSERT INTO artists (name, bio, location,  "createdAt", "updatedAt") VALUES ('antik', 'hello world', 'earth', NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      //Song
      await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('comp357', 'mp3', 'QmU1B9JdMvhm4EB8kj487GfwQzfVtocKCm9XNAHkUtHz4f', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO submissions (type, "artistId", "songId",  "createdAt", "updatedAt") VALUES ('song', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO files (name, type, "fileType", cid, tags, "songId", "artistId", "createdAt", "updatedAt") VALUES ('snare', 'original', 'wav', 'QmTp7eeKm1ymt6SZD3SPMD3mKkAFomE8x5xtJhqK48a8qy', ARRAY ['snare', 'lofi'], 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO comments (content, "artistId", "songId", "createdAt", "updatedAt") VALUES ('this is a comment', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

      //Album
      await db.query(`INSERT INTO albums (title, cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('test album', 'Qme1T1BJ1JVvNi85dEKiMWay1WzMDQjQibvjPSvzPB5pia', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('comp360', 'mp3', 'QmTaYbC9V42pVXj6jWzwR4frqEgjttYW3HPczFbSosnQP9', ARRAY ['lofi', 'hiphop'], 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

      await db.query(`INSERT INTO albums (title, cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('test album 2', 'Qme1T1BJ1JVvNi85dEKiMWay1WzMDQjQibvjPSvzPB5pia', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO submissions (type, "artistId", "albumId",  "createdAt", "updatedAt") VALUES ('album', 1, 2, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('snare', 'wav', 'QmTp7eeKm1ymt6SZD3SPMD3mKkAFomE8x5xtJhqK48a8qy', ARRAY ['lofi', 'hiphop'], 2, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "albumId", "artistId", "createdAt", "updatedAt") VALUES ('test', 'mp3', 'QmRcBg5fRfb443nCbZG9KW2RkBhvaX3riRkPwQ1CEmhoNC', ARRAY ['lofi', 'hiphop'], 2, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

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
    const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s."fileType", s.cid, s.tags FROM songs AS s JOIN artists AS a ON a.id = s."artistId" WHERE s.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    const files = await db.query(`SELECT f.id, f.name, a.name AS artist, f.type, f."fileType", f.cid, f.tags FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE "songId" = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
    const comments = await db.query(`SELECT c.id, c.content, a.name AS artist FROM comments AS c JOIN artists AS a ON a.id = c."artistId" WHERE "songId" = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

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

const getAlbum = async (id, t) => {
  try {
    //Get album
    const album = await db.query(`SELECT al.id, al.title, ar.name AS artist,  al.cid, al.tags FROM albums AS al JOIN artists AS ar ON ar.id = al."artistId" WHERE al.id = ${id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
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

//Route handlers
const getLatest = async (req, res) => {
  const t = await db.transaction();

  try {
    const a = [];
    const submissions = await db.query(`SELECT "songId", "albumId" FROM submissions ORDER BY "createdAt" DESC LIMIT 5`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

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
      err
    });
  }
}

const getArtist = async (req, res) => {
  if (!req.params.name) {
    return res.json({
      type: 'error',
      err: 'No artist name included in request'
    });
  }

  const t = await db.transaction();

  try {
    const artist = await db.query(`SELECT id, name, bio, location FROM artists WHERE name = '${req.params.name}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (artist.length === 0) throw 'Artist not found';

    artist[0].albums = [];
    artist[0].songs = [];

    //Get album
    const albums = await db.query(`SELECT id FROM albums WHERE "artistId" = '${artist[0].id}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t })

    for (let _album of albums) {
      let album = await getAlbum(_album.id, t);
      artist[0].albums.push(album);
    }

    //Get songs
    const songs = await db.query(`SELECT id FROM songs WHERE "artistId" = '${artist[0].id}' AND "albumId" IS NULL`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let _song of songs) {
      let song = await getSong(_song.id, t);
      artist[0].songs.push(song);
    }

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
      err
    });
  }
}

module.exports = {
  initDB,
  getLatest,
  getArtist
}
