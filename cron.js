require('dotenv-flow').config();
const { Sequelize } = require('sequelize');
const cron = require('node-cron');
const { create } = require('ipfs-http-client');
const db = require('./db');
const ipfs = create();


cron.schedule('0,30 * * * * *', async () => {
  try {
    await clearStorage();
  }
  catch (err) {
    console.log(err)
  }
});

const clearStorage = async () => {
  try {
    if (await repoIsBelowRequiredSize()) return console.log('Repo below required size.');

    const items = await db.query(`SELECT s.id, i.cid, s."createdAt" FROM submissions AS s JOIN songs AS i ON i.id = s."songId" WHERE s.type = 'song' UNION ALL SELECT s.id, i.cid, s."createdAt" FROM submissions AS s JOIN albums AS i ON i.id = s."albumId" WHERE s.type = 'album' ORDER BY "createdAt" ASC LIMIT 50`, { type: Sequelize.QueryTypes.SELECT });

    for (const { cid } of items) {
      if (await repoIsBelowRequiredSize()) return console.log('Repo below required size.');

      await ipfs.pin.rm(`/ipfs/${cid}`).catch((err) => console.log(err.message));
      for await (const res of ipfs.repo.gc()) { /*Do nothing*/ }
    }

    await clearStorage(); //Loop until below required size
  }
  catch (err) {
    console.log(err);
  }
}

const repoIsBelowRequiredSize = async () => {
  try {
    const stats = await ipfs.repo.stat()
    //return stats.repoSize < 8000000000;
    return stats.repoSize < 100000000;
  }
  catch (err) {
    console.log(err);
  }
}
