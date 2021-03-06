/* @flow */
import type { THullRequest } from "hull";
import type { $Response } from "express";

const _ = require("lodash");
const cacheManager = require("cache-manager");
const Agent = require("../lib/sync-agent");

const Cache = cacheManager.caching({ store: "memory", max: 100, ttl: 60 });


function fieldsAccountAction(req: THullRequest, res: $Response): $Response {
  const { client, ship } = req.hull;
  const { secret } = client.configuration();
  const cacheKey = [ship.id, _.get(ship, "updated_at"), secret, "af"].join("/");
  const agent = new Agent(req.hull);

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
