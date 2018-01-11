/* @flow */
import type { THullObject } from "hull";
import type { TResourceType, IAttributesMapper } from "../types";

const _ = require("lodash");
const { URL } = require("url");

const { SUPPORTED_RESOURCETYPES, COMPLEX_ARRAY_FIELDS_MAP } = require("../shared");

class AttributesMapper implements IAttributesMapper {
  /**
   * Gets or sets the outbound mappings.
   *
   * @type {Object}
   * @memberof AttributesMapper
   */
  mappingsOutbound: Object;

  complexArrayFieldsMap: Object;

  /**
   * Creates an instance of AttributesMapper.
   * @param {Object} settings The connector settings that contain the attribute mappings.
   * @memberof AttributesMapper
   */
  constructor(settings: Object) {
    this.mappingsOutbound = {};
    _.forEach(SUPPORTED_RESOURCETYPES, (r) => {
      _.set(this.mappingsOutbound, r, _.get(settings, `${r.toLowerCase()}_attributes_outbound`, {}));
    });
    this.complexArrayFieldsMap = COMPLEX_ARRAY_FIELDS_MAP;
  }

  /**
   * Maps a Hull object to a Nutshell object that can be sent to
   * the Nutshell API.
   *
   * @param {TResourceType} resource The name of the Nutshell resource.
   * @param {*} hullObject The user object from hull with nested account object; never an account object itself!
   * @returns {*} The mapped Nutshell Object.
   * @memberof AttributesMapper
   */
  mapToServiceObject(resource: TResourceType, hullObject: THullObject): Object {
    const sObject = { };
    if (resource === "Contact" || resource === "Lead") {
      if (_.has(hullObject, `traits_nutshell_${_.toLower(resource)}/id`)) {
        _.set(sObject, "id", _.get(hullObject, `traits_nutshell_${_.toLower(resource)}/id`));
      }

      if (_.has(hullObject, `traits_nutshell_${_.toLower(resource)}/rev`)) {
        _.set(sObject, "rev", _.get(hullObject, `traits_nutshell_${_.toLower(resource)}/rev`));
      }
    } else if (resource === "Account") {
      if (_.has(hullObject, "account.nutshell/id")) {
        _.set(sObject, "id", _.get(hullObject, "account.nutshell/id"));
      }

      if (_.has(hullObject, "account.nutshell/rev")) {
        _.set(sObject, "rev", _.get(hullObject, "account.nutshell/rev"));
      }
    }

    const mappings = _.cloneDeep(_.get(this.mappingsOutbound, resource));
    _.forEach(mappings, (m) => {
      if (_.get(m, "hull_field_name")) {
        const hullAttribValue = _.get(hullObject, m.hull_field_name);
        if (!_.isNil(hullAttribValue)) {
          const sAttribName = _.get(m, "nutshell_field_name");
          _.set(sObject, sAttribName, hullAttribValue);
        }
      }
      if (_.get(m, "hull_field_template")) {
        const hullAttribValue = this.renderTemplate(m.hull_field_template, hullObject);
        if (!_.isNil(hullAttribValue)) {
          const sAttribName = _.get(m, "nutshell_field_name");
          _.set(sObject, sAttribName, hullAttribValue);
        }
      }
    });

    if (resource === "Lead") {
      if (_.has(hullObject, "account.nutshell/id")) {
        sObject.accounts = [{ id: _.get(hullObject, "account.nutshell/id") }];
      }

      if (_.has(hullObject, "traits_nutshell_contact/id")) {
        sObject.contacts = [{ id: _.get(hullObject, "traits_nutshell_contact/id") }];
      }
    }

    // For all this.complexArrayFieldsMap we take the input array trait
    // and map it into an array of objects using the paramName from the complexArrayFieldsMap
    _.forEach(sObject, (value, key) => {
      if (_.has(this.complexArrayFieldsMap, `${resource}.${key}`)) {
        const paramToSet = _.get(this.complexArrayFieldsMap, `${resource}.${key}`);
        const mappedValue = value.map(paramValue => {
          return {
            [paramToSet]: paramValue
          };
        });
        _.set(sObject, key, mappedValue);
      }
    });

    if (_.has(sObject, "assignee.id")) {
      _.set(sObject, "assignee.entityType", "Users");
    }

    return sObject;
  }

