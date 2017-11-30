import express from "express";
import Hull from "hull";
import server from "./server";

const config = {
  hostSecret: process.env.SECRET,
  port: process.env.PORT || 8082,
  devMode: process.env.NODE_ENV === "development"
};

const connector = new Hull.Connector(config);
const app = express();

connector.setupApp(app);
server(app);
