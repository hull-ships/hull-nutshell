
const _ = require("lodash");
const nock = require("nock");

const Agent = require("../../server/lib/sync-agent");
const contactChangedPayload = require("../fixtures/webhook-contactchanged.json");
const contactNewPayload = require("../fixtures/api_contact_new.json");
const leadNewPayload = require("../fixtures/api_lead_new.json");
const contactUpdatePayload = require("../fixtures/api_contact_edit.json");
const accountNewPayload = require("../fixtures/api_account_new.json");
const invalidRequestPayload = require("../fixtures/api_invalid_request.json");
const discoveryPayload = require("../fixtures/api_discovery.json");
const searchByEmailEmptyPayload = require("../fixtures/api_searchbyemail_empty.json");
const searchLeadsEmptyPayload = require("../fixtures/api_searchleads_empty.json");
const messagesToInsert = require("../fixtures/messages_contact_insert.json");
const messagesToUpdate = require("../fixtures/messages_contact_update.json");
const messagesToSkip = require("../fixtures/messages_contact_skip.json");

const { ConnectorMock } = require("../helper/connector-mock");
const { HullClientMock } = require("../helper/hull-client-mock");
const { MetricsClientMock } = require("../helper/metrics-client-mock");

describe("Agent", () => {
  const PRIVATE_SETTINGS = {
    synchronized_segments: ["123"],
    account_attributes_outbound: [
      {
        hull_field_name: "account.domain",
        nutshell_field_name: "url",
        overwrite: false
      },
      {
        hull_field_name: "account.name",
        nutshell_field_name: "name",
        overwrite: true
      }
    ],
    contact_attributes_outbound: [
      { hull_field_name: "name", nutshell_field_name: "name", overwrite: true },
      { hull_field_name: "traits_title", nutshell_field_name: "title", overwrite: true },
      { hull_field_name: "email", nutshell_field_name: "email", overwrite: false }
    ]
  };

  beforeEach(() => {
    if (!nock.isActive()) {
      nock.activate();
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("should initialize all `injected objects`", () => {
    const client = new HullClientMock();
    const metrics = new MetricsClientMock();
    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const agent = new Agent({ client, ship: connector, metric: metrics });

    expect(agent.connector).toEqual(connector);
    expect(agent.synchronizedSegments).toEqual(PRIVATE_SETTINGS.synchronized_segments);
    expect(agent.hullClient).toEqual(client);
    expect(agent.logger).toEqual(client.logger);
    expect(agent.metricsClient).toEqual(metrics);
    expect(agent.cache).toBeDefined();
    expect(agent.nutshellClient).toBeDefined();
    expect(agent.attributesMapper).toBeDefined();
    expect(agent.patchUtil).toBeDefined();
    expect(agent.filterUtil).toBeDefined();
  });

  test("should return true for auth check if `api_username` and `api_key` are present", () => {
    const pSettings = {
      synchronized_segments: PRIVATE_SETTINGS.synchronized_segments,
      api_username: "someone@test.io",
      api_key: "some123foo876baz=="
    };

    const client = new HullClientMock();
    const metrics = new MetricsClientMock();
    const connector = new ConnectorMock("1234", {}, pSettings);

    const agent = new Agent({ client, ship: connector, metric: metrics });
    const actual = agent.isAuthenticationConfigured();
    expect(actual).toBeTruthy();
  });

  test("should return false for auth check if `api_username` is missing", () => {
    const pSettings = {
      synchronized_segments: PRIVATE_SETTINGS.synchronized_segments,
      api_key: "some123foo876baz=="
    };

    const client = new HullClientMock();
    const metrics = new MetricsClientMock();
    const connector = new ConnectorMock("1234", {}, pSettings);

    const agent = new Agent({ client, ship: connector, metric: metrics });
    const actual = agent.isAuthenticationConfigured();
    expect(actual).toBeFalsy();
  });

  test("should return false for auth check if `api_key` is missing", () => {
    const pSettings = {
      synchronized_segments: PRIVATE_SETTINGS.synchronized_segments,
      api_username: "someone@test.io"
    };

    const client = new HullClientMock();
    const metrics = new MetricsClientMock();
    const connector = new ConnectorMock("1234", {}, pSettings);

    const agent = new Agent({ client, ship: connector, metric: metrics });
    const actual = agent.isAuthenticationConfigured();
    expect(actual).toBeFalsy();
  });

  test("should not fail when incrementing outgoing count if no metrics client is present", () => {
    const client = new HullClientMock();
    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const agent = new Agent({ client, ship: connector });

    expect(() => agent.incrementOutgoingCount("Account", 1)).not.toThrow();
  });

  test("should increment the counter for `ship.outgoing.accounts` if metrics client is instrumented", () => {
    const client = new HullClientMock();
    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const valueMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);
    metricsMock.value = valueMock.bind(metricsMock);

    const agent = new Agent({ client, ship: connector, metric: metricsMock });

    agent.incrementOutgoingCount("Account");
    expect(incrementMock.mock.calls[0][0]).toEqual("ship.outgoing.accounts");
    expect(incrementMock.mock.calls[0][1]).toEqual(1);
  });

  test("should increment the counter for `ship.outgoing.users` if metrics client is instrumented", () => {
    const client = new HullClientMock();
    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);

    const agent = new Agent({ client, ship: connector, metric: metricsMock });

    agent.incrementOutgoingCount("Contacts");
    expect(incrementMock.mock.calls[0][0]).toEqual("ship.outgoing.users");
    expect(incrementMock.mock.calls[0][1]).toEqual(1);
  });

  test("should handle a successful contact response", (done) => {
    const loggerMock = {};
    const infoMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.info = infoMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asUserMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const clientMock = {};
    clientMock.asUser = asUserMock.bind(clientMock);

    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);


    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    const envelope = {
      message: {
        user: {
          id: "1234",
          email: "someother@testhull.io"
        }
      }
    };

    const sObject = contactNewPayload.result;
    const expectedTraitsObject = {
      "nutshell_contact/id": { value: sObject.id },
      "nutshell_contact/rev": { value: sObject.rev },
      "nutshell_contact/first_name": { value: sObject.name.givenName },
      "nutshell_contact/last_name": { value: sObject.name.familyName },
      "nutshell_contact/created_at": { value: sObject.createdTime, operation: "setIfNull" },
      "nutshell_contact/updated_at": { value: sObject.modifiedTime },
      email: { value: sObject.email["--primary"], operation: "setIfNull" },
      first_name: { value: sObject.name.givenName, operation: "setIfNull" },
      last_name: { value: sObject.name.familyName, operation: "setIfNull" },
      "nutshell_contact/link": { value: sObject.htmlUrl },
      "nutshell_contact/email1": { value: sObject.email[1] },
      "nutshell_contact/contacted_count": { value: sObject.contactedCount }
    };

    agent.handleNutshellResponse("Contact", envelope, contactNewPayload).then(() => {
      expect(traitsMock.mock.calls[0][0]).toEqual(expectedTraitsObject);
      expect(infoMock.mock.calls[0][0]).toEqual("outgoing.user.success");
      expect(infoMock.mock.calls[0][1]).toEqual({ data: sObject });
      expect(incrementMock.mock.calls[0][0]).toEqual("ship.outgoing.users");
      expect(incrementMock.mock.calls[0][1]).toEqual(1);
      expect(asUserMock.mock.calls[0][0]).toEqual(envelope.message.user);
      done();
    });
  });

  test("should handle an erroneous contact response", (done) => {
    const loggerMock = {};
    const errorMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.error = errorMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asUserMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const clientMock = {};
    clientMock.asUser = asUserMock.bind(clientMock);

    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);


    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    const envelope = {
      message: {
        user: {
          id: "1234",
          email: "someother@testhull.io"
        }
      }
    };

    agent.handleNutshellResponse("Contact", envelope, invalidRequestPayload).then(() => {
      expect(errorMock.mock.calls[0][0]).toEqual("outgoing.user.error");
      expect(errorMock.mock.calls[0][1]).toEqual({ reason: "Failed to execute an operation for a contact", details: invalidRequestPayload });
      expect(asUserMock.mock.calls[0][0]).toEqual(envelope.message.user);
      done();
    });
  });

  test("should handle a successful account response", (done) => {
    const loggerMock = {};
    const infoMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.info = infoMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asAccountMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const clientMock = {};
    clientMock.asAccount = asAccountMock.bind(clientMock);

    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);


    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    const envelope = {
      message: {
        user: {
          id: "1234",
          email: "someother@testhull.io",
          account: {
            domain: "hull-test1.io"
          }
        }
      }
    };

    const sObject = accountNewPayload.result;
    const expectedTraitsObject = {
      "nutshell/id": { value: sObject.id },
      "nutshell/rev": { value: sObject.rev },
      "nutshell/name": { value: sObject.name },
      "nutshell/created_at": { value: sObject.createdTime, operation: "setIfNull" },
      "nutshell/updated_at": { value: sObject.modifiedTime },
      domain: { value: "hull-test1.io", operation: "setIfNull" },
      name: { value: sObject.name, operation: "setIfNull" },
      "nutshell/link": { value: sObject.htmlUrl },
      "nutshell/accounttype_id": { value: sObject.accountType.id },
      "nutshell/accounttype_name": { value: sObject.accountType.name },
      "nutshell/url1": { value: sObject.url[1] },
      "nutshell/industry_id": { value: sObject.industry.id },
      "nutshell/industry_name": { value: sObject.industry.name },
      "nutshell/description": { value: sObject.description },
      "nutshell/tags": { value: sObject.tags },
      "nutshell/last_contacted_at": { value: sObject.lastContactedDate }
    };

    agent.handleNutshellResponse("Account", envelope, accountNewPayload).then(() => {
      expect(traitsMock.mock.calls[0][0]).toEqual(expectedTraitsObject);
      expect(infoMock.mock.calls[0][0]).toEqual("outgoing.account.success");
      expect(infoMock.mock.calls[0][1]).toEqual({ data: sObject });
      expect(incrementMock.mock.calls[0][0]).toEqual("ship.outgoing.accounts");
      expect(incrementMock.mock.calls[0][1]).toEqual(1);
      expect(asAccountMock.mock.calls[0][0]).toEqual(envelope.message.user.account);
      done();
    });
  });

  test("should handle an erroneous account response", (done) => {
    const loggerMock = {};
    const errorMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.error = errorMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asAccountMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const clientMock = {};
    clientMock.asAccount = asAccountMock.bind(clientMock);

    const connector = new ConnectorMock("1234", {}, PRIVATE_SETTINGS);

    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);


    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    const envelope = {
      message: {
        user: {
          id: "1234",
          email: "someother@testhull.io",
          account: {
            domain: "hull-test1.io"
          }
        }
      }
    };

    agent.handleNutshellResponse("Account", envelope, invalidRequestPayload).then(() => {
      expect(errorMock.mock.calls[0][0]).toEqual("outgoing.account.error");
      expect(errorMock.mock.calls[0][1]).toEqual({ reason: "Failed to execute an operation for an account", details: invalidRequestPayload });
      expect(asAccountMock.mock.calls[0][0]).toEqual(envelope.message.user.account);
      done();
    });
  });

  test("should handle a contact to insert (outgoing)", (done) => {
    nock("http://api.nutshell.com")
      .post("/v1/json")
      .reply(200, discoveryPayload);

    const nockScope = nock("https://app.nutshell.com")
      .persist()
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        body = JSON.parse(body);
        if (body.method === "newContact") {
          return contactNewPayload;
        } else if (body.method === "searchByEmail") {
          return searchByEmailEmptyPayload;
        }
        if (body.method === "searchLeads") {
          return searchLeadsEmptyPayload;
        }

        if (body.method === "newLead") {
          return leadNewPayload;
        }
        expect(true).toBeFalsy();
        return {};
      });

    const pSettings = _.merge({}, PRIVATE_SETTINGS, {
      api_username: "someone@test.io",
      api_key: "test1234demo=="
    });
    const loggerMock = {};
    const infoMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.info = infoMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asUserMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const configMock = jest.fn().mockImplementation(() => {
      return {
        secret: "123456"
      };
    });
    const clientMock = {};
    clientMock.asUser = asUserMock.bind(clientMock);
    clientMock.configuration = configMock.bind(clientMock);
    const connector = new ConnectorMock("1234", {}, pSettings);
    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const valueMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);
    metricsMock.value = valueMock.bind(metricsMock);

    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    const sObject = contactNewPayload.result;
    const expectedTraitsObject = {
      "nutshell_contact/id": { value: sObject.id },
      "nutshell_contact/rev": { value: sObject.rev },
      "nutshell_contact/first_name": { value: sObject.name.givenName },
      "nutshell_contact/last_name": { value: sObject.name.familyName },
      "nutshell_contact/created_at": { value: sObject.createdTime, operation: "setIfNull" },
      "nutshell_contact/updated_at": { value: sObject.modifiedTime },
      email: { value: sObject.email["--primary"], operation: "setIfNull" },
      first_name: { value: sObject.name.givenName, operation: "setIfNull" },
      last_name: { value: sObject.name.familyName, operation: "setIfNull" },
      "nutshell_contact/link": { value: sObject.htmlUrl },
      "nutshell_contact/email1": { value: sObject.email[1] },
      "nutshell_contact/contacted_count": { value: sObject.contactedCount }
    };

    agent.sendUserUpdateMessages(messagesToInsert, false).then(() => {
      expect(traitsMock.mock.calls[0][0]).toEqual(expectedTraitsObject);
      expect(infoMock.mock.calls[0][0]).toEqual("outgoing.user.success");
      expect(infoMock.mock.calls[0][1]).toEqual({ data: sObject });
      expect(incrementMock.mock.calls[0][0]).toEqual("ship.service_api.call");
      expect(incrementMock.mock.calls[0][1]).toEqual(1);
      expect(incrementMock.mock.calls[1][0]).toEqual("ship.service_api.call");
      expect(incrementMock.mock.calls[1][1]).toEqual(1);
      expect(incrementMock.mock.calls[2][0]).toEqual("ship.outgoing.users");
      expect(incrementMock.mock.calls[2][1]).toEqual(1);
      expect(asUserMock.mock.calls[0][0]).toEqual(_.first(messagesToInsert).user);
      nockScope.persist(false);
      done();
    })
      .catch((err) => {
        console.log(err);
        nockScope.persist(false);
        expect(false).toBeTruthy();
        done();
      });
  });

  test("should handle a contact to update (outgoing)", (done) => {
    nock("http://api.nutshell.com")
      .post("/v1/json")
      .reply(200, discoveryPayload);

    const nockScope = nock("https://app.nutshell.com")
      .persist()
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        body = JSON.parse(body);
        if (body.method === "editContact") {
          return contactUpdatePayload;
        } else if (body.method === "getContact") {
          return contactUpdatePayload;
        } else if (body.method === "searchByEmail") {
          return searchByEmailEmptyPayload;
        }
        expect(true).toBeFalsy();
        return {};
      });

    const pSettings = _.merge({}, PRIVATE_SETTINGS, {
      api_username: "someone@test.io",
      api_key: "test1234demo=="
    });
    const loggerMock = {};
    const infoMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.info = infoMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asUserMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const configMock = jest.fn().mockImplementation(() => {
      return {
        secret: "123456"
      };
    });
    const clientMock = {};
    clientMock.asUser = asUserMock.bind(clientMock);
    clientMock.configuration = configMock.bind(clientMock);
    const connector = new ConnectorMock("1234", {}, pSettings);
    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const valueMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);
    metricsMock.value = valueMock.bind(metricsMock);

    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    const sObject = contactUpdatePayload.result;
    const expectedTraitsObject = {
      "nutshell_contact/id": { value: sObject.id },
      "nutshell_contact/rev": { value: sObject.rev },
      "nutshell_contact/first_name": { value: sObject.name.givenName },
      "nutshell_contact/last_name": { value: sObject.name.familyName },
      "nutshell_contact/created_at": { value: sObject.createdTime, operation: "setIfNull" },
      "nutshell_contact/updated_at": { value: sObject.modifiedTime },
      email: { value: sObject.email["--primary"], operation: "setIfNull" },
      first_name: { value: sObject.name.givenName, operation: "setIfNull" },
      last_name: { value: sObject.name.familyName, operation: "setIfNull" },
      "nutshell_contact/link": { value: sObject.htmlUrl },
      "nutshell_contact/email1": { value: sObject.email[1] },
      "nutshell_contact/contacted_count": { value: sObject.contactedCount },
      "nutshell_contact/description": { value: sObject.description }
    };

    agent.sendUserUpdateMessages(messagesToUpdate, false).then(() => {
      expect(traitsMock.mock.calls[0][0]).toEqual(expectedTraitsObject);
      expect(infoMock.mock.calls[0][0]).toEqual("outgoing.user.success");
      expect(infoMock.mock.calls[0][1]).toEqual({ data: sObject });
      expect(incrementMock.mock.calls[0][0]).toEqual("ship.service_api.call");
      expect(incrementMock.mock.calls[0][1]).toEqual(1);
      expect(incrementMock.mock.calls[1][0]).toEqual("ship.service_api.call");
      expect(incrementMock.mock.calls[1][1]).toEqual(1);
      expect(incrementMock.mock.calls[2][0]).toEqual("ship.outgoing.users");
      expect(incrementMock.mock.calls[2][1]).toEqual(1);
      expect(asUserMock.mock.calls[0][0]).toEqual(_.first(messagesToUpdate).user);
      nockScope.persist(false);
      done();
    })
      .catch((err) => {
        console.log(err);
        nockScope.persist(false);
        expect(false).toBeTruthy();
        done();
      });
  });

  test("should handle a contact to skip (outgoing)", (done) => {
    nock("http://api.nutshell.com")
      .post("/v1/json")
      .reply(200, discoveryPayload);

    const nockScope = nock("https://app.nutshell.com")
      .persist()
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        body = JSON.parse(body);
        if (body.method === "editContact") {
          return contactUpdatePayload;
        } else if (body.method === "getContact") {
          return contactUpdatePayload;
        } else if (body.method === "searchByEmail") {
          return searchByEmailEmptyPayload;
        }
        expect(true).toBeFalsy();
        return {};
      });

    const pSettings = _.merge({}, PRIVATE_SETTINGS, {
      api_username: "someone@test.io",
      api_key: "test1234demo=="
    });
    const loggerMock = {};
    const infoMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    loggerMock.info = infoMock.bind(loggerMock);
    const traitsMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const asUserMock = jest.fn().mockImplementation(() => {
      return {
        logger: loggerMock,
        traits: traitsMock
      };
    });
    const configMock = jest.fn().mockImplementation(() => {
      return {
        secret: "123456"
      };
    });
    const clientMock = {};
    clientMock.asUser = asUserMock.bind(clientMock);
    clientMock.configuration = configMock.bind(clientMock);
    const connector = new ConnectorMock("1234", {}, pSettings);
    const incrementMock = jest.fn().mockImplementation(() => {
      return Promise.resolve();
    });
    const metricsMock = {};
    metricsMock.increment = incrementMock.bind(metricsMock);

    const agent = new Agent({ client: clientMock, ship: connector, metric: metricsMock });

    agent.sendUserUpdateMessages(messagesToSkip).then(() => {
      expect(infoMock.mock.calls[0][0]).toEqual("outgoing.user.skip");
      expect(infoMock.mock.calls[0][1]).toEqual({ reason: "User doesn't belong to synchronized segments." });
      expect(asUserMock.mock.calls[0][0]).toEqual(_.first(messagesToSkip).user);
      nockScope.persist(false);
      done();
    })
      .catch((err) => {
        console.log(err);
        nockScope.persist(false);
        expect(false).toBeTruthy();
        done();
      });
  });
});
