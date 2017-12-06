/* @flow */
import type { $Request, $Response } from "express";

const _ = require("lodash");
const WebhookHandler = require("../lib/webhook-handler");

function webhookHandler(req: $Request, res: $Response) {
  const { client, ship, metric } = (req: any).hull;
  const handler = new WebhookHandler(client, ship, metric);

  return handler.handlePayload(req.body).then(() => {
    return res.end("ok");
  }, (err) => {
    return res.status(500).json({ error: _.get(err, "message", "Failed to process webhook payload") });
  });
}

module.exports = webhookHandler;
