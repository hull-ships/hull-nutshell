/* @flow */
const _ = require("lodash");
const Promise = require("bluebird");

const Agent = require("../lib/agent");

function userUpdateHandlerFactory(options: Object = {}): Function {
  const {
    flowControl = null
  } = options;
  return function userUpdateHandler(ctx: Object, messages: Array<Object>): Promise {
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
      return agent.sendUserMessages(enrichedMessages);
    }
    return Promise.resolve();
  };
}

module.exports = userUpdateHandlerFactory;
