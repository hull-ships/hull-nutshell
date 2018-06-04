const Hull = require("hull");
const express = require("express");

const { middleware } = require("./lib/utils/crypto");
const server = require("./server");

const {
  LOG_LEVEL,
  SECRET,
  PORT
} = process.env;

if (LOG_LEVEL) {
  Hull.logger.transports.console.level = LOG_LEVEL;
}

Hull.logger.transports.console.json = true;

const options = {
  hostSecret: SECRET || "1234",
  port: PORT || 8091
};

const app = express();
const connector = new Hull.Connector(options);

app.use(middleware(connector.hostSecret));
connector.setupApp(app);

server(app);
connector.startApp(app);

