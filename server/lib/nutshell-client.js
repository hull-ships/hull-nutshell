// @flow
import type { INutshellClientOptions, INutshellClientResponse, INutshellOperationOptions, IMetricsClient } from "./shared";

const Promise = require("bluebird");
const rpc = require("jayson");
const _ = require("lodash");
const shared = require("./shared");

function _initHttpsClient(options: Object): Object {
  const auth = Buffer.from(`${options.userId}:${options.apiKey}`).toString("base64");
  const client = rpc.client.https({
    hostname: options.host,
    path: "/api/v1/json",
    headers: {
      authorization: `Basic ${auth}`
    }
  });
  return client;
}

class NutshellClient {
  /**
   * Gets or sets the user name or identifier.
   *
   * @type {string}
   * @memberof NutshellClient
   */
  userId: string;

  /**
   * Gets or sets the API key to authenticate against the Nutshell.
   *
   * @type {string}
   * @memberof NutshellClient
   */
  apiKey: string;

  /**
   * Gets or sets the client for logging metrics.
   *
   * @type {IMetricsClient}
   * @memberof NutshellClient
   */
  metricsClient: IMetricsClient;

  constructor(options: INutshellClientOptions) {
    this.userId = options.userId;
    this.apiKey = options.apiKey;
    if (_.has(options, "metricsClient")) {
      _.set(this, "metricsClient", options.metricsClient);
    }
  }

  /**
   * Discovers the endpoint that should be used to communicate.
   * Response shall be cached between 10-90 minutes.
   *
   * @returns {Promise<INutshellClientResponse>} The discovery result.
   * @memberof NutshellClient
   */
  discoverEndpoint(): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = rpc.client.http(shared.DISCOVERY_ENDPOINT);

      client.request("getApiForUsername", { username: this.userId }, "apeye", (err, result) => {
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
  createContact(data: Object, options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("newContact", { contact: data }, options.requestId, (err, result) => {
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
  createAccount(data: Object, options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("newAccount", { account: data }, options.requestId, (err, result) => {
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
  editContact(id: string, rev: string, data: Object, options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("editContact", { contactId: id, rev, contact: data }, options.requestId, (err, result) => {
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
  editAccount(id: string, rev: string, data: Object, options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("editAccount", { accountId: id, rev, account: data }, options.requestId, (err, result) => {
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
  findCustomFields(options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("findCustomFields", [], options.requestId, (err, result) => {
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
  searchAccounts(query: string, limit: number, options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("searchAccounts", { string: query, limit }, options.requestId, (err, result) => {
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
  searchByEmail(emailAddress: string, options: INutshellOperationOptions): Promise<INutshellClientResponse> {
    return new Promise((resolve, reject) => {
      const client = _initHttpsClient({ userId: this.userId, apiKey: this.apiKey, host: options.host });
      this.incrementApiCalls(1);
      client.request("searchByEmail", { emailAddressString: emailAddress }, options.requestId, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  }

  /**
   * Increments the number of API calls via the metrics client,
   * if one is configured.
   *
   * @param {number} [value=1] The amount by which API calls will increase; default to one.
   * @memberof CloseIoClient
   */
  incrementApiCalls(value: number = 1): void {
    if (this.metricsClient) {
      this.metricsClient.increment("ship.service_api.call", value);
    }
  }
}

module.exports = NutshellClient;
