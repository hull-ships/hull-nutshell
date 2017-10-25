const Hull = require("hull");
const express = require("express");

const server = require("./server").default;

if (process.env.LOG_LEVEL) {
  Hull.logger.transports.console.level = process.env.LOG_LEVEL;
}

Hull.logger.transports.console.json = true;

const options = {
  Hull,
  hostSecret: process.env.SECRET || "1234",
  devMode: process.env.NODE_ENV === "development",
  port: process.env.PORT || 8082
};

const connector = new Hull.Connector(options);
const app = express();
connector.setupApp(app);
server(app);
connector.startApp(app);

Hull.logger.info("connector.started", { port: options.port });
