/* @flow */
const _ = require("lodash");
const moment = require("moment");

const { SUPPORTED_RESOURCETYPES } = require("../shared");

class WebhookUtil {

  getPluralObjectType(resourceType: string): string {
    return `${_.toLower(resourceType)}s`;
  }

  extractIdentifierFromPayload(payload: Object): string {
    return _.replace(_.get(payload, "id", ""), `-${payload.type}`, "");
  }

  isActivity(payload: Object): boolean {
    return _.get(payload, "type") === "activity";
  }

  isObjectUpdate(payload: Object): boolean {
    const supportedPluralTypes = SUPPORTED_RESOURCETYPES.map(this.getPluralObjectType);
    return _.includes(supportedPluralTypes, _.get(payload, "type"));
  }

  skipActivity(body: Object, payload: Object): boolean {
    const payloadId = _.get(payload, "id");
    const events = _.get(body, "events");
    const createEvent = _.find(events, (event) => {
      return event.action === "create" && _.includes(event.links.payloads, payloadId);
    });
    return createEvent === undefined;
  }

  getObjectType(payload: Object): string {
    const type = _.find(SUPPORTED_RESOURCETYPES, (t) => {
      return this.getPluralObjectType(t) === _.get(payload, "type");
    });
    return _.toString(type);
  }

  getLinkedAccountId(payload: Object): string {
    return _.replace(_.get(payload, "links.accounts[0]", ""), "-accounts", "");
  }

  getLinkedObject(payload: Object): Object {
    const response = {
      type: "",
      id: ""
    };
    const links = _.get(payload, "links", {});
    const supportedTypes: Array<Object> = SUPPORTED_RESOURCETYPES.map((type) => {
      return {
        type,
        pluralType: this.getPluralObjectType(type)
      };
    });

    supportedTypes.forEach((type) => {
      if (_.has(links, `${type.pluralType}[0]`)) {
        response.type = type.type;
        response.id = _.replace(_.get(links, `${type.pluralType}[0]`, ""), `-${type.pluralType}`, "");
      }
    });
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
      description: _.get(payload, "description", ""),
      note: _.get(payload, "logNote.note", ""),
      note_markup: _.get(payload, "logNote.noteMarkup", ""),
      note_html: _.get(payload, "logNote.noteHtml", ""),
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
