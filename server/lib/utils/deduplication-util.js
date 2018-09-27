// @flow
const _ = require("lodash");

class DeduplicationUtil {
  deduplicateUserMessages(messages: Array<Object>): Array<Object> {
    if (!messages || !_.isArray(messages) || messages.length === 0) {
      return [];
    }

    return _.chain(messages)
      .groupBy("user.id")
      .map((val) => {
        return _.last(_.sortBy(val, ["user.indexed_at"]));
      })
      .value();
  }

  deduplicateAccountMessages(messages: Array<Object>): Array<Object> {
    if (!messages || !_.isArray(messages) || messages.length === 0) {
      return [];
    }

    return _.chain(messages)
      .groupBy("account.id")
      .map((val) => {
        return _.last(_.sortBy(val, ["account.indexed_at"]));
      })
      .value();
  }
}

module.exports = DeduplicationUtil;
