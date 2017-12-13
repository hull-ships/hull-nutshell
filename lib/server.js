"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Server;

var _utils = require("hull/lib/utils");

var _updateUser = require("./update-user");

var _updateUser2 = _interopRequireDefault(_updateUser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NotifyHandler = (0, _utils.notifHandler)({
  handlers: {
    "user:update": function userUpdate(_ref) {
      var ship = _ref.ship,
          hull = _ref.client;
      var messages = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      return Promise.all(messages.map(function (message) {
        return (0, _updateUser2.default)({ message: message }, { ship: ship, hull: hull });
      }));
    }
  }
});

function Server(app) {
  app.post("/batch", NotifyHandler);
  app.post("/notify", NotifyHandler);
  return app;
}