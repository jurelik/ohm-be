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

app.listen(process.env.PORT, () => {
  console.log('Server is listening on port ' + process.env.PORT + '.');
});

