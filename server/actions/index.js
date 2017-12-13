const admin = require("./admin-handler");
const fieldsAccount = require("./fields-account");
const fieldsContact = require("./fields-contact");
const fieldsLead = require("./fields-lead");
const statusCheck = require("./status-check");
const userUpdate = require("./user-update");
const webhook = require("./webhook");

module.exports = {
  admin,
  fieldsAccount,
  fieldsContact,
  fieldsLead,
  statusCheck,
  userUpdate,
  webhook
};
