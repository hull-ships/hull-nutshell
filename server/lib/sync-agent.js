/* @flow */
import type { THullUserUpdateMessage, THullConnector, THullReqContext } from "hull";
import type { IMetricsClient, ILogger, IFilterUtil, IFilterResult, IAttributesMapper, IDropdownEntry, INutshellOperationOptions, INutshellClientOptions, INutshellClientResponse, IPatchUtil, IUserUpdateEnvelope, TResourceType } from "./types";

const _ = require("lodash");
const moment = require("moment");
const NutshellClient = require("./service-client");
const uuid = require("uuid/v4");
const cacheManager = require("cache-manager");

const AttributesMapper = require("./utils/attributes-mapper");
const PatchUtil = require("./utils/patch-util");
const FilterUtil = require("./utils/filter-util");
const WebhookUtil = require("./utils/webhook-util");
const DeduplicationUtil = require("./utils/deduplication-util");

class SyncAgent {
  synchronizedSegments: string[];

  hullClient: Object;

  metricsClient: IMetricsClient;

  nutshellClient: NutshellClient;

  connector: THullConnector;

  logger: ILogger;

  filterUtil: IFilterUtil;

  attributesMapper: IAttributesMapper;

  cache: Object;

  patchUtil: IPatchUtil;

  webhookUtil: *;

  deduplicationUtil: *

  constructor(ctx: THullReqContext) {
    const { ship: connector, client: hullClient, metric: metricsClient } = ctx;
    this.connector = connector;
    this.synchronizedSegments = connector.private_settings.synchronized_segments;
    this.hullClient = hullClient;
    this.logger = hullClient.logger;
    this.metricsClient = metricsClient;
    this.cache = cacheManager.caching({ store: "memory", max: 100, ttl: 1800 });
    this.nutshellClient = new NutshellClient(this.composeNutshellClientOptions(connector.private_settings, this.metricsClient));
    this.attributesMapper = new AttributesMapper(connector.private_settings);
    this.patchUtil = new PatchUtil(connector.private_settings);
    this.filterUtil = new FilterUtil(connector.private_settings);
    this.webhookUtil = new WebhookUtil();
    this.deduplicationUtil = new DeduplicationUtil();
  }

  composeNutshellClientOptions(settings: Object, metricsClient: IMetricsClient): INutshellClientOptions {
    const result: INutshellClientOptions = {
      userId: _.get(settings, "api_username", ""),
      apiKey: _.get(settings, "api_key", ""),
      logger: this.hullClient.logger,
      findTimelineLimit: settings.find_timeline_limit,
      metricsClient
    };
    return result;
  }

