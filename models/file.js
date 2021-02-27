'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class file extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      file.belongsTo(models.song);
      file.belongsTo(models.artist);
      file.belongsTo(models.file);
    }
  };
  file.init({
    name: {
      type: DataTypes.STRING,
      validate: {
        checkOriginal(value) {
          if (!value && this.type !== 'internal') throw new Error('Name is required when file is not of type "internal"');
        }
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      isIn: [['original', 'internal', 'external']]
    },
    fileType: {
      type: DataTypes.STRING,
      isIn: [['wav', 'mp3']],
      validate: {
        checkOriginal(value) {
          if (!value && this.type !== 'internal') throw new Error('FileType is required when file is not of type "internal"');
        }
      }
    },
    cid: {
      type: DataTypes.STRING,
      validate: {
        checkOriginal(value) {
          if (!value && this.type !== 'internal') throw new Error('CID is required when file is not of type "internal"');
        }
      }
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      validate: {
        checkOriginal(value) {
          if (!value && this.type !== 'internal') throw new Error('Tags are required when file is not of type "internal"');
        }
      }
    },
    info: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'file',
  });
  return file;
};
