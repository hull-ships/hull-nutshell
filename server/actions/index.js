const admin = require("./admin-handler");
const fieldsAccount = require("./fields-account");
const fieldsContact = require("./fields-contact");
const statusCheck = require("./status-check");
const userUpdate = require("./user-update");
const webhook = require("./webhook");

module.exports = {
  admin,
  fieldsAccount,
  fieldsContact,
  statusCheck,
  userUpdate,
  webhook
};
