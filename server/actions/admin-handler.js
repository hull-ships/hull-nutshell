/* @flow */
import type { THullRequest } from "hull";
import type { $Response } from "express";

const _ = require("lodash");
const Promise = require("bluebird");
const { encrypt } = require("../lib/utils/crypto");
const Agent = require("../lib/sync-agent");

function adminHandler(req: THullRequest, res: $Response) { // eslint-disable-line consistent-return
  const conf = encrypt(_.get(req, "hull.config", {}), _.get(process, "env.SECRET", "1234"));
  const agent = new Agent(req.hull);

  if (!agent.isAuthenticationConfigured()) {
    return res.render("admin.html", {
      conf,
      hostname: _.get(req, "hull.hostname"),
      token: _.get(req, "hull.token"),
      products: [],
      markets: [],
      sources: [],
      _,
      errorInfo: {}
    });
  }

  Promise.all([
    agent.findProducts(100),
    agent.findMarkets(50),
    agent.findSources(50)
  ]).spread((products, markets, sources) => {
    return res.render("admin.html", {
      conf,
      hostname: _.get(req, "hull.hostname"),
      token: _.get(req, "hull.token"),
      products: products || [],
      markets: markets || [],
      sources: sources || [],
      _,
      errorInfo: {}
    });
  }).catch((err) => {
    return res.render("admin.html", {
      conf,
      hostname: _.get(req, "hull.hostname"),
      token: _.get(req, "hull.token"),
      err
    });
  });
}

module.exports = adminHandler;
