"use strict";

var Agent = require("../lib/agent");

var cacheManager = require("cache-manager");

var Cache = cacheManager.caching({ store: "memory", max: 100, ttl: 60 });

function fieldsAccountAction(req, res) {
  var _req$hull = req.hull,
      client = _req$hull.client,
      ship = _req$hull.ship,
      metric = _req$hull.metric;

  var _client$configuration = client.configuration(),
      secret = _client$configuration.secret;

  var cacheKey = [ship.id, ship.updated_at, secret, "af"].join("/");
  var agent = new Agent(client, ship, metric);

  if (!agent.isAuthenticationConfigured()) {
    return res.json({ ok: false, error: "The connector is not or not properly authenticated to Nutshell.", options: [] });
  }

  return Cache.wrap(cacheKey, function () {
    return agent.getAccountFields();
  }).then(function (ls) {
    var fields = (ls || []).map(function (s) {
      return { value: s.value, label: s.label };
    });
    return res.json({ options: fields });
  }).catch(function (err) {
    client.logger.error("connector.metadata.error", { status: err.status, message: err.message, type: "/fields-lead" });
    return res.json({ ok: false, error: err.message, options: [] });
  });
}

module.exports = fieldsAccountAction;