/* @flow */
import type { $Application } from "express";

const cors = require("cors");
const express = require("express");
const { notifHandler, smartNotifierHandler } = require("hull/lib/utils");

const actions = require("./actions/index");

function server(app: $Application): $Application {
  app.post("/smart-notifier", smartNotifierHandler({
    handlers: {
      "user:update": actions.userUpdate({
        flowControl: {
          type: "next",
          size: parseInt(process.env.FLOW_CONTROL_SIZE, 10) || 200,
          in: parseInt(process.env.FLOW_CONTROL_IN, 10) || 5
        }
      })
    }
  }));

  app.post("/batch", notifHandler({
    userHandlerOptions: {
      maxSize: 200
    },
    handlers: {
      "user:update": actions.userUpdate({ isBatch: true })
    }
  }));

  app.get("/admin", actions.admin);

  app.get("/fields-contact", cors(), actions.fieldsContact);
  app.get("/fields-account", cors(), actions.fieldsAccount);

  app.all("/webhook", (express: any).json(), actions.webhook);

  app.all("/status", actions.statusCheck);

  return app;
}

module.exports = server;
