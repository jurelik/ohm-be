require('dotenv-flow').config();
const { Sequelize } = require('sequelize');
const cron = require('node-cron');
const { create } = require('ipfs-http-client');
const db = require('./db');
const ipfs = create();
const MAX_REPO_SIZE = 100000000; //8000000000

cron.schedule('* * * * *', async () => {
  try {
    await clearStorage();
  }
  catch (err) {
    console.log(err)
  }
});

const clearStorage = async () => {
  const t = await db.transaction();

  try {
    if (await repoIsBelowRequiredSize()) throw('Repo below required size.');

    const deleted = [];
    const items = await db.query(`SELECT s.id, i.cid, s."createdAt" FROM submissions AS s JOIN songs AS i ON i.id = s."songId" WHERE s.type = 'song' AND s.pinned = TRUE UNION ALL SELECT s.id, i.cid, s."createdAt" FROM submissions AS s JOIN albums AS i ON i.id = s."albumId" WHERE s.type = 'album' AND s.pinned = TRUE ORDER BY "createdAt" ASC LIMIT 50`, { type: Sequelize.QueryTypes.SELECT, transaction: t });

    if (items.length === 0) throw('No items left to unpin.'); //Failsafe in case somebody is uploading a file larger then the MAX_REPO_SIZE (prevent infinite loop)

    for (const item of items) {
      if (await repoIsBelowRequiredSize()) break;

      await ipfs.pin.rm(`/ipfs/${item.cid}`).catch(doNothing); //Remove pin (if caught it just means that pin has already been removed)
      deleted.push(item.id); //Add submission id to deleted array
      for await (const res of ipfs.repo.gc()) { /*Do nothing*/ } //Garbage collect
    }

    await db.query(`UPDATE submissions SET pinned = FALSE WHERE id IN ${formatDeleted(deleted)}`, { type: Sequelize.QueryTypes.UPDATE, transaction: t }); //Update pinned status in db
    await t.commit();
    await clearStorage(); //Loop until below required size
  }
  catch (err) {
    await t.rollback();
    console.log(err);
  }
}

const repoIsBelowRequiredSize = async () => {
  try {
    const stats = await ipfs.repo.stat()
    return stats.repoSize < MAX_REPO_SIZE;
  }
  catch (err) {
    console.log(err);
  }
}

const formatDeleted = (deleted) => {
  return `(${deleted.join(', ')})`;
}

const doNothing = () => {
  //Do nothing...
}
