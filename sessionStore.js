const { Sequelize } = require('sequelize');

module.exports = function SessionStoreInit(Store) {
  class SessionStore extends Store {
    constructor(options, db) {
      super(options);
      this.db = db;
    }

    async get(sid, cb) {
      const t = await this.db.transaction();

      try {
        const res = await this.db.query(`SELECT data FROM sessions WHERE sid = '${sid}'`, { type: Sequelize.QueryTypes.SELECT, transaction: t });
        await t.commit();
        if (res.length === 0) return cb();

        const session = res[0].data;
        cb(null, session);
      }
      catch (err) {
        await t.rollback();
        return (err, null);
      }
    }

    async set(sid, session, cb) {
      const t = await this.db.transaction();

      try {
        await this.db.query(`INSERT INTO sessions (sid, data, "createdAt", "updatedAt") VALUES ('${sid}', '${JSON.stringify(session)}', NOW(), NOW()) ON CONFLICT (sid) DO UPDATE SET data = '${JSON.stringify(session)}', "updatedAt" = NOW()`, { type: Sequelize.QueryTypes.INSERT, transaction: t });
        await t.commit();

        return cb(null);
      }
      catch (err) {
        await t.rollback();
        return cb(err);
      }
    }

    async touch(sid, session, cb) {
      const t = await this.db.transaction();

      try {
        await this.db.query(`UPDATE sessions SET data = '${JSON.stringify(session)}', "updatedAt" = NOW() WHERE sid = '${sid}'`, { type: Sequelize.QueryTypes.UPDATE, transaction: t });
        await t.commit();

        return cb(null);
      }
      catch (err) {
        await t.rollback();
        return cb(err);
      }
    }

    async destroy(sid, cb) {
      const t = await this.db.transaction();

      try {
        await this.db.query(`DELETE FROM sessions WHERE sid = '${sid}'`, { type: Sequelize.QueryTypes.DELETE, transaction: t });
        await t.commit();

        return cb(null);
      }
      catch (err) {
        await t.rollback();
        return cb(err);
      }
    }
  }

  return SessionStore;
};
