/* @flow */
import type { $Request, $Response } from "express";

const _ = require("lodash");
const cacheManager = require("cache-manager");
const Agent = require("../lib/agent");

const Cache = cacheManager.caching({ store: "memory", max: 100, ttl: 60 });


function fieldsAccountAction(req: $Request, res: $Response): $Response {
  const { client, ship, metric } = (req: any).hull;
  const { secret } = client.configuration();
  const cacheKey = [ship.id, ship.updated_at, secret, "af"].join("/");
  const agent = new Agent(client, ship, metric);

  if (!agent.isAuthenticationConfigured()) {
    return res.json({ ok: false, error: "The connector is not or not properly authenticated to Nutshell.", options: [] });
  }

  return Cache.wrap(cacheKey, () => {
    return agent.getAccountFields();
  }).then((af) => {
    const fields = (af).map((f) => {
      return { value: f.value, label: f.label };
    });
    return res.json({ options: fields });
  }).catch((err) => {
    if (_.has(client, "logger")) {
      client.logger.error("connector.metadata.error", { status: err.status, message: err.message, type: "/fields-account" });
    }
    return res.json({ ok: false, error: err.message, options: [] });
  });
}

module.exports = fieldsAccountAction;