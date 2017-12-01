"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _shared = require("./shared");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require("lodash");
var Promise = require("bluebird");
var NutshellClient = require("./nutshell-client");

var Agent = function () {
  function Agent(hullClient, connector, metricClient) {
    _classCallCheck(this, Agent);

    this.connector = connector;
    this.synchronizedSegments = connector.private_settings.synchronized_segments;
    this.hullClient = hullClient;
    this.logger = hullClient.logger;
    this.metricClient = metricClient;
  }

  /**
   * Returns the fields for Nutshell accounts.
   *
   * @returns {Promise<Array<IDropdownEntry>>} The list of account fields.
   * @memberof Agent
   */


  _createClass(Agent, [{
    key: "getAccountFields",
    value: function getAccountFields() {
      // TODO: compose proper options
      var options = {
        host: "app.nutshell.com",
        requestId: "hull"
      };

      var defaultFields = [{ value: "name", label: "Name" }, { value: "description", label: "Description" }, { value: "industryId", label: "Industry (ID)" }, { value: "accountTypeId", label: "Account Type (ID)" }, { value: "territoryId", label: "Territory (ID)" }, { value: "url", label: "Url" }, { value: "phone", label: "Phone" }];
      return this.nutshellClient.findCustomFields(options).then(function (opsResult) {
        var customFields = _.map(opsResult.result.Accounts, function (field) {
          return { value: field.name, label: field.name };
        });

        return _.concat(defaultFields, customFields);
      });
    }

    /**
     * Checks whether the API key and User ID are provided at all and hypothetically valid.
     *
     * @returns {boolean} True if both are present and hypothetically valid; otherwise false.
     * @memberof Agent
     */

  }, {
    key: "isAuthenticationConfigured",
    value: function isAuthenticationConfigured() {
      if (_.get(this.connector, "private_settings.auth_userid", "n/a") === "n/a") {
        return false;
      }

      if (_.get(this.connector, "private_settings.auth_apikey", "n/a") === "n/a") {
        return false;
      }

      return true;
    }
  }]);

  return Agent;
}();

module.exports = Agent;