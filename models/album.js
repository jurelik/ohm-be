'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class album extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      album.hasMany(models.song, { onDelete: 'cascade', hooks: true });
      album.hasOne(models.submission, { onDelete: 'cascade', hooks: true });
      album.belongsTo(models.artist);
    }
  };
  album.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'album',
    indexes: [
      {
        unique: true,
        fields: ['title', 'artistId'],
      }
    ]
  });
  return album;
};
