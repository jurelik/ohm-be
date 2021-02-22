const { Sequelize } = require('sequelize');
const db = require('../db');
const models = require('../models');

const initDB = () => {
  models.sequelize.sync().then(async () => {
    const t = await db.transaction();

    try {
      await db.query(`INSERT INTO artists (name, bio, location,  "createdAt", "updatedAt") VALUES ('antik', 'hello world', 'earth', NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO songs (title, "fileType", cid, tags, "artistId", "createdAt", "updatedAt") VALUES ('test', 'mp3', 'QmU1B9JdMvhm4EB8kj487GfwQzfVtocKCm9XNAHkUtHz4f', ARRAY ['lofi', 'hiphop'], 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO submissions (type, "artistId", "songId",  "createdAt", "updatedAt") VALUES ('song', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO files (name, type, "fileType", cid, tags, "songId", "artistId", "createdAt", "updatedAt") VALUES ('snare', 'original', 'wav', 'QmTp7eeKm1ymt6SZD3SPMD3mKkAFomE8x5xtJhqK48a8qy', ARRAY ['snare', 'lofi'], 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
      await db.query(`INSERT INTO comments (content, "artistId", "songId", "createdAt", "updatedAt") VALUES ('this is a comment', 1, 1, NOW(), NOW())`, { type: Sequelize.QueryTypes.INSERT, transaction: t });

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

//Route handlers
const getLatest = async (req, res) => {
  const t = await db.transaction();

  try {
    const a = [];
    const submissions = await db.query(`SELECT "songId", "albumId" FROM submissions ORDER BY "createdAt" DESC LIMIT 5`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    for (let submission of submissions) {
      if (submission.songId) {
        //Get data
        const song = await db.query(`SELECT s.id, s.title, a.name AS artist, s."fileType", s.cid, s.tags FROM songs AS s JOIN artists AS a ON a.id = s."artistId"`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        const files = await db.query(`SELECT f.id, f.name, a.name AS artist, f.type, f."fileType", f.cid, f.tags FROM files AS f JOIN artists AS a ON a.id = f."artistId" WHERE "songId" = ${song[0].id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        const comments = await db.query(`SELECT c.id, c.content, a.name AS artist FROM comments AS c JOIN artists AS a ON a.id = c."artistId" WHERE "songId" = ${song[0].id}`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

        //Append additional data to song
        song[0].type = 'song';
        song[0].files = files;
        song[0].comments = comments;

        a.push(song[0]);
      }
    }

    await t.commit();
    res.end(JSON.stringify(a));
  }
  catch (err) {
    await t.rollback();
    console.error(err);
  }
}

module.exports = {
  initDB,
  getLatest
}
