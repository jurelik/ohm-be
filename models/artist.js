'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class artist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      artist.hasMany(models.submission);
      artist.hasMany(models.song);
      artist.hasMany(models.album);
      artist.hasMany(models.pin);
      artist.hasMany(models.comment);
      artist.hasMany(models.file);
    }
  };
  artist.init({
    sid: {
      type: DataTypes.STRING
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    bio: {
      type: DataTypes.STRING
    },
    location: {
      type: DataTypes.STRING
    },
    pw: {
      type: DataTypes.STRING,
      allowNull: false
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'artist',
  });
  return artist;
};
