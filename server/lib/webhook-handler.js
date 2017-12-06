/* @flow */
import type { IMetricsClient } from "./shared";

const _ = require("lodash");
const Agent = require("./agent");

class WebhookHandler {
  agent: Agent;

  constructor(hullClient: any, connector: Object, metricsClient: IMetricsClient) {
    this.agent = new Agent(hullClient, connector, metricsClient);
  }

  async handlePayload(body: Object): Promise<any> {
    if (!_.isEmpty(_.get(body, "payloads", []))) {
      _.forEach(_.get(body, "payloads"), (p) => {
        const payloadType = _.get(p, "type", "n/a");
        if (payloadType === "activities") {
          // We don't have a real object in this case, but we can query the API
          // and process the response
          // TODO: Add async function to the agent which takes the id and handles the rest
        } else if (payloadType === "contacts") {
          // We potentially have the correct data but
          // the payload is lacking the revision number,
          // so we need to fetch the entire object from the API
          // TODO: Add async function to the agent which takes the id and handles the rest
        }
      });
    }

    console.log(body);
    return Promise.resolve(true);
  }
}

module.exports = WebhookHandler;