  /**
   * Returns the fields for Nutshell accounts.
   *
   * @returns {Promise<Array<IDropdownEntry>>} The list of account fields.
   * @memberof Agent
   */
  getAccountFields(): Promise<Array<IDropdownEntry>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        const defaultFields = [
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
          { value: "industryId", label: "Industry (ID)" },
          { value: "accountTypeId", label: "Account Type (ID)" },
          { value: "territoryId", label: "Territory (ID)" },
          { value: "url", label: "Url" },
          { value: "phone", label: "Phone" },
          { value: "note", label: "Note" }
        ];
        return this.nutshellClient.findCustomFields(options).then((opsResult) => {
          const customFields = _.map(opsResult.result.Accounts, (field) => {
            return { value: `customFields.${field.name}`, label: field.name };
          });

          return _.concat(defaultFields, customFields);
        });
      });
  }

  /**
   * Returns the fields for Nutshell contacts.
   *
   * @returns {Promise<Array<IDropdownEntry>>} The list of contact fields.
   * @memberof Agent
   */
  getContactFields(): Promise<Array<IDropdownEntry>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        const defaultFields = [
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
          { value: "territoryId", label: "Territory (ID)" },
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" },
          { value: "url", label: "Url" },
          { value: "note", label: "Note" }
        ];
        return this.nutshellClient.findCustomFields(options).then((opsResult) => {
          const customFields = _.map(opsResult.result.Contacts, (field) => {
            return { value: `customFields.${field.name}`, label: field.name };
          });

          return _.concat(defaultFields, customFields);
        });
      });
  }

  /**
   * Returns the fields for Nutshell leads.
   *
   * @returns {Promise<Array<IDropdownEntry>>} The list of leads fields.
   * @memberof Agent
   */
  getLeadFields(): Promise<Array<IDropdownEntry>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        const defaultFields = [
          { value: "description", label: "Description" },
          { value: "confidence", label: "Confidence" },
          { value: "note", label: "Note" },
          { value: "market.id", label: "Market (Id)" },
          { value: "assignee.id", label: "Assignee (Id)" },
          { value: "sources", label: "Sources (Array of ids)" },
          { value: "competitors", label: "Competitors (Array of ids)" },
          { value: "products", label: "Products (Array of ids)" }
        ];
        return this.nutshellClient.findCustomFields(options).then((opsResult) => {
          const customFields = _.map(opsResult.result.Leads, (field) => {
            return { value: `customFields.${field.name}`, label: field.name };
          });

          return _.concat(defaultFields, customFields);
        });
      });
  }

  /**
   * Retrieves the base url of the API that is cached.
   *
   * @returns {Promise<string>} The base endpoint host name.
   * @memberof Agent
   */
  async getApiBaseHostName(): Promise<string> {
    const { secret } = this.hullClient.configuration();
    const cacheKey = [this.connector.id, _.get(this.connector, "updated_at"), secret, "cf"].join("/");

    return this.cache.wrap(cacheKey, () => {
      return this.nutshellClient.discoverEndpoint();
    }).then((opsResult) => {
      const endpoint: string = _.get(opsResult, "result.api", "n/a");
      if (endpoint === "n/a") {
        return Promise.reject(new Error("The API endpoint discovery yielded no result for the provided username and API key."));
      }
      return Promise.resolve(endpoint);
    }).catch((err) => {
      this.logger.error("connector.metadata.error", { status: err.status, message: err.message, type: "endpoint-discovery" });
      return Promise.reject(err);
    });
  }

  /**
   * Checks whether the API key and User ID are provided at all and hypothetically valid.
   *
   * @returns {boolean} True if both are present and hypothetically valid; otherwise false.
   * @memberof Agent
   */
  isAuthenticationConfigured(): boolean {
    if (_.get(this.connector, "private_settings.api_username", "n/a") === "n/a" ||
        _.isNil(_.get(this.connector, "private_settings.api_username"))) {
      return false;
    }

    if (_.get(this.connector, "private_settings.api_key", "n/a") === "n/a" ||
        _.isNil(_.get(this.connector, "private_settings.api_key"))) {
      return false;
    }

    return true;
  }

  /**
   * Sends the messages to the third party service.
   *
   * @param {THullUserUpdateMessage[]} messages The messages from the platform.
   * @param {boolean} [isBatch=false] True for batch mode to skip filter; otherwise false.
   * @returns {Promise<any>} The result of the send operation.
   * @memberof Agent
   */
  async sendUserUpdateMessages(messages: THullUserUpdateMessage[], isBatch: boolean = false): Promise<*> {
    /* Control Flow - High-level overview
     * ---------------------------------------
     * 1) Check whether we need to filter or if we do batch and simply pass everything along (handled in FilterUtil)
     * 2) Try to find matching accounts and contacts for all envelopes that have been identified as toInsert
     *    and update the envelope if we found a matching entity
     * 3) Check the revision for each account and contact that has been identified as toUpdate and update the
     *    envelope accordingly, otherwise the edit operation will fail.
     * 4) Execute all insert/update operations against the Nutshell API.
     */
    const deduplicatedMessages = this.deduplicationUtil.deduplicateUserMessages(messages);
    const envelopes: Array<IUserUpdateEnvelope> = _.map(deduplicatedMessages, (m) => {
      return {
        message: m
      };
    });

    envelopes.map((envelope) => {
      return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.debug("outgoing.user.start");
    });

    // Use for all subsequent calls
    const baseHostname = await this.getApiBaseHostName();
    const searchMax = 10;

    if (_.get(this.connector, "private_settings.account_sync_enabled", false) === true) {
      /*
       * --- Verify: Accounts.toInsert
       */
      let accountsFilterResult: IFilterResult = this.filterUtil.filterAccounts(envelopes, isBatch);

      // Attempt to retrieve accounts for all that are marked as `toInsert`
      // to check if we simply haven't retrieved them before
      _.map(accountsFilterResult.toInsert, async (envelope) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        try {
          const accountSearchClientResponse = await this.nutshellClient.searchAccounts(_.get(envelope, "message.user.account.domain", ""), searchMax, options);
          if (!_.isEmpty(_.get(accountSearchClientResponse, "result", []))) {
            // Assume the first matching stub is the best match,
            // set the currentNutshellAccount object
            // and add the necessary id and rev fields for a patch
            const currentAccountData = _.first(_.get(accountSearchClientResponse, "result"));
            _.set(envelope, "currentNutshellAccount", currentAccountData);
            _.set(envelope, "message.user.account.nutshell/id", _.get(currentAccountData, "id", null));
            _.set(envelope, "message.user.account.nutshell/rev", _.get(currentAccountData, "rev", null));
          }
        } catch (err) {
          this.hullClient.asAccount(_.get(envelope, "message.user.account", {})).logger.error("outgoing.query.error", { reason: "Failed to search for account", details: err });
        }
      });

      // Re-run the filter to ensure that we handle inserts and updates appropriately
      accountsFilterResult = this.filterUtil.filterAccounts(_.concat(accountsFilterResult.toInsert, accountsFilterResult.toUpdate, accountsFilterResult.toSkip), isBatch);

      /*
       * --- Process: Accounts.toInsert
       */
      _.map(accountsFilterResult.toInsert, async (envelope) => {
        const data = this.attributesMapper.mapToServiceObject("Account", _.get(envelope, "message.user", {}));
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        try {
          const response = await this.nutshellClient.createAccount(data, options);
          await this.handleNutshellResponse("Account", envelope, response, data);
          _.set(envelope, "currentNutshellAccount", response.result);
          _.set(envelope, "message.user.account.nutshell/id", _.get(response.result, "id", null));
          _.set(envelope, "message.user.account.nutshell/rev", _.get(response.result, "rev", null));
        } catch (err) {
          this.hullClient.asAccount(_.get(envelope, "message.user.account", {})).logger.error("outgoing.account.error", { reason: "Failed to create a new account", details: err });
        }
      });

      /*
       * --- Process: Accounts.toUpdate
       */
      _.map(accountsFilterResult.toUpdate, async (envelope) => {
        let reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };
        try {
          const currentObjectResponse = await this.nutshellClient.getResourceById("Account", _.get(envelope, "message.user.account.nutshell/id"), null, options);
          const currentObject = currentObjectResponse.result;
          const newObject = this.attributesMapper.mapToServiceObject("Account", _.get(envelope, "message.user", {}));
          const patchResult = this.patchUtil.createPatchObject("Account", newObject, currentObject);
          if (patchResult.hasChanges) {
            reqId = uuid();
            _.set(options, "requestId", reqId);
            const response = await this.nutshellClient.editAccount(_.get(newObject, "id"), _.get(newObject, "rev"), patchResult.patchObject, options);
            await this.handleNutshellResponse("Account", envelope, response, patchResult.patchObject);
          } else {
            this.hullClient.asAccount(_.get(envelope, "message.user.account", {})).logger.info("outgoing.account.skip", { reason: "Data already in sync with Nutshell." });
          }
        } catch (err) {
          this.hullClient.asAccount(_.get(envelope, "message.user.account", {})).logger.error("outgoing.account.error", { reason: "Failed to update an existing account", details: err });
        }
      });

      /*
       * --- Process: Accounts.toSkip
       */
      _.map(accountsFilterResult.toSkip, (envelope) => {
        this.hullClient.asAccount(_.get(envelope, "message.user.account", {})).logger.info("outgoing.account.skip", { reason: envelope.skipReason });
      });
    }

    /*
     * --- Verify: Contacts.toInsert
     */
    let contactsFilterResult: IFilterResult = this.filterUtil.filterContacts(envelopes, isBatch);

    // Attempt to retrieve contacts for all that are marked as `toInsert`
    // to check if we simply haven't retrieved them before
    await Promise.all(contactsFilterResult.toInsert.map(async (envelope) => {
      const reqId = uuid();
      const options: INutshellOperationOptions = {
        host: baseHostname,
        requestId: reqId
      };

      try {
        const emailSearchClientResponse = await this.nutshellClient.searchByEmail(_.get(envelope, "message.user.email", ""), options);
        if (!_.isEmpty(_.get(emailSearchClientResponse, "result.contacts", []))) {
          // Assume the first matching stub is the best match,
          // set the currentNutshellAccount object
          // and add the necessary id and rev fields for a patch
          const currentContactData = _.first(_.get(emailSearchClientResponse, "result.contacts"));
          _.set(envelope, "currentNutshellContact", currentContactData);
          _.set(envelope, "message.user.traits_nutshell_contact/id", _.get(currentContactData, "id", null));
          _.set(envelope, "message.user.traits_nutshell_contact/rev", _.get(currentContactData, "rev", null));
        }
        return Promise.resolve(true);
      } catch (err) {
        return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.query.error", { reason: "Failed to search for contacts by email", details: err });
      }
    }));

    // Re-run the filter to ensure that we handle inserts and updates appropriately
    contactsFilterResult = this.filterUtil.filterContacts(_.concat(contactsFilterResult.toInsert, contactsFilterResult.toUpdate, contactsFilterResult.toSkip), isBatch);
    /*
     * --- Process: Contacts.toInsert
     */
    await Promise.all(contactsFilterResult.toInsert.map(async (envelope) => {
      const data = this.attributesMapper.mapToServiceObject("Contact", _.get(envelope, "message.user", {}));
      const reqId = uuid();
      const options: INutshellOperationOptions = {
        host: baseHostname,
        requestId: reqId
      };
      try {
        const response = await this.nutshellClient.createContact(data, options);
        _.set(envelope, "currentNutshellContact", response.result);
        _.set(envelope, "message.user.traits_nutshell_contact/id", _.get(response.result, "id", null));
        _.set(envelope, "message.user.traits_nutshell_contact/rev", _.get(response.result, "rev", null));
        return await this.handleNutshellResponse("Contact", envelope, response, data);
      } catch (err) {
        return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.user.error", { reason: "Failed to create a new user", details: err });
      }
    }));

    /*
     * --- Process: Contacts.toUpdate
     */
    await Promise.all(contactsFilterResult.toUpdate.map(async (envelope) => {
      let reqId = uuid();
      const options: INutshellOperationOptions = {
        host: baseHostname,
        requestId: reqId
      };
      try {
        const currentContactId = _.get(envelope, "currentNutshellContact.id", _.get(envelope, "message.user.traits_nutshell_contact/id"));
        const currentObjectResponse = await this.nutshellClient.getResourceById("Contact", currentContactId, null, options);
        const currentObject = currentObjectResponse.result;
        // TODO: quick workaround
        _.set(envelope, "message.user.traits_nutshell_contact/rev", _.get(currentObject, "rev", null));
        const newObject = this.attributesMapper.mapToServiceObject("Contact", _.get(envelope, "message.user", {}));
        const patchResult = this.patchUtil.createPatchObject("Contact", newObject, currentObject);
        if (patchResult.hasChanges) {
          reqId = uuid();
          _.set(options, "requestId", reqId);
          const response = await this.nutshellClient.editContact(_.get(newObject, "id"), _.get(newObject, "rev"), patchResult.patchObject, options);
          return await this.handleNutshellResponse("Contact", envelope, response, patchResult.patchObject);
        }
        await this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.info("outgoing.user.skip", { reason: "Data already in sync with Nutshell." });
        return this.fetchAdditionalActivites("Contact", currentObjectResponse.result, envelope.message);
      } catch (err) {
        return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.user.error", { reason: "Failed to update an existing contact", details: _.get(err, "message", "") });
      }
    }));

    /*
     * --- Process: Contacts.toSkip
     */
    contactsFilterResult.toSkip.map((envelope) => {
      return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.info("outgoing.user.skip", { reason: envelope.skipReason });
    });

    /*
     * --- Verify: Leads.toInsert
     */
    let leadsFilterResult: IFilterResult = this.filterUtil.filterLeads(envelopes, isBatch);

    // Attempt to retrieve contacts for all that are marked as `toInsert`
    // to check if we simply haven't retrieved them before
    await Promise.all(leadsFilterResult.toInsert.map(async (envelope) => {
      const reqId = uuid();
      const options: INutshellOperationOptions = {
        host: baseHostname,
        requestId: reqId
      };

      try {
        const leadsSearchResponse = await this.nutshellClient.findLeads(_.get(envelope, "message.user.traits_nutshell_contact/id", ""), options);
        if (!_.isEmpty(_.get(leadsSearchResponse, "result", []))) {
          // Assume the first matching stub is the best match,
          // set the currentNutshellAccount object
          // and add the necessary id and rev fields for a patch
          const currentLeadData = _.first(_.get(leadsSearchResponse, "result", []));
          _.set(envelope, "currentNutshellLead", currentLeadData);
          _.set(envelope, "message.user.traits_nutshell_lead/id", _.get(currentLeadData, "id", null));
          _.set(envelope, "message.user.traits_nutshell_lead/rev", _.get(currentLeadData, "rev", null));
        }
        return Promise.resolve(true);
      } catch (err) {
        return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.query.error", { reason: "Failed to search leads by name", details: _.get(err, "message", "") });
      }
    }));

    // Re-run the filter to ensure that we handle inserts and updates appropriately
    leadsFilterResult = this.filterUtil.filterLeads(_.concat(leadsFilterResult.toInsert, leadsFilterResult.toUpdate, leadsFilterResult.toSkip), isBatch);

    /*
     * --- Process: Contacts.toInsert
     */
    await Promise.all(leadsFilterResult.toInsert.map(async (envelope) => {
      const data = this.attributesMapper.mapToServiceObject("Lead", _.get(envelope, "message.user", {}));
      const reqId = uuid();
      const options: INutshellOperationOptions = {
        host: baseHostname,
        requestId: reqId
      };
      try {
        const response = await this.nutshellClient.createLead(data, options);
        return await this.handleNutshellResponse("Lead", envelope, response, data);
      } catch (err) {
        return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.user.error", { reason: "Failed to create a new user", details: _.get(err, "message", "") });
      }
    }));

    /*
     * --- Process: Contacts.toUpdate
     */
    await Promise.all(leadsFilterResult.toUpdate.map(async (envelope) => {
      let reqId = uuid();
      const options: INutshellOperationOptions = {
        host: baseHostname,
        requestId: reqId
      };
      try {
        const currentLeadId = _.get(envelope, "currentNutshellLead.id", _.get(envelope, "message.user.traits_nutshell_lead/id"));
        const currentObjectResponse = await this.nutshellClient.getResourceById("Lead", currentLeadId, null, options);
        const currentObject = currentObjectResponse.result;
        // TODO: quick workaround
        _.set(envelope, "message.user.traits_nutshell_lead/rev", _.get(currentObject, "rev", null));
        const newObject = this.attributesMapper.mapToServiceObject("Lead", _.get(envelope, "message.user", {}));
        const patchResult = this.patchUtil.createPatchObject("Lead", newObject, currentObject);
        if (patchResult.hasChanges) {
          reqId = uuid();
          _.set(options, "requestId", reqId);
          const response = await this.nutshellClient.editLead(_.get(newObject, "id"), _.get(newObject, "rev"), patchResult.patchObject, options);
          return await this.handleNutshellResponse("Lead", envelope, response, patchResult.patchObject);
        }
        await this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.info("outgoing.user.skip", { reason: "Data already in sync with Nutshell." });
        return this.fetchAdditionalActivites("Lead", currentObjectResponse.result, envelope.message);
      } catch (err) {
        return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.user.error", { reason: "Failed to update an existing lead", details: _.get(err, "message", "") });
      }
    }));

    /*
     * --- Process: Contacts.toSkip
     */
    leadsFilterResult.toSkip.map((envelope) => {
      return this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.info("outgoing.user.skip", { reason: envelope.skipReason });
    });

    return Promise.resolve(messages);
  }

  async handleWebhookPayload(body: any): Promise<boolean> {
    if (!_.isObject(body)) {
      return Promise.resolve(false);
    }
    const baseHostname = await this.getApiBaseHostName();
    _.forEach(_.get(body, "payloads"), async (p) => {
      if (this.webhookUtil.isActivity(p)) {
        if (this.webhookUtil.skipActivity(body, p)) {
          return;
        }
        // We don't have a real object in this case, but we can query the API
        // and process the response
        // TODO: Add async function to the agent which takes the id and handles the rest
        const activityId = this.webhookUtil.extractIdentifierFromPayload(p);
        const linkedObjects = this.webhookUtil.getLinkedObjects(p);
        const promises = [];
        for (let i = 0; i < linkedObjects.length; i += 1) {
          const linkedObject = linkedObjects[i];
          if (linkedObject.type === "Account") {
            // TODO: since we don't support Account events for now we skip such activity
            continue; // eslint-disable-line no-continue
          }
          let options: INutshellOperationOptions = {
            host: baseHostname,
            requestId: uuid()
          };
          const currentLinkedObjectResponse = await this.nutshellClient.getResourceById(linkedObject.type, linkedObject.id, null, options); // eslint-disable-line no-await-in-loop
          const relatedIdents: number = linkedObject.type === "Lead" && _.size(_.get(currentLinkedObjectResponse.result, "contacts", [])) > 1
            ? _.size(_.get(currentLinkedObjectResponse.result, "contacts", []))
            : 1;
          options = {
            host: baseHostname,
            requestId: uuid()
          };
          const currentObjectResponse = await this.nutshellClient.getResourceById("Activity", activityId, null, options); // eslint-disable-line no-await-in-loop

          for (let j = 0; j < relatedIdents; j += 1) {
            const hullIdent = this.attributesMapper.mapToHullIdentObject(linkedObject.type, currentLinkedObjectResponse.result, j);
            const hullTrack = this.webhookUtil.getWebhookHullTrack(currentObjectResponse.result);
            const hullAttributes = this.attributesMapper.mapToHullAttributeObject(linkedObject.type, currentLinkedObjectResponse.result);
            const asUser = this.hullClient.asUser(hullIdent);
            promises.push(asUser.track(hullTrack.name, hullTrack.params, hullTrack.context)
              .then(() => asUser.logger.info("incoming.event.success", hullTrack))
              .catch((error) => asUser.logger.info("incoming.event.error", { error })));
            promises.push(asUser.traits(hullAttributes)
              .then(() => asUser.logger.info("incoming.user.success", hullAttributes))
              .catch((error) => asUser.logger.info("incoming.user.error", { error })));
          }
        }
        await Promise.all(promises);
      } else if (this.webhookUtil.isObjectUpdate(p)) {
        const objectType = this.webhookUtil.getObjectType(p);
        if (objectType === undefined) {
          return;
        }
        // We potentially have the correct data but
        // the payload is lacking the revision number,
        // so we need to fetch the entire object from the API
        // TODO: Add async function to the agent which takes the id and handles the rest
        const id = this.webhookUtil.extractIdentifierFromPayload(p);
        let options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: uuid()
        };
        const currentObjectResponse = await this.nutshellClient.getResourceById(objectType, id, null, options);
        const hullAttributes = this.attributesMapper.mapToHullAttributeObject(objectType, currentObjectResponse.result);
        const relatedIdents: number = objectType === "Lead" && _.size(_.get(currentObjectResponse.result, "contacts", [])) > 1
          ? _.size(_.get(currentObjectResponse.result, "contacts", []))
          : 1;
        const promises = [];
        for (let i = 0; i < relatedIdents; i += 1) {
          const hullIdent = this.attributesMapper.mapToHullIdentObject(objectType, currentObjectResponse.result, i);
          let asUser;
          let logKey;
          if (objectType === "Account") {
            asUser = this.hullClient.asAccount(hullIdent);
            logKey = "account";
          } else {
            asUser = this.hullClient.asUser(hullIdent);
            logKey = "user";
          }

          promises.push(asUser.traits(hullAttributes)
            .then(() => asUser.logger.info(`incoming.${logKey}.success`, hullAttributes))
            .catch((error) => asUser.logger.info(`incoming.${logKey}.error`, { error })));
        }

        await Promise.all(promises);

        await this.fetchAdditionalActivites(objectType, currentObjectResponse.result);

        const accountId = this.webhookUtil.getLinkedAccountId(p);
        if (accountId) {
          options = {
            host: baseHostname,
            requestId: uuid()
          };
          const currentAccountResponse = await this.nutshellClient.getResourceById("Account", accountId, null, options);
          const hullAccountIdent = this.attributesMapper.mapToHullIdentObject("Account", currentAccountResponse.result);
          if (hullAccountIdent.domain !== undefined) {
            const promises2 = [];
            for (let i = relatedIdents - 1; i >= 0; i -= 1) {
              const hullIdent = this.attributesMapper.mapToHullIdentObject(objectType, currentObjectResponse.result, i);
              const asAccount = this.hullClient.asUser(hullIdent).account(hullAccountIdent);
              promises2.push(asAccount
                .traits({})
                .then(() => asAccount.logger.info("incoming.account-link.success"))
                .catch((error) => asAccount.logger.info("incoming.account-link.error", { error })));
            }
            await Promise.all(promises2);
          }
        }
      }
    });
    return Promise.resolve(_.isObject(body));
  }

  async fetchAdditionalActivites(objectType: TResourceType, nutshellObject: Object, message?: Object) {
    const baseHostname = await this.getApiBaseHostName();
    const options: INutshellOperationOptions = {
      host: baseHostname,
      requestId: uuid()
    };
    const response = await this.nutshellClient.findTimeline(objectType, nutshellObject.id, options);
    const filteredActivities = _.get(response, "result", []).filter(p => this.webhookUtil.isAdditionalActivity(p));
    const hullIdent = this.attributesMapper.mapToHullIdentObject(objectType, nutshellObject);

    let latestTrackedEventCreatedAt = null;

    if (message && message.events) {
      latestTrackedEventCreatedAt = _.chain(message.events)
        .filter(event => event.event_source === "nutshell")
        .sortBy(event => new Date(event.created_at))
        .last()
        .get("created_at")
        .value();
    }

    return Promise.all(filteredActivities.map((activity) => {
      const hullTrack = this.webhookUtil.getActivityHullTrack(activity);

      if (latestTrackedEventCreatedAt && moment(hullTrack.context.created_at).isAfter(moment(latestTrackedEventCreatedAt)) === false) {
        return Promise.resolve();
      }

      const asUser = this.hullClient.asUser(hullIdent);
      return asUser.track(hullTrack.name, hullTrack.params, hullTrack.context)
        .then(() => asUser.logger.info("incoming.event.success", hullTrack))
        .catch((error) => asUser.logger.info("incoming.event.error", { error }));
    }));
  }

  /**
   * Gets all active products.
   *
   * @param {number} [limit=50] The maximum number of results to retrieve.
   * @returns {Promise<Array<*>>} A list of products.
   * @memberof SyncAgent
   */
  async findProducts(limit: number = 50): Promise<Array<*>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        return this.nutshellClient.findProducts(limit, options).then((opsResult) => {
          return _.get(opsResult, "result", []);
        });
      });
  }

  /**
   * Gets all active markets.
   *
   * @param {number} [limit=50] The maximum number of results to retrieve.
   * @returns {Promise<Array<*>>} A list of markets.
   * @memberof SyncAgent
   */
  async findMarkets(limit: number = 50): Promise<Array<*>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        return this.nutshellClient.findMarkets(limit, options).then((opsResult) => {
          return _.get(opsResult, "result", []);
        });
      });
  }

  /**
   * Gets all active sources.
   *
   * @param {number} [limit=50] The maximum number of results to retrieve.
   * @returns {Promise<Array<*>>} A list of sources.
   * @memberof SyncAgent
   */
  async findSources(limit: number = 50): Promise<Array<*>> {
    return this.getApiBaseHostName()
      .then((baseHostname: string) => {
        const reqId = uuid();
        const options: INutshellOperationOptions = {
          host: baseHostname,
          requestId: reqId
        };

        return this.nutshellClient.findSources(limit, options).then((opsResult) => {
          return _.get(opsResult, "result", []);
        });
      });
  }

  handleNutshellResponse(resource: TResourceType, envelope: IUserUpdateEnvelope, response: INutshellClientResponse, writtenData: Object): Promise<*> {
    if (!_.isNil(response.error)) {
      if (resource === "Account") {
        this.hullClient.asAccount(_.get(envelope, "message.user.account", {})).logger.error("outgoing.account.error", { reason: "Failed to execute an operation for an account", details: response, writtenData });
      } else if (resource === "Contact") {
        this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.user.error", { reason: "Failed to execute an operation for a contact", details: response, writtenData });
      } else if (resource === "Lead") {
        this.hullClient.asUser(_.get(envelope, "message.user", {})).logger.error("outgoing.user.error", { reason: "Failed to execute an operation for a lead", details: response, writtenData });
      }
      return Promise.resolve();
    }

    const traitsObj = this.attributesMapper.mapToHullAttributeObject(resource, response.result);
    if (resource === "Account") {
      const asAccount = this.hullClient.asAccount(_.get(envelope, "message.user.account", {}));
      return asAccount.traits(traitsObj).then(() => {
        asAccount.logger.info("outgoing.account.success", { writtenData });
        this.incrementOutgoingCount(resource);
        return Promise.resolve();
      });
    } else if (resource === "Contact") {
      const asUser = this.hullClient.asUser(_.get(envelope, "message.user", {}));
      return asUser.traits(traitsObj).then(() => {
        asUser.logger.info("outgoing.user.success", { writtenData, resource: "Contact" });
        this.incrementOutgoingCount(resource);
        return Promise.resolve();
      });
    } else if (resource === "Lead") {
      const asUser = this.hullClient.asUser(_.get(envelope, "message.user", {}));
      return asUser.traits(traitsObj).then(() => {
        asUser.logger.info("outgoing.user.success", { writtenData, resource: "Lead" });
        this.incrementOutgoingCount(resource);
        return Promise.resolve();
      });
    }

    return Promise.resolve();
  }

  incrementOutgoingCount(resource: TResourceType, value: number = 1) {
    if (!_.isNil(this.metricsClient)) {
      let metricName = "n/a";
      switch (resource) {
        case "Account":
          metricName = "ship.outgoing.accounts";
          break;
        default:
          metricName = "ship.outgoing.users";
          break;
      }

      if (metricName !== "n/a") {
        this.metricsClient.increment(metricName, value);
      }
    }
  }
}

module.exports = SyncAgent;
