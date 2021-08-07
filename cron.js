const cron = require('node-cron');
const { create } = require('ipfs-http-client');
const ipfs = create();

cron.schedule('* * * * *', async () => {
  try {
    await clearStorage();
  }
  catch (err) {
    console.log(err)
  }
});

const clearStorage = async () => {
  try {
    const stats = await ipfs.repo.stat()
    const pins = [];
    if (stats.repoSize < 8000000000) return console.log('Repo below required size.');

    for await (const { cid } of ipfs.pin.ls({ type: 'recursive' })) pins.push(cid);
    const ranIndex = Math.floor(Math.random() * (pins.length));
    await ipfs.pin.rm(pins[ranIndex]);
    for await (const res of ipfs.repo.gc()) { /*Do nothing*/ }

    await clearStorage(); //Loop until below required size
  }
  catch (err) {
    console.log(err);
  }
}
