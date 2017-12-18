/* global describe, test, expect */

const nock = require("nock");

const fieldsAccountAction = require("../../server/actions/fields-account");

const { ConnectorMock } = require("../helper/connector-mock");

describe("fieldsAccountAction", () => {
  beforeEach(() => {
    if (!nock.isActive()) {
      nock.activate();
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("should return account fields if the connector is properly configured", (done) => {
    const private_settings = {
      api_username: "sven+dev@hull.io",
      api_key: "1234567abcd="
    };

    const discoveryData = {
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
      .reply(200, discoveryData);


    const customFieldsData = {
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
      .reply(200, customFieldsData);

    const metricClientMock = {};
    const incrementMock = jest.fn().mockImplementation(() => {
      console.log("metricClient.increment mocked function called");
    });
    metricClientMock.increment = incrementMock.bind(metricClientMock);

    const responseMock = {};
    const jsonMock = jest.fn().mockImplementation(() => {
      console.log("response.json mocked function called");
    });
    responseMock.json = jsonMock.bind(responseMock);

    const clientMock = {};
    const configMock = jest.fn().mockImplementation(() => {
      return { secret: "1234" };
    });
    clientMock.configuration = configMock.bind(clientMock);

    const req = {
      url: "https://hull-nutshell.herokuapp.com/",
      hull: {
        client: clientMock,
        ship: new ConnectorMock("1234", {}, private_settings)
      }
    };

    const fields = [
      { value: "name", label: "Name" },
      { value: "description", label: "Description" },
      { value: "industryId", label: "Industry (ID)" },
      { value: "accountTypeId", label: "Account Type (ID)" },
      { value: "territoryId", label: "Territory (ID)" },
      { value: "url", label: "Url" },
      { value: "phone", label: "Phone" },
      { value: "note", label: "Note" }
    ];

    const res = fieldsAccountAction(req, responseMock);
    res.then(() => {
      expect(jsonMock.mock.calls[0][0]).toEqual({ options: fields });
      done();
    });
  });

  test("should return an error if the connector is not properly configured", () => {
    const private_settings = {
      api_username: null,
      api_key: null
    };
    const responseMock = {};
    const jsonMock = jest.fn().mockImplementation(() => {
      console.log("response.json mocked function called");
    });
    responseMock.json = jsonMock.bind(responseMock);

    const clientMock = {};
    const configMock = jest.fn().mockImplementation(() => {
      return { secret: "1234" };
    });
    clientMock.configuration = configMock.bind(clientMock);

    const req = {
      url: "https://hull-nutshell.herokuapp.com/",
      hull: {
        client: clientMock,
        ship: new ConnectorMock("1234", {}, private_settings)
      }
    };
    fieldsAccountAction(req, responseMock);
    expect(jsonMock.mock.calls[0][0]).toEqual({ ok: false, error: "The connector is not or not properly authenticated to Nutshell.", options: [] });
  });

  test("should return an error if the api call to nutshell fails", (done) => {
    const private_settings = {
      api_username: "sven+dev@hull.io",
      api_key: "1234567abcd="
    };

    const discoveryData = {
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
      .reply(200, discoveryData);

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    const metricClientMock = {};
    const incrementMock = jest.fn().mockImplementation(() => {
      console.log("metricClient.increment mocked function called");
    });
    metricClientMock.increment = incrementMock.bind(metricClientMock);

    const responseMock = {};
    const jsonMock = jest.fn().mockImplementation(() => {
      console.log("response.json mocked function called");
    });
    responseMock.json = jsonMock.bind(responseMock);

    const clientMock = {};
    const configMock = jest.fn().mockImplementation(() => {
      return { secret: "12345" };
    });
    clientMock.configuration = configMock.bind(clientMock);

    const req = {
      url: "https://hull-nutshell.herokuapp.com/",
      hull: {
        client: clientMock,
        ship: new ConnectorMock("12345", {}, private_settings)
      }
    };

    const res = fieldsAccountAction(req, responseMock);
    res.then(() => {
      expect(jsonMock.mock.calls[0][0]).toEqual({ ok: false, error: "", options: [] });
      done();
    });
  });

  test("should log an error if the api call to nutshell fails", (done) => {
    const private_settings = {
      api_username: "sven+dev@hull.io",
      api_key: "1234567abcd="
    };

    const discoveryData = {
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
      .reply(200, discoveryData);

    nock("https://app.nutshell.com")
      .post("/api/v1/json")
      .reply(500);

    const loggerMock = {};
    const errorMock = jest.fn().mockImplementation(() => {
      console.log("logger.error function called");
    });
    loggerMock.error = errorMock.bind(loggerMock);

    const metricClientMock = {};
    const incrementMock = jest.fn().mockImplementation(() => {
      console.log("metricClient.increment mocked function called");
    });
    metricClientMock.increment = incrementMock.bind(metricClientMock);

    const responseMock = {};
    const jsonMock = jest.fn().mockImplementation(() => {
      console.log("response.json mocked function called");
    });
    responseMock.json = jsonMock.bind(responseMock);

    const clientMock = {};
    const configMock = jest.fn().mockImplementation(() => {
      return { secret: "123456" };
    });
    clientMock.configuration = configMock.bind(clientMock);
    clientMock.logger = loggerMock;

    const req = {
      url: "https://hull-nutshell.herokuapp.com/",
      hull: {
        client: clientMock,
        ship: new ConnectorMock("123456", {}, private_settings)
      }
    };

    const res = fieldsAccountAction(req, responseMock);
    res.then(() => {
      expect(jsonMock.mock.calls[0][0]).toEqual({ ok: false, error: "", options: [] });
      expect(errorMock.mock.calls[0][0]).toEqual("connector.metadata.error");
      expect(errorMock.mock.calls[0][1]).toEqual({ status: undefined, message: "", type: "/fields-account" });
      done();
    });
  });
});
