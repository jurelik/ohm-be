'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class pin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      pin.belongsTo(models.artist, {
        foreignKey: {
          allowNull: false
        }
      });
      pin.belongsTo(models.song);
      pin.belongsTo(models.album);
      pin.belongsTo(models.file);
    }
  };
  pin.init({
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      isIn: [['song', 'album', 'file']]
    }
  }, {
    sequelize,
    modelName: 'pin',
  });
  return pin;
};
