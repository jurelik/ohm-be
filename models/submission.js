'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class submission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      submission.belongsTo(models.song, { onDelete: 'cascade' });
      submission.belongsTo(models.album, { onDelete: 'cascade' });
      submission.belongsTo(models.artist, { onDelete: 'cascade' });
    }
  };
  submission.init({
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      isIn: [['song', 'album']]
    }
  }, {
    sequelize,
    modelName: 'submission',
  });
  return submission;
};
