/* @flow */
import type { IFilterResult, IUserUpdateEnvelope, IFilterUtil } from "../types";

const _ = require("lodash");

class FilterResult implements IFilterResult {
  toInsert: Array<IUserUpdateEnvelope>;
  toUpdate: Array<IUserUpdateEnvelope>;
  toSkip: Array<IUserUpdateEnvelope>;

  constructor() {
    this.toInsert = [];
    this.toUpdate = [];
    this.toSkip = [];
  }
}

class FilterUtil implements IFilterUtil {
  synchronizedSegments: Array<string>;

  leadSynchronizedSegments: Array<string>;

  /**
   * Creates an instance of FilterUtil.
   * @param {Object} settings The settings of the connector which define synchronized_segments.
   * @memberof FilterUtil
   */
  constructor(settings: Object) {
    this.synchronizedSegments = _.get(settings, "synchronized_segments", []);
    this.leadSynchronizedSegments = _.get(settings, "lead_synchronized_segments", []);
  }

  /**
   * Filters accounts to update, insert or skip.
   *
   * @param {Array<IUserUpdateEnvelope>} envelopes The envelopes to filter.
   * @param {boolean} [skipSegmentCheck=false] True for batch mode to skip segment filter; otherwise false.
   * @returns {IFilterResult} A filter result that determines which accounts to insert, update or skip.
   * @memberof FilterUtil
   */
  filterAccounts(envelopes: Array<IUserUpdateEnvelope>, skipSegmentCheck: boolean = false): IFilterResult {
    const results: IFilterResult = new FilterResult();

    envelopes.forEach((envelope) => {
      if (!_.has(envelope, "message.user.account.id") && !_.has(envelope, "message.account.id")) {
        envelope.skipReason = "User doesn't have any account information";
        return results.toSkip.push(envelope);
      }

      if (skipSegmentCheck === true || (this.matchesWhitelistedSegments(envelope) && skipSegmentCheck === false)) {
        if (_.has(envelope.message, "account.nutshell/id")) {
          return results.toUpdate.push(envelope);
        }
        return results.toInsert.push(envelope);
      }

      envelope.skipReason = "Account doesn't belong to synchronized segments.";
      return results.toSkip.push(envelope);
    });

    return results;
  }

  /**
   * Filters users to update, insert or skip.
   *
   * @param {Array<IUserUpdateEnvelope>} envelopes The envelopes to filter.
   * @param {boolean} [skipSegmentCheck=false] True for batch mode to skip segment filter; otherwise false.
   * @returns {IFilterResult} A filter result that determines which users to insert, update or skip.
   * @memberof FilterUtil
   */
  filterContacts(envelopes: Array<IUserUpdateEnvelope>, skipSegmentCheck: boolean = false): IFilterResult {
    const results: IFilterResult = new FilterResult();

    if (skipSegmentCheck === true) {
      envelopes.forEach((envelope) => {
        envelope.skipReason = "Batch mode not supported to sync users.";
        return results.toSkip.push(envelope);
      });
      return results;
    }

    envelopes.forEach((envelope) => {
      if (this.matchesWhitelistedSegments(envelope)) {
        if (_.has(envelope.message, "user.traits_nutshell_contact/id")) {
          return results.toUpdate.push(envelope);
        }
        return results.toInsert.push(envelope);
      }

      envelope.skipReason = "User doesn't belong to synchronized segments.";
      return results.toSkip.push(envelope);
    });

    return results;
  }

  /**
   * Filters users as leads to update, insert or skip.
   *
   * @param {Array<IUserUpdateEnvelope>} envelopes The envelopes to filter.
   * @param {boolean} [skipSegmentCheck=false] True for batch mode to skip segment filter; otherwise false.
   * @returns {IFilterResult} A filter result that determines which users to insert, update or skip.
   * @memberof FilterUtil
   */
  filterLeads(envelopes: Array<IUserUpdateEnvelope>, skipSegmentCheck: boolean = false): IFilterResult {
    const results: IFilterResult = new FilterResult();

    if (skipSegmentCheck === true) {
      envelopes.forEach((envelope) => {
        envelope.skipReason = "Batch mode not supported to sync users as leads.";
        return results.toSkip.push(envelope);
      });
      return results;
    }

    envelopes.forEach((envelope) => {
      if (this.matchesWhitelistedSegments(envelope)) {
        if (_.has(envelope.message, "user.traits_nutshell_lead/id")) {
          return results.toUpdate.push(envelope);
        }
        return results.toInsert.push(envelope);
      }

      envelope.skipReason = "User doesn't belong to synchronized segments";
      return results.toSkip.push(envelope);
    });

    return results;
  }

  /**
   * Checks whether the user in the envelope's message
   * is part of the whitelisted segments.
   *
   * @param {IUserUpdateEnvelope} envelope The envelope to process.
   * @returns {boolean} True if the user is in the whitelisted segments; otherwise false.
   * @memberof FilterUtil
   */
  matchesWhitelistedSegments(envelope: IUserUpdateEnvelope): boolean {
    const messageSegmentIds = _.get(envelope, "message.segments", []).map(s => s.id);
    if (_.intersection(messageSegmentIds, this.synchronizedSegments).length > 0) {
      return true;
    }
    return false;
  }
}

module.exports = FilterUtil;
