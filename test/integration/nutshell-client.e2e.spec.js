/* global describe, test, expect */
const _ = require("lodash");

const NutshellClient = require("../../server/lib/service-client");
const { MetricsClientMock } = require("../helper/metrics-client-mock");
const nock = require("nock");

describe("NutshellClient", () => {
  const options = {
    userId: "sven+dev@hull.io",
    apiKey: "0c12e2fad324ab733f1eb3bd161f126c6845b515"
  };

  beforeEach(() => {
    if (!nock.isActive()) {
      nock.activate();
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("should set the userId passed via the options", () => {
    const client = new NutshellClient(options);
    expect(client.userId).toEqual(options.userId);
  });

  test("should set the apiKey passed via the options", () => {
    const client = new NutshellClient(options);
    expect(client.apiKey).toEqual(options.apiKey);
  });

  test("should set the metricsClient via the options", () => {
    const options2 = _.cloneDeep(options);
    const mclnt = new MetricsClientMock();
    _.set(options2, "metricsClient", mclnt);
    const client = new NutshellClient(options2);
    expect(client.metricsClient).toBeDefined();
    expect(client.metricsClient).toEqual(mclnt);
  });

  test.skip("should increment the api calls by one by default if metricsClient is specified", () => {
    const incrementMock = jest.fn().mockImplementation(() => {
      console.log("mocked function called");
    });
    const metrics = {};
    metrics.increment = incrementMock.bind(metrics);
    const clnt = new NutshellClient(options);
    clnt.metricsClient = metrics;
    clnt.incrementApiCalls();
    expect(incrementMock.mock.calls[0][0]).toEqual("ship.service_api.call");
    expect(incrementMock.mock.calls[0][1]).toEqual(1);
  });

  test.skip("should increment the api calls if metricsClient is specified", () => {
    const incrementMock = jest.fn().mockImplementation(() => {
      console.log("mocked function called");
    });
    const metrics = {};
    metrics.increment = incrementMock.bind(metrics);
    const clnt = new NutshellClient(options);
    clnt.metricsClient = metrics;
    clnt.incrementApiCalls(3);
    expect(incrementMock.mock.calls[0][0]).toEqual("ship.service_api.call");
    expect(incrementMock.mock.calls[0][1]).toEqual(3);
  });

  test("should retrieve the endpoint discovery result", (done) => {
    const client = new NutshellClient(options);
    const expected = {
      result: {
        iphone: "app.nutshell.com",
        mobile: "app.nutshell.com",
        api: "app.nutshell.com",
        login: "app.nutshell.com"
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("http://api.nutshell.com")
      .post("/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "getApiForUsername",
          jsonrpc: "2.0",
          params: { username: options.userId },
          id: "apeye"
        });
        return expected;
      });

    client.discoverEndpoint().then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to retrieve the endpoint discovery result when an error occurs", (done) => {
    const client = new NutshellClient(options);

    nock("http://api.nutshell.com")
      .post("/v1/json")
      .reply(500);

    client.discoverEndpoint().then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should create a new contact", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const data = {
      name: "Test 1",
      email: "test1@hull.io"
    };

    const expected = {
      result: {
        id: 7,
        entityType: "Contacts",
        rev: "0",
        modifiedTime: "2017-11-30T02:14:48+0000",
        createdTime: "2017-11-30T02:14:48+0000",
        name:
       {
         givenName: "Test",
         familyName: "1",
         salutation: "",
         displayName: "Test 1"
       },
        htmlUrl: "https://app.nutshell.com/person/7-test-1",
        creator: null,
        owner: null,
        leads: [],
        accounts: [],
        notes: [],
        lastContactedDate: null,
        contactedCount: 0,
        tags: [],
        description: null,
        email: { 1: "test1@hull.io", "--primary": "test1@hull.io" }
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "newContact",
          jsonrpc: "2.0",
          params: {
            contact: data
          },
          id: "apeye"
        });
        return expected;
      });

    client.createContact(data, reqOpts).then((result) => {
      expect(result).toEqual(expected);
      console.log(result);
      done();
    }, (err) => {
      console.log(err);
      expect(false).toEqual(true);
      done();
    });
  });

  test("should reject the promise to create a new contact when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const data = {
      name: "Test 1",
      email: "test1@hull.io"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.createContact(data, reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should create a new account", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const data = {
      name: "Test Account Hull 1",
      url: "hull-test1.io"
    };

    const expected = {
      result: {
        id: 7,
        entityType: "Accounts",
        rev: "0",
        modifiedTime: "2017-11-30T03:08:26+0000",
        createdTime: "2017-11-30T03:08:26+0000",
        name: "Test Account Hull 1",
        htmlUrl: "https://app.nutshell.com/company/7-test-account-hull-1",
        accountType: { id: 1, name: "Standard Account" },
        industry: null,
        creator: null,
        owner: null,
        tags: [],
        lastContactedDate: null,
        contacts: [],
        description: null,
        url:
           {
             1: "http://hull-test1.io",
             "--primary": "http://hull-test1.io"
           },
        notes: [],
        leads: []
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "newAccount",
          jsonrpc: "2.0",
          params: {
            account: data
          },
          id: "apeye"
        });
        return expected;
      });

    client.createAccount(data, reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to create a new account when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const data = {
      name: "Test Account Hull 1",
      url: "hull-test1.io"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.createAccount(data, reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should edit an existing contact", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const id = 7;
    const data = {
      name: "Andy Fowler",
      phone: {
        work: "717-555-0480",
        home: "+216 717-555-6633",
        cell: "877-555-5001"
      },
      description: "Works late call anytime"
    };

    const expected = {
      result: {
        id: 7,
        entityType: "Contacts",
        rev: "1",
        modifiedTime: "2017-11-30T04:18:46+0000",
        createdTime: "2017-11-30T02:14:48+0000",
        name:
         {
           givenName: "Andy",
           familyName: "Fowler",
           salutation: "",
           displayName: "Andy Fowler"
         },
        htmlUrl: "https://app.nutshell.com/person/7-andy-fowler",
        creator: null,
        owner: null,
        leads: [],
        accounts: [],
        notes: [],
        lastContactedDate: null,
        contactedCount: 0,
        tags: [],
        description: "Works late call anytime",
        email: { 1: "test1@hull.io", "--primary": "test1@hull.io" },
        phone:
         {
           work: data.phone.work,
           home: data.phone.home,
           cell: data.phone.cell,
           "--primary": data.phone.work
         }
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "editContact",
          jsonrpc: "2.0",
          params: {
            contactId: id,
            contact: data,
            rev: "0"
          },
          id: "apeye"
        });
        return expected;
      });

    client.editContact(id, "0", data, reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    }, (err) => {
      console.log(err);
      expect(false).toEqual(true);
      done();
    });
  });

  test("should reject the promise to edit an existing contact when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const id = 7;
    const data = {
      name: "Andy Fowler",
      phone: {
        work: "717-555-0480",
        home: "+216 717-555-6633",
        cell: "877-555-5001"
      },
      description: "Works late call anytime"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.editContact(id, "0", data, reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should edit an existing account", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const id = 7;
    const data = {
      name: "New Account Name",
      phone: {
        cell: "717-555-0467",
        office: "877-000-9237"
      }
    };

    const expected = {
      result: {
        id: 7,
        entityType: "Accounts",
        rev: "1",
        modifiedTime: "2017-11-30T04:28:56+0000",
        createdTime: "2017-11-30T03:08:26+0000",
        name: "New Account Name",
        htmlUrl: "https://app.nutshell.com/company/7-new-account-name",
        accountType: { id: 1, name: "Standard Account" },
        industry: null,
        creator: null,
        owner: null,
        tags: [],
        lastContactedDate: null,
        contacts: [],
        description: null,
        phone: { cell: data.phone.cell, office: data.phone.office, "--primary": data.phone.office },
        url:
         {
           1: "http://hull-test1.io",
           "--primary": "http://hull-test1.io"
         },
        notes: [],
        leads: []
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "editAccount",
          jsonrpc: "2.0",
          params: {
            accountId: id,
            account: data,
            rev: "0"
          },
          id: "apeye"
        });
        return expected;
      });

    client.editAccount(id, "0", data, reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to edit an existing account when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const id = 7;
    const data = {
      name: "New Account Name",
      phone: {
        cell: "717-555-0467",
        office: "877-000-9237"
      }
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.editAccount(id, "0", data, reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should find all custom fields", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const expected = {
      result: {
        Contacts: [
        ],
        Accounts: [
        ],
        Leads: [
          {
            name: "Application",
            isMultiple: false,
            position: 6,
            type: "Enum",
            enumElements: {
              3: "Commercial & Resedential",
              1: "Heavy duty & Hazardous",
              2: "Large-Scale Utility",
              4: "Recreational & Custom"
            }
          }]
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "findCustomFields",
          jsonrpc: "2.0",
          params: [],
          id: "apeye"
        });
        return expected;
      });

    client.findCustomFields(reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to find all custom fields when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.findCustomFields(reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should search accounts", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const expected = {
      result: [
        {
          stub: true,
          id: 7,
          entityType: "Accounts",
          name: "Test Account Hull 1",
          regions: null
        }
      ],
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "searchAccounts",
          jsonrpc: "2.0",
          params: {
            string: "hull-test1.io",
            limit: 10
          },
          id: "apeye"
        });
        return expected;
      });

    client.searchAccounts("hull-test1.io", 10, reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to search accounts when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.searchAccounts("hull-test1.io", 10, reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should search accounts and contacts by email address", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const expected = {
      result: {
        contacts: [{
          stub: true, id: 7, entityType: "Contacts", name: "Test 1", jobTitle: ""
        }],
        accounts: []
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "searchByEmail",
          jsonrpc: "2.0",
          params: {
            emailAddressString: "test1@hull.io"
          },
          id: "apeye"
        });
        return expected;
      });

    client.searchByEmail("test1@hull.io", reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to search accounts and contacts by email address when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.searchByEmail("test1@hull.io", reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test("should get an account by id", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    const expected = {
      result:
      {
        id: 7,
        entityType: "Accounts",
        rev: "1",
        modifiedTime: "2017-11-30T04:28:56+0000",
        createdTime: "2017-11-30T03:08:26+0000",
        name: "New Account Name",
        htmlUrl: "https://app.nutshell.com/company/7-new-account-name",
        accountType: { id: 1, name: "Standard Account" },
        industry: null,
        creator: null,
        owner: null,
        tags: [],
        lastContactedDate: null,
        contacts: [],
        description: null,
        phone: {
          cell: "717-555-0467",
          office: "877-000-9237",
          "--primary": "717-555-0467"
        },
        url:
         {
           1: "http://hull-test1.io",
           "--primary": "http://hull-test1.io"
         },
        notes: [],
        leads: []
      },
      id: "apeye",
      error: null,
      jsonrpc: "2.0"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(200, (uri, body) => {
        expect(JSON.parse(body)).toEqual({
          method: "getAccount",
          jsonrpc: "2.0",
          params: {
            accountId: 7
          },
          id: "apeye"
        });
        return expected;
      });

    client.getResourceById("Account", 7, null, reqOpts).then((result) => {
      expect(result).toEqual(expected);
      done();
    });
  });

  test("should reject the promise to get an account by id when an error occurs", (done) => {
    const client = new NutshellClient(options);

    const reqOpts = {
      host: "app.nutshell.com",
      requestId: "apeye"
    };

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    client.getResourceById("Account", 7, null, reqOpts).then(() => {
      expect(false).toEqual(true);
      done();
    }, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });
});
