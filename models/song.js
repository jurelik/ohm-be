'use strict';
const {
  Model,
  Op
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class song extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      song.belongsTo(models.artist);
      song.belongsTo(models.album, { onDelete: 'cascade' });
      song.hasOne(models.submission, { onDelete: 'cascade', hooks: true });
      song.hasMany(models.file);
      song.hasMany(models.comment);
    }
  };
  song.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    format: {
      type: DataTypes.STRING,
      allowNull: false,
      isIn: [['wav', 'mp3']]
    },
    cid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'song',
    indexes: [
      {
        unique: true,
        fields: ['title', 'artistId'],
        where: {
          albumId: { [Op.is]: null }
        }
      }
    ]
  });
  return song;
};
