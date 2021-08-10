const models = require('./models');

const initDB = () => {
  models.sequelize.sync().then(() => {
    console.log('Database successfully initialized.')
    process.exit();
  }).catch(err => {
    console.error(err);
    process.exit();
  });
}

initDB();
