// @flow
import { IMetricClient, ILogger, IFilterUtil, IAttributesMapper, IDropdownEntry, INutshellOperationOptions } from "./shared";

const _ = require("lodash");
const Promise = require("bluebird");
const NutshellClient = require("./nutshell-client");

class Agent {
  synchronizedSegments: string[];

  hullClient: any;

  metricClient: IMetricClient;

  nutshellClient: NutshellClient;

  connector: any;

  logger: ILogger;

  filterUtil: IFilterUtil;

  attributesMapper: IAttributesMapper;

  constructor(hullClient: any, connector: any, metricClient: IMetricClient) {
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
  getAccountFields(): Promise<Array<IDropdownEntry>> {
    // TODO: compose proper options
    const options: INutshellOperationOptions = {
      host: "app.nutshell.com",
      requestId: "hull"
    };
    // TODO: Define default fields for accounts
    const defaultFields = [];
    return this.nutshellClient.findCustomFields(options).then((opsResult) => {
      const customFields = _.map(opsResult.result.Accounts, (field) => {
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
  isAuthenticationConfigured(): boolean {
    if (_.get(this.connector, "private_settings.auth_userid", "n/a") === "n/a") {
      return false;
    }

    if (_.get(this.connector, "private_settings.auth_apikey", "n/a") === "n/a") {
      return false;
    }

    return true;
  }
}

module.exports = Agent;
