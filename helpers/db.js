const { Sequelize } = require('sequelize');

//This command makes COUNT return integers instead of strings
require('pg').defaults.parseInt8 = true;

const db = new Sequelize(`postgres://${process.env.DB_USER}${process.env.DB_PASSWORD ? `:${process.env.DB_PASSWORD}` : ''}@${process.env.DB_URL}:${process.env.DB_PORT}/${process.env.DB_NAME}`)

module.exports = db;
