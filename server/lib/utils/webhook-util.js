/* @flow */
import type { TResourceType } from "../types";

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
    return _.get(payload, "type") === "activities";
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

  getObjectType(payload: Object): TResourceType | void {
    const type = _.find(SUPPORTED_RESOURCETYPES, (t) => {
      return this.getPluralObjectType(t) === _.get(payload, "type");
    });
    return type;
  }

  getLinkedAccountId(payload: Object): string {
    return _.replace(_.get(payload, "links.accounts[0]", ""), "-accounts", "");
  }

  getLinkedObjects(payload: Object): Array<Object> {
    const response = [];
    const links = _.get(payload, "links", {});
    const supportedTypes: Array<Object> = SUPPORTED_RESOURCETYPES.map((type) => {
      return {
        type,
        pluralType: this.getPluralObjectType(type)
      };
    });

    supportedTypes.forEach((type) => {
      if (_.has(links, `${type.pluralType}[0]`)) {
        response.push({
          type: type.type,
          id: _.replace(_.get(links, `${type.pluralType}[0]`, ""), `-${type.pluralType}`, "")
        });
      }
    });
    return response;
  }

  getWebhookHullTrack(payload: Object): Object {
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
      event_id: `nutshell-${_.get(payload, "id")}-${moment(_.get(payload, "createdTime")).format("X")}`,
      created_at: _.get(payload, "createdTime"),
      ip: 0
    };

    return result;
  }

  getActivityHullTrack(payload: Object): Object {
    const result = {
      name: "",
      params: {},
      context: {}
    };
    if (payload.entityType === "Notes") {
      result.name = "Note";
      result.params = {
        note: _.get(payload, "note", ""),
        user_name: _.get(payload, "user.name", ""),
        user_emails: _.get(payload, "user.emails", []).join(", ")
      };
    } else if (payload.entityType === "Emails") {
      result.name = "Email";
      result.params = {
        subject: _.get(payload, "subject", ""),
        body: _.get(payload, "body", "")
      };

      ["to", "from", "cc"].forEach((field) => {
        _.get(payload, field, []).forEach((address, index) => {
          const number = index + 1;
          result.params[`${field}_${number}_address`] = address.address;
          result.params[`${field}_${number}_display`] = address.display;
        });
      });
    }
    result.context = {
      source: "nutshell",
      event_id: `nutshell-${_.get(payload, "id")}-${moment(_.get(payload, "createdTime")).format("X")}`,
      created_at: _.get(payload, "createdTime"),
      ip: 0
    };
    return result;
  }

  isAdditionalActivity(payload: Object): boolean {
    return (payload.entityType === "Notes" || payload.entityType === "Emails");
  }
}

module.exports = WebhookUtil;
