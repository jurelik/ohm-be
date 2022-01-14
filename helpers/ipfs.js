const { create } = require('ipfs-http-client');
const ipfs = create('http://127.0.0.1:5001');

module.exports = ipfs;
