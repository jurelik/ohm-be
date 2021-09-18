const { Sequelize } = require('sequelize');
const config = require('../config/config');

//This command makes COUNT return integers instead of strings
require('pg').defaults.parseInt8 = true;

const db = new Sequelize(config[process.env.NODE_ENV]);

module.exports = db;