  /**
   * Maps a Nutshell object to an object of traits that can be sent to
   * the Hull platform.
   * Note: This is not a Hull user or account object
   *
   * @param {TResourceType} resource The name of the Nutshell resource.
   * @param {*} sObject The Nutshell object.
   * @returns {*} The object containing the information about the traits to set.
   * @memberof AttributesMapper
   */
  mapToHullAttributeObject(resource: TResourceType, sObject: Object): Object {
    // TODO: Implement for webhooks
    const hObject = {};
    if (resource === "Account") {
      _.set(hObject, "nutshell/id", { value: sObject.id });
      _.set(hObject, "nutshell/rev", { value: sObject.rev });
      _.set(hObject, "nutshell/updated_at", { value: sObject.modifiedTime });
      _.set(hObject, "nutshell/created_at", { value: sObject.createdTime, operation: "setIfNull" });
    } else {
      _.set(hObject, `nutshell_${_.toLower(resource)}/id`, { value: sObject.id });
      _.set(hObject, `nutshell_${_.toLower(resource)}/rev`, { value: sObject.rev });
      _.set(hObject, `nutshell_${_.toLower(resource)}/updated_at`, { value: sObject.modifiedTime });
      _.set(hObject, `nutshell_${_.toLower(resource)}/created_at`, { value: sObject.createdTime, operation: "setIfNull" });
    }

    if (resource === "Contact") {
      if (_.has(sObject, "name.givenName") && !_.isNil(_.get(sObject, "name.givenName"))) {
        _.set(hObject, "first_name", { value: _.get(sObject, "name.givenName"), operation: "setIfNull" });
        _.set(hObject, "nutshell_contact/first_name", { value: _.get(sObject, "name.givenName") });
      }
      if (_.has(sObject, "name.familyName") && !_.isNil(_.get(sObject, "name.familyName"))) {
        _.set(hObject, "last_name", { value: _.get(sObject, "name.familyName"), operation: "setIfNull" });
        _.set(hObject, "nutshell_contact/last_name", { value: _.get(sObject, "name.familyName") });
      }
      if (_.has(sObject, "htmlUrl") && !_.isNil(_.get(sObject, "htmlUrl"))) {
        _.set(hObject, "nutshell_contact/link", { value: _.get(sObject, "htmlUrl") });
      }
      if (_.has(sObject, "lastContactedDate") && !_.isNil(_.get(sObject, "lastContactedDate"))) {
        _.set(hObject, "nutshell_contact/last_contacted_at", { value: _.get(sObject, "lastContactedDate") });
      }
      if (_.has(sObject, "contactedCount") && !_.isNil(_.get(sObject, "contactedCount"))) {
        _.set(hObject, "nutshell_contact/contacted_count", { value: _.get(sObject, "contactedCount") });
      }
      if (_.has(sObject, "tags") && !_.isNil(_.get(sObject, "tags")) && !_.isEmpty(_.get(sObject, "tags"))) {
        _.set(hObject, "nutshell_contact/tags", { value: _.get(sObject, "tags") });
      }
      if (_.has(sObject, "description") && !_.isNil(_.get(sObject, "description"))) {
        _.set(hObject, "nutshell_contact/description", { value: _.get(sObject, "description") });
      }
      if (_.has(sObject, "email")) {
        _.forIn(_.get(sObject, "email"), (v, k) => {
          if (k === "--primary") {
            _.set(hObject, "email", { value: v, operation: "setIfNull" });
          } else {
            _.set(hObject, `nutshell_contact/email${k}`, { value: v });
          }
        });
      }
    } else if (resource === "Account") {
      if (_.has(sObject, "name") && !_.isNil(_.get(sObject, "name"))) {
        _.set(hObject, "name", { value: _.get(sObject, "name"), operation: "setIfNull" });
      }
      if (_.has(sObject, "name") && !_.isNil(_.get(sObject, "name"))) {
        _.set(hObject, "nutshell/name", { value: _.get(sObject, "name") });
      }
      if (_.has(sObject, "htmlUrl") && !_.isNil(_.get(sObject, "htmlUrl"))) {
        _.set(hObject, "nutshell/link", { value: _.get(sObject, "htmlUrl") });
      }
      if (_.has(sObject, "accountType") && !_.isNil(_.get(sObject, "accountType.id"))) {
        _.set(hObject, "nutshell/accounttype_id", { value: _.get(sObject, "accountType.id") });
      }
      if (_.has(sObject, "accountType") && !_.isNil(_.get(sObject, "accountType.name"))) {
        _.set(hObject, "nutshell/accounttype_name", { value: _.get(sObject, "accountType.name") });
      }
      if (_.has(sObject, "industry") && !_.isNil(_.get(sObject, "industry.id"))) {
        _.set(hObject, "nutshell/industry_id", { value: _.get(sObject, "industry.id") });
      }
      if (_.has(sObject, "industry") && !_.isNil(_.get(sObject, "industry.name"))) {
        _.set(hObject, "nutshell/industry_name", { value: _.get(sObject, "industry.name") });
      }
      if (_.has(sObject, "tags") && !_.isNil(_.get(sObject, "tags")) && !_.isEmpty(_.get(sObject, "tags"))) {
        _.set(hObject, "nutshell/tags", { value: _.get(sObject, "tags") });
      }
      if (_.has(sObject, "lastContactedDate") && !_.isNil(_.get(sObject, "lastContactedDate"))) {
        _.set(hObject, "nutshell/last_contacted_at", { value: _.get(sObject, "lastContactedDate") });
      }
      if (_.has(sObject, "description") && !_.isNil(_.get(sObject, "description"))) {
        _.set(hObject, "nutshell/description", { value: _.get(sObject, "description") });
      }
      if (_.has(sObject, "url")) {
        _.forIn(_.get(sObject, "url"), (v, k) => {
          if (k === "--primary") {
            _.set(hObject, "domain", { value: this.normalizeUrl(v), operation: "setIfNull" });
          } else {
            _.set(hObject, `nutshell/url${k}`, { value: v });
          }
        });
      }
    } else if (resource === "Lead") {
      if (_.has(sObject, "name") && !_.isNil(_.get(sObject, "name"))) {
        _.set(hObject, "name", { value: _.get(sObject, "name"), operation: "setIfNull" });
      }
      if (_.has(sObject, "htmlUrl") && !_.isNil(_.get(sObject, "htmlUrl"))) {
        _.set(hObject, "nutshell_lead/link", { value: _.get(sObject, "htmlUrl") });
      }
      if (_.has(sObject, "milestone.id") && !_.isNil(_.get(sObject, "milestone.id"))) {
        _.set(hObject, "nutshell_lead/milestone_id", { value: _.get(sObject, "milestone.id") });
      }
      if (_.has(sObject, "milestone.name") && !_.isNil(_.get(sObject, "milestone.name"))) {
        _.set(hObject, "nutshell_lead/milestone_name", { value: _.get(sObject, "milestone.name") });
      }
      if (_.has(sObject, "lastContactedDate") && !_.isNil(_.get(sObject, "lastContactedDate"))) {
        _.set(hObject, "nutshell_lead/last_contacted_at", { value: _.get(sObject, "lastContactedDate") });
      }
      if (_.has(sObject, "dueTime") && !_.isNil(_.get(sObject, "dueTime"))) {
        _.set(hObject, "nutshell_lead/due_at", { value: _.get(sObject, "dueTime") });
      }
      if (_.has(sObject, "closedTime") && !_.isNil(_.get(sObject, "closedTime"))) {
        _.set(hObject, "nutshell_lead/closed_at", { value: _.get(sObject, "closedTime") });
      }
      if (_.has(sObject, "estimatedValue.amount") && !_.isNil(_.get(sObject, "estimatedValue.amount"))) {
        _.set(hObject, "nutshell_lead/estimated_value_amount", { value: _.get(sObject, "estimatedValue.amount") });
      }
      if (_.has(sObject, "estimatedValue.currency") && !_.isNil(_.get(sObject, "estimatedValue.currency"))) {
        _.set(hObject, "nutshell_lead/estimated_value_currency", { value: _.get(sObject, "estimatedValue.currency") });
      }
      if (_.has(sObject, "value.amount") && !_.isNil(_.get(sObject, "value.amount"))) {
        _.set(hObject, "nutshell_lead/value_amount", { value: _.get(sObject, "value.amount") });
      }
      if (_.has(sObject, "value.currency") && !_.isNil(_.get(sObject, "value.currency"))) {
        _.set(hObject, "nutshell_lead/value_currency", { value: _.get(sObject, "value.currency") });
      }
      if (_.has(sObject, "market.id") && !_.isNil(_.get(sObject, "market.id"))) {
        _.set(hObject, "nutshell_lead/market_id", { value: _.get(sObject, "market.id") });
      }
      if (_.has(sObject, "market.name") && !_.isNil(_.get(sObject, "market.name"))) {
        _.set(hObject, "nutshell_lead/market_name", { value: _.get(sObject, "market.name") });
      }

      if (_.has(sObject, "assignee.name") && !_.isNil(_.get(sObject, "assignee.name"))) {
        _.set(hObject, "nutshell_lead/assignee_name", { value: _.get(sObject, "assignee.name") });
      }

      if (_.has(sObject, "assignee.emails") && !_.isNil(_.get(sObject, "assignee.emails"))) {
        _.set(hObject, "nutshell_lead/assignee_emails", { value: _.get(sObject, "assignee.emails", []).join(", ") });
      }
      const regularLeadMappings = [
        "description",
        "name",
        "status",
        "confidence",
        "completion",
        "urgency",
        "isOverdue"
      ];

      _.forEach(regularLeadMappings, (m) => {
        if (_.has(sObject, m) && !_.isNil(_.get(sObject, m))) {
          if (resource === "Account") {
            _.set(hObject, `nutshell/${_.snakeCase(m)}`, { value: _.get(sObject, m) });
          } else {
            _.set(hObject, `nutshell_${_.toLower(resource)}/${_.snakeCase(m)}`, { value: _.get(sObject, m) });
          }
        }
      });
    }

    return hObject;
  }

