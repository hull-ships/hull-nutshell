"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _shared = require("./shared");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Promise = require("bluebird");
var rpc = require("jayson");
var shared = require("./shared");

function _initHttpsClient(options) {
  var auth = Buffer.from(options.userId + ":" + options.apiKey).toString("base64");
  var client = rpc.client.https({
    hostname: options.host,
    path: "/api/v1/json",
    headers: {
      authorization: "Basic " + auth
    }
  });
  return client;
}

var NutshellClient = function () {
  /**
   * Gets or sets the user name or identifier.
   *
   * @type {string}
   * @memberof NutshellClient
   */
  function NutshellClient(options) {
    _classCallCheck(this, NutshellClient);

    this.userId = options.userId;
    this.apiKey = options.apiKey;
  }

  /**
   * Discovers the endpoint that should be used to communicate.
   * Response shall be cached between 10-90 minutes.
   *
   * @returns {Promise<INutshellClientResponse>} The discovery result.
   * @memberof NutshellClient
   */


  /**
   * Gets or sets the API key to authenticate against the Nutshell.
   *
   * @type {string}
   * @memberof NutshellClient
   */


  _createClass(NutshellClient, [{
    key: "discoverEndpoint",
    value: function discoverEndpoint() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        var client = rpc.client.http(shared.DISCOVERY_ENDPOINT);

        client.request("getApiForUsername", { username: _this.userId }, "apeye", function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Creates a new contact in Nutshell.
     *
     * @param {Object} data The contact data.
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>}  The result of the operation.
     * @memberof NutshellClient
     */

  }, {
    key: "createContact",
    value: function createContact(data, options) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this2.userId, apiKey: _this2.apiKey, host: options.host });
        client.request("newContact", { contact: data }, options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Creates a new account in Nutshell.
     *
     * @param {Object} data The account data.
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>} The result of the operation.
     * @memberof NutshellClient
     */

  }, {
    key: "createAccount",
    value: function createAccount(data, options) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this3.userId, apiKey: _this3.apiKey, host: options.host });
        client.request("newAccount", { account: data }, options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Edit a contact.
     *
     * Warning: Fields which allow multiples (phone, email, URL, etc.) will be completely replaced by
     * whatever data you supply, if you supply any data for the field. (Eg. the new phone array replaces
     * all previously known phone numbers.) If you are updating a multi-value field, you must include all
     * values you wish to keep (not just the new values) for the field.
     *
     * If a note is specified, it will be added to the existing notes (preexisting notes are not affected).
     *
     * @param {string} id The contact ID to update.
     * @param {string} rev The revision number.
     * @param {Object} data The updated contact information.
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>} The result of the operation.
     * @memberof NutshellClient
     */

  }, {
    key: "editContact",
    value: function editContact(id, rev, data, options) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this4.userId, apiKey: _this4.apiKey, host: options.host });
        client.request("editContact", { contactId: id, rev: rev, contact: data }, options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Edit an account.
     *
     * Warning: Fields which allow multiples (phone, email, URL, etc.) will be completely replaced by
     * whatever data you supply, if you supply any data for the field. (Eg. the new phone array replaces
     * all previously known phone numbers.) If you are updating a multi-value field, you must include
     * all values you wish to keep (not just the new values) for the field.
     *
     * If a note is specified, it will be added to the existing notes (preexisting notes are not affected).
     *
     * @param {string} id The account ID to edit.
     * @param {string} rev The revision number.
     * @param {Object} data The updated account information
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>} The result of the operation.
     * @memberof NutshellClient
     */

  }, {
    key: "editAccount",
    value: function editAccount(id, rev, data, options) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this5.userId, apiKey: _this5.apiKey, host: options.host });
        client.request("editAccount", { accountId: id, rev: rev, account: data }, options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Gets all of the custom fields available for Leads, Accounts and Contacts, including appropriate meta-information.
     *
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>} The result of the operation.
     * @memberof NutshellClient
     *
     * @example
     * The result property contains an object of the following shape if the operation succeeded:
     * {
     *    "Leads": [ EntityAttribute, ... ],
     *    "Contacts": [ EntityAttribute, ... ],
     *    "Accounts": [ EntityAttribute, ... ]
     * }
     *
     */

  }, {
    key: "findCustomFields",
    value: function findCustomFields(options) {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this6.userId, apiKey: _this6.apiKey, host: options.host });
        client.request("findCustomFields", [], options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Return a list of Account stubs matching a given search string.
     *
     * @param {string} query The string to search for.
     * @param {number} limit The maximum number of entities returned.
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>} The result of the operation.
     * @memberof NutshellClient
     *
     * @example
     * The result property contains an array of matching account objects.
     */

  }, {
    key: "searchAccounts",
    value: function searchAccounts(query, limit, options) {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this7.userId, apiKey: _this7.apiKey, host: options.host });
        client.request("searchAccounts", { string: query, limit: limit }, options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }

    /**
     * Searches accounts and contacts by email address and returns
     * up to 5 account or contact stubs with the specified email address.
     * Results are organized by entity type.
     *
     * @param {string} emailAddress The email address to search for.
     * @param {INutshellOperationOptions} options The options for the operation.
     * @returns {Promise<INutshellClientResponse>} The result of the operation.
     * @memberof NutshellClient
     *
     * @example
     * The result property will contain an object of the following shape when successful:
     * {
     *    "contacts": [ Contact, ... ],
     *    "accounts": [ Account, ... ]
     * }
     */

  }, {
    key: "searchByEmail",
    value: function searchByEmail(emailAddress, options) {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        var client = _initHttpsClient({ userId: _this8.userId, apiKey: _this8.apiKey, host: options.host });
        client.request("searchByEmail", { emailAddressString: emailAddress }, options.requestId, function (err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }
  }]);

  return NutshellClient;
}();

module.exports = NutshellClient;