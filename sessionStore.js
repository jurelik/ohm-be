module.exports = function SessionStoreInit(Store) {
  class SessionStore extends Store {
    constructor(options) {
      super(options);
      console.log('init');
    }

    get(sid, cb) {
      console.log('get');
      cb();
    }

    set(sid, session, cb) {
      console.log('set');
      cb();
    }

    touch(sid, session, cb) {
      console.log('touch');
      cb();
    }

    destroy(sid, cb) {
      console.log('destroy');
      cb();
    }
  }

  return SessionStore;
};
