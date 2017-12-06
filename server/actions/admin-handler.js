/* @flow */
import type { $Request, $Response } from "express";

const _ = require("lodash");
const { encrypt } = require("../lib/utils/crypto");

function adminHandler(req: $Request, res: $Response): $Response {
  const conf = encrypt(_.get(req, "hull.config", {}), _.get(process, "env.SECRET", "1234"));
  return res.render("admin.html", {
    conf,
    hostname: _.get(req, "hull.hostname"),
    token: _.get(req, "hull.token")
  });
}

module.exports = adminHandler;
