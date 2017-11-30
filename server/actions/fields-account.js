/* @flow */
import type { Request, Response } from "express";

const Agent = require("../lib/agent");
const cacheManager = require("cache-manager");

const Cache = cacheManager.caching({ store: "memory", max: 100, ttl: 60 });


function fieldsAccountAction(req: Request, res: Response): void {
  const { client, ship, metric } = req.hull;
  const { secret } = client.configuration();
  const cacheKey = [ship.id, ship.updated_at, secret, "af"].join("/");
  const agent = new Agent(client, ship, metric);

  if (!agent.isAuthenticationConfigured()) {
    return res.json({ ok: false, error: "The connector is not or not properly authenticated to Nutshell.", options: [] });
  }

  return Cache.wrap(cacheKey, () => {
    return agent.getAccountFields();
  }).then((ls) => {
    const fields = (ls || []).map((s) => {
      return { value: s.value, label: s.label };
    });
    return res.json({ options: fields });
  }).catch((err) => {
    client.logger.error("connector.metadata.error", { status: err.status, message: err.message, type: "/fields-lead" });
    return res.json({ ok: false, error: err.message, options: [] });
  });
}

module.exports = fieldsAccountAction;
