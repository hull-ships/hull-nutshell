"use strict";

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _hull = require("hull");

var _hull2 = _interopRequireDefault(_hull);

var _server = require("./server");

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = {
  hostSecret: process.env.SECRET,
  port: process.env.PORT || 8082,
  devMode: process.env.NODE_ENV === "development"
};

var connector = new _hull2.default.Connector(config);
var app = (0, _express2.default)();

connector.setupApp(app);
(0, _server2.default)(app);