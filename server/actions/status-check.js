/* @flow */

import type { $Request, $Response } from "express";

const _ = require("lodash");
const Agent = require("../lib/agent");

function statusCheckAction(req: $Request, res: $Response): void {
  if (_.has(req, "hull.ship.private_settings")) {
    const { client, ship, metric } = (req: any).hull;
    const messages: Array<string> = [];
    let status: string = "ok";
    const agent = new Agent(client, ship, (metric: any));

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
