const Promise = require("bluebird");

class HullClientMock {
  constructor() {
    this.emitLog = false;
    this.configuration = {};
    this.utils = {
      settings: {
        update: () => {
          return Promise.resolve({});
        }
      }
    };
    this.logger = {
      info: (msg, data) => {
        if (this.emitLog === true) {
          console.log(msg, data);
        }
      },
      error: (msg, data) => {
        if (this.emitLog === true) {
          console.log(msg, data);
        }
      },
      debug: (msg, data) => {
        if (this.emitLog === true) {
          console.log(msg, data);
        }
      },
      log: (msg, data) => {
        if (this.emitLog === true) {
          console.log(msg, data);
        }
      }
    };
    this.get = () => {
      return Promise.resolve({});
    };
    this.post = () => {
      return Promise.resolve({});
    };
    this.put = () => {
      return Promise.resolve({});
    };
    this.asUser = () => {
      return new HullClientMock();
    };
    this.asAccount = () => {
      return new HullClientMock();
    };
    this.traits = () => {
      return Promise.resolve({});
    };
  }
}

module.exports = { HullClientMock };
