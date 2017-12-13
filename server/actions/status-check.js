/* @flow */
import type { THullRequest } from "hull";
import type { $Response } from "express";

const _ = require("lodash");
const Agent = require("../lib/sync-agent");

function statusCheckAction(req: THullRequest, res: $Response): void {
  if (_.has(req, "hull.ship.private_settings")) {
    const { client, ship } = req.hull;
    const messages: Array<string> = [];
    let status: string = "ok";
    const agent = new Agent(req.hull);

    if (agent.isAuthenticationConfigured() === false) {
      status = "error";
      messages.push("API Key is not configured. Connector cannot communicate with external service.");
    }

    if (_.isEmpty(_.get(ship, "private_settings.synchronized_segments", []))) {
      status = "error";
      messages.push("No users will be synchronized because no segments are whitelisted.");
    }

    res.json({ status, messages });
    client.put(`${ship.id}/status`, { status, messages });
    return;
  }

  res.status(404).json({ status: 404, messages: ["Request doesn't contain data about the connector"] });
}

module.exports = statusCheckAction;
