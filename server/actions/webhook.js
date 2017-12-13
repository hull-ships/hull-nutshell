/* @flow */
import type { THullRequest } from "hull";
import type { $Response } from "express";

const _ = require("lodash");
const Agent = require("../lib/sync-agent");

function webhookHandler(req: THullRequest, res: $Response) {
  const agent = new Agent(req.hull);

  return agent.handleWebhookPayload(req.body).then(() => {
    return res.end("ok");
  }, (err) => {
    return res.status(500).json({ error: _.get(err, "message", "Failed to process webhook payload") });
  });
}

module.exports = webhookHandler;
