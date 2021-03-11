require('dotenv-flow').config();
const express = require('express');
const app = express();;
const cors = require('cors');
const helpers = require('./helpers');

//helpers.initDB(); //Uncomment only when initialising db locally

app.use(cors());

app.get('/', (req, res) => {
  res.end('Hello world');
});

app.get('/api/latest', (req, res) => {
  helpers.getLatest(req, res);
});

app.get('/api/artist/:name', (req, res) => {
  helpers.getArtist(req, res);
});

app.post('/api/upload', express.json(), (req, res) => {
  helpers.postUpload(req, res);
});

app.post('/api/comment', express.json(), (req, res) => {
  helpers.postComment(req, res);
});

app.post('/api/pinned', express.json(), (req, res) => {
  helpers.postPinned(req, res);
});

app.listen(process.env.PORT, () => {
  console.log('Server is listening on port ' + process.env.PORT + '.');
});

