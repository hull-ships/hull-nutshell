/* @flow */
import type { IMetricsClient, ILogger, IFilterUtil, IAttributesMapper, IDropdownEntry, INutshellOperationOptions, INutshellClientOptions } from "./shared";

const _ = require("lodash");
const Promise = require("bluebird");
const NutshellClient = require("./nutshell-client");
const uuid = require("uuid/v4");
const cacheManager = require("cache-manager");

function composeNutshellClientOptions(settings: Object, metricsClient: IMetricsClient): INutshellClientOptions {
  const result: INutshellClientOptions = {
    userId: _.get(settings, "api_username", ""),
    apiKey: _.get(settings, "api_key", ""),
    metricsClient
  };
  return result;
}

class Agent {
  synchronizedSegments: string[];

  hullClient: any;

  metricsClient: IMetricsClient;

  nutshellClient: NutshellClient;

  connector: any;

  logger: ILogger;

  filterUtil: IFilterUtil;

  attributesMapper: IAttributesMapper;

  cache: Object;

  constructor(hullClient: any, connector: any, metricsClient: IMetricsClient) {
    this.connector = connector;
    this.synchronizedSegments = connector.private_settings.synchronized_segments;
    this.hullClient = hullClient;
    this.logger = hullClient.logger;
    this.metricsClient = metricsClient;
    this.cache = cacheManager.caching({ store: "memory", max: 100, ttl: 1800 });
    this.nutshellClient = new NutshellClient(composeNutshellClientOptions(connector.private_settings, metricsClient));
  }

  /**
   * Returns the fields for Nutshell accounts.
   *
   * @returns {Promise<Array<IDropdownEntry>>} The list of account fields.
   * @memberof Agent
   */
  getAccountFields(): Promise<Array<IDropdownEntry>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        const defaultFields = [
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
          { value: "industryId", label: "Industry (ID)" },
          { value: "accountTypeId", label: "Account Type (ID)" },
          { value: "territoryId", label: "Territory (ID)" },
          { value: "url", label: "Url" },
          { value: "phone", label: "Phone" }
        ];
        return this.nutshellClient.findCustomFields(options).then((opsResult) => {
          const customFields = _.map(opsResult.result.Accounts, (field) => {
            return { value: field.name, label: field.name };
          });

          return _.concat(defaultFields, customFields);
        });
      });
  }

  /**
   * Returns the fields for Nutshell contacts.
   *
   * @returns {Promise<Array<IDropdownEntry>>} The list of contact fields.
   * @memberof Agent
   */
  getContactFields(): Promise<Array<IDropdownEntry>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        const defaultFields = [
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
          { value: "territoryId", label: "Territory (ID)" },
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" }
        ];
        return this.nutshellClient.findCustomFields(options).then((opsResult) => {
          const customFields = _.map(opsResult.result.Contacts, (field) => {
            return { value: field.name, label: field.name };
          });

          return _.concat(defaultFields, customFields);
        });
      });
  }

  /**
   * Retrieves the base url of the API that is cached.
   *
   * @returns {Promise<string>} The base endpoint host name.
   * @memberof Agent
   */
  getApiBaseHostName(): Promise<string> {
    const { secret } = this.hullClient.configuration();
    const cacheKey = [this.connector.id, this.connector.updated_at, secret, "cf"].join("/");

    return this.cache.wrap(cacheKey, () => {
      return this.nutshellClient.discoverEndpoint();
    }).then((opsResult) => {
      const endpoint: string = _.get(opsResult, "result.api", "n/a");
      if (endpoint === "n/a") {
        return Promise.reject(new Error("The API endpoint discovery yielded no result for the provided username and API key."));
      }
      return Promise.resolve(endpoint);
    }).catch((err) => {
      this.logger.error("connector.metadata.error", { status: err.status, message: err.message, type: "endpoint-discovery" });
      return Promise.reject(err);
    });
  }

  /**
   * Checks whether the API key and User ID are provided at all and hypothetically valid.
   *
   * @returns {boolean} True if both are present and hypothetically valid; otherwise false.
   * @memberof Agent
   */
  isAuthenticationConfigured(): boolean {
    if (_.get(this.connector, "private_settings.api_username", "n/a") === "n/a" ||
        _.isNil(_.get(this.connector, "private_settings.api_username"))) {
      return false;
    }

    if (_.get(this.connector, "private_settings.api_key", "n/a") === "n/a" ||
        _.isNil(_.get(this.connector, "private_settings.api_key"))) {
      return false;
    }

    return true;
  }

  /**
   * Sends the messages to the third party service.
   *
   * @param {any[]} messages The messages from the platform.
   * @returns {Promise<any>} The result of the send operation.
   * @memberof Agent
   */
  sendUserMessages(messages: any[]): Promise<any> {
    return Promise.resolve(messages);
  }
}

module.exports = Agent;