  /**
   * Creates an identifier object for Hull users and accounts based
   * off the information from the Nutshell object.
   *
   * @param {TResourceType} resource The name of the Nutshell resource.
   * @param {*} sObject The Nutshell object.
   * @returns {*} An object that can be passed to `hullClient.asUser` or `hullClient.asAccount`.
   * @memberof AttributesMapper
   */
  mapToHullIdentObject(resource: TResourceType, sObject: Object): Object {
    const ident = { };
    if (resource === "Contact") {
      // We cannot say for sure which email address is the proper one,
      // so stick to anonymous_id
      _.set(ident, "email", _.get(sObject, "email.--primary"));
      _.set(ident, "anonymous_id", `nutshell-contact:${_.get(sObject, "id")}`);
    } else if (resource === "Account") {
      _.set(ident, "anonymous_id", `nutshell-account:${_.get(sObject, "id")}`);
      _.set(ident, "domain", this.normalizeUrl(_.get(sObject, "url.--primary")));
    } else if (resource === "Lead") {
      const aliases = [
        `nutshell-lead:${_.get(sObject, "id")}`
      ];
      // A lead is tied to Contacts and Accounts in Nutshell, however
      // in Hull it is a user, so map it via anonymous_id
      if (_.get(sObject, "contacts[0].id")) {
        _.set(ident, "anonymous_id", `nutshell-contact:${_.get(sObject, "contacts[0].id")}`);
        aliases.push(`nutshell-contact:${_.get(sObject, "contacts[0].id")}`);
      } else {
        _.set(ident, "anonymous_id", `nutshell-lead:${_.get(sObject, "id")}`);
      }
      _.set(ident, "aliases", aliases);
    }

    return ident;
  }

  renderTemplate(value: string, hullObject: THullObject) {
    const liquidRegex = /{{\s*((?:\w*\.*_*\/*-*)*)\s*\|*\s*((?:\w*\.*@*_*\s*=*\/*-*)*\s*)}}/g;
    const message = {
      user: hullObject
    };
    return value
      .replace(liquidRegex, (match, property, defaultValue) => {
        if (property === undefined) {
          return "";
        }
        return _.get(message, property, (defaultValue == null || defaultValue === "") ? "Unknown Value" : defaultValue.trim());
      });
  }

  /**
   * Normalizes the url by stripping everything
   * except hostname.
   *
   * @param {string} original The original url string.
   * @returns {string} The normalized url.
   * @memberof AttributesMapper
   */
  normalizeUrl(original: string): string {
    try {
      const closeUrl = new URL(original);
      return closeUrl.hostname;
    } catch (error) {
      return original;
    }
  }
}

module.exports = AttributesMapper;
