/* @flow */
const _ = require("lodash");
const moment = require("moment");

class WebhookUtil {
  extractIdentifierFromPayload(payload: Object): string {
    return _.replace(_.get(payload, "id", ""), `-${payload.type}`, "");
  }

  getLinkedObject(payload: Object): Object {
    const response = {
      type: "",
      id: ""
    };

    const links = _.get(payload, "links", {});

    if (_.has(links, "accounts[0]")) {
      response.type = "Account";
      response.id = _.replace(_.get(links, "accounts[0]", ""), "-accounts", "");
    }

    if (_.has(links, "contacts[0]")) {
      response.type = "Contact";
      response.id = _.replace(_.get(links, "contacts[0]", ""), "-contacts", "");
    }

    if (_.has(links, "leads[0]")) {
      response.type = "Lead";
      response.id = _.replace(_.get(links, "leads[0]", ""), "-leads", "");
    }

    return response;
  }

  getHullTrack(payload: Object): Object {
    const result = {
      name: "",
      params: {},
      context: {}
    };

    result.name = _.get(payload, "activityType.name", "");
    result.params = {
      note: _.get(payload, "logNote.note", ""),
      is_all_day: _.get(payload, "isAllDay", ""),
      is_cancelled: _.get(payload, "isCancelled", ""),
      start_time: _.get(payload, "startTime", ""),
      end_time: _.get(payload, "endTime", ""),
      is_flagged: _.get(payload, "isFlagged", ""),
      logged_by_name: _.get(payload, "loggedBy.name", ""),
      logged_by_emails: _.get(payload, "loggedBy.emails", []).join(", ")
    };
    result.context = {
      event_id: `nutshell-${_.get(payload, "id")}-${moment(_.get(payload, "createdTime", "id")).format("X")}`,
      ip: 0
    };

    return result;
  }
}

module.exports = WebhookUtil;
