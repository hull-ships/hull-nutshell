/* @flow */
import type { $Request, $Response } from "express";

const _ = require("lodash");
const Agent = require("../lib/agent");

function webhookHandler(req: $Request, res: $Response) {
  const { client, ship, metric } = (req: any).hull;
  const agent = new Agent(client, ship, metric);

  return agent.handleWebhookPayload(req.body).then(() => {
    return res.end("ok");
  }, (err) => {
    return res.status(500).json({ error: _.get(err, "message", "Failed to process webhook payload") });
  });
}

module.exports = webhookHandler;
