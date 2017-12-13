/* @flow */
import type { THullUserUpdateMessage, THullReqContext } from "hull";

const _ = require("lodash");

const Agent = require("../lib/agent");

function userUpdateHandlerFactory(options: Object = {}): Function {
  const {
    flowControl = null,
    isBatch = false
  } = options;
  return function userUpdateHandler(ctx: THullReqContext, messages: Array<THullUserUpdateMessage>): Promise<any> {
    if (ctx.smartNotifierResponse && flowControl) {
      ctx.smartNotifierResponse.setFlowControl(flowControl);
    }
    const agent = new Agent(ctx.client, ctx.ship, ctx.metric);
    const enrichedMessages = messages
      .map((m) => {
        if (!_.has(m.user, "account")) {
          m.user.account = _.get(m, "account");
        }
        return m;
      });

    if (enrichedMessages.length > 0) {
      return agent.sendUserMessages(enrichedMessages, isBatch);
    }
    return Promise.resolve();
  };
}

module.exports = userUpdateHandlerFactory;
