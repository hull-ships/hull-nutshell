"use strict";

var _express = require("express");

var _ = require("lodash");

var Agent = require("../lib/agent");

function statusCheckAction(req, res) {
  if (req.hull && req.hull.ship && req.hull.ship.private_settings) {
    var _req$hull = req.hull,
        _req$hull$ship = _req$hull.ship,
        ship = _req$hull$ship === undefined ? {} : _req$hull$ship,
        _req$hull$client = _req$hull.client,
        client = _req$hull$client === undefined ? {} : _req$hull$client,
        _req$hull$metric = _req$hull.metric,
        metric = _req$hull$metric === undefined ? {} : _req$hull$metric;

    var messages = [];
    var status = "ok";
    var agent = new Agent(client, ship, metric);

    if (agent.isAuthenticationConfigured() === false) {
      status = "error";
      messages.push("API Key is not configured. Connector cannot communicate with external service.");
    }

    if (_.isEmpty(_.get(ship, "private_settings.synchronized_segments", []))) {
      status = "error";
      messages.push("No users will be synchronized because no segments are whitelisted.");
    }

    res.json({ status: status, messages: messages });
    client.put(ship.id + "/status", { status: status, messages: messages });
  }

  res.status(404).json({ status: 404, messages: ["Request doesn't contain data about the connector"] });
}

module.exports = statusCheckAction;