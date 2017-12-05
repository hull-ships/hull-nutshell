/* global describe, test, expect */
const AttributesMapper = require("../../server/lib/utils/attributes-mapper");

describe("AttributesMapper", () => {
  const CONNECTOR_SETTINGS = {
    account_attributes_outbound: [
      {
        hull_field_name: "account.domain",
        nutshell_field_name: "url"
      },
      {
        hull_field_name: "account.name",
        nutshell_field_name: "name"
      }
    ],
    contact_attributes_outbound: [
      { hull_field_name: "name", nutshell_field_name: "name" },
      { hull_field_name: "traits_title", nutshell_field_name: "title" },
      { hull_field_name: "email", nutshell_field_name: "email" }
    ]
  };

  test("should initialize outbound mappings", () => {
    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const expectedMappings = {
      Account: CONNECTOR_SETTINGS.account_attributes_outbound,
      Contact: CONNECTOR_SETTINGS.contact_attributes_outbound
    };
    expect(mapper.mappingsOutbound).toEqual(expectedMappings);
  });

  test("should not fail and return the original string if the url is not a valid url", () => {
    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const expected = "somefoo123";
    const actual = mapper.normalizeUrl("somefoo123");
    expect(actual).toEqual(expected);
  });

  test("should map a hull object to an account", () => {
    const hullUser = {
      account: {
        created_at: "2017-10-25T10:06:00Z",
        domain: "hullsfdc.io",
        employees: 2,
        external_id: "a9461ad518be40ba-b568-4729-a676-f9c55abd72c9",
        industry: "Technology",
        name: "Hull SFDC Testing",
        plan: "Enterprise",
        _sales_business_won: "2017-10-25T12:45:00Z",
        "nutshell/id": "7",
        "nutshell/rev": "0"
      },
      id: "59f06a5f421a978e920643d7",
      created_at: "2017-10-25T10:41:35Z",
      is_approved: false,
      has_password: false,
      accepts_marketing: false,
      email: "sven+sfdc4@hull.io",
      domain: "hull.io",
      name: "Sven4 SFDC",
      last_name: "SFDC",
      first_name: "Svn4",
      traits_status: "Lead",
      "traits_intercom/citygroup": "Stuttgart",
      traits_company: "Hull Test SFDC GmbH & Co KG",
      "traits_salesforce_lead/id": "abcdf",
      "traits_salesforce_contact/id": "1234foo",
      "traits_salesforce/id": "56789baz"
    };

    const expectedNutshellObject = {
      name: hullUser.account.name,
      url: hullUser.account.domain,
      rev: hullUser.account["nutshell/rev"],
      id: hullUser.account["nutshell/id"]
    };

    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const actual = mapper.mapToServiceObject("Account", hullUser);

    expect(actual).toEqual(expectedNutshellObject);
  });

  test("should map a hull object to a contact", () => {
    const hullUser = {
      account: {
        created_at: "2017-10-25T10:06:00Z",
        domain: "hullsfdc.io",
        employees: 2,
        external_id: "a9461ad518be40ba-b568-4729-a676-f9c55abd72c9",
        industry: "Technology",
        name: "Hull SFDC Testing",
        plan: "Enterprise",
        _sales_business_won: "2017-10-25T12:45:00Z",
        "nutshell/id": "7",
        "nutshell/rev": "0"
      },
      id: "59f06a5f421a978e920643d7",
      created_at: "2017-10-25T10:41:35Z",
      is_approved: false,
      has_password: false,
      accepts_marketing: false,
      email: "sven+sfdc4@hull.io",
      domain: "hull.io",
      name: "Sven4 SFDC",
      last_name: "SFDC",
      first_name: "Svn4",
      traits_status: "Lead",
      "traits_intercom/citygroup": "Stuttgart",
      traits_company: "Hull Test SFDC GmbH & Co KG",
      "traits_salesforce_lead/id": "abcdf",
      "traits_salesforce_contact/id": "1234foo",
      "traits_salesforce/id": "56789baz",
      "traits_nutshell/id": "7",
      "traits_nutshell/rev": "1"
    };

    const expectedNutshellObject = {
      name: hullUser.name,
      email: hullUser.email,
      id: hullUser["traits_nutshell/id"],
      rev: hullUser["traits_nutshell/rev"]
    };

    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const actual = mapper.mapToServiceObject("Contact", hullUser);

    expect(actual).toEqual(expectedNutshellObject);
  });

  test("should map an account to a Hull traits object", () => {
    const sObject = {
      id: 7,
      entityType: "Accounts",
      rev: "0",
      modifiedTime: "2017-11-30T03:08:26+0000",
      createdTime: "2017-11-30T03:08:26+0000",
      name: "Test Account Hull 1",
      htmlUrl: "https://app.nutshell.com/company/7-test-account-hull-1",
      accountType: { id: 1, name: "Standard Account" },
      industry: { id: 1, name: "Accounting" },
      creator: null,
      owner: null,
      tags: ["test"],
      lastContactedDate: "2017-11-30T03:08:26+0000",
      contacts: [],
      description: "awesome customer",
      url:
         {
           1: "http://hull-test1.io",
           "--primary": "http://hull-test1.io"
         },
      notes: [],
      leads: []
    };

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

    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const actual = mapper.mapToHullAttributeObject("Account", sObject);

    expect(actual).toEqual(expectedTraitsObject);
  });

  test("should map an account to a Hull ident object", () => {
    const sObject = {
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
    };

    const expectedIdentObject = {
      domain: "hull-test1.io"
    };

    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const actual = mapper.mapToHullIdentObject("Account", sObject);

    expect(actual).toEqual(expectedIdentObject);
  });

  test("should map a contact to a Hull ident object", () => {
    const sObject = {
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
    };

    const expectedIdentObject = {
      email: "test1@hull.io",
      anonymous_id: `nutshell:${sObject.id}`
    };

    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const actual = mapper.mapToHullIdentObject("Contact", sObject);

    expect(actual).toEqual(expectedIdentObject);
  });

  test("should map a contact to a Hull traits object", () => {
    const sObject = {
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
      lastContactedDate: "2017-11-30T02:14:48+0000",
      contactedCount: 0,
      tags: ["test"],
      description: "nice guy",
      email: { 1: "test1@hull.io", "--primary": "test1@hull.io" }
    };

    const expectedTraitsObject = {
      "nutshell/id": { value: sObject.id },
      "nutshell/rev": { value: sObject.rev },
      "nutshell/first_name": { value: sObject.name.givenName },
      "nutshell/last_name": { value: sObject.name.familyName },
      "nutshell/created_at": { value: sObject.createdTime, operation: "setIfNull" },
      "nutshell/updated_at": { value: sObject.modifiedTime },
      email: { value: sObject.email["--primary"], operation: "setIfNull" },
      first_name: { value: sObject.name.givenName, operation: "setIfNull" },
      last_name: { value: sObject.name.familyName, operation: "setIfNull" },
      "nutshell/link": { value: sObject.htmlUrl },
      "nutshell/email1": { value: sObject.email[1] },
      "nutshell/contacted_count": { value: sObject.contactedCount },
      "nutshell/last_contacted_at": { value: sObject.lastContactedDate },
      "nutshell/tags": { value: sObject.tags },
      "nutshell/description": { value: sObject.description }
    };

    const mapper = new AttributesMapper(CONNECTOR_SETTINGS);
    const actual = mapper.mapToHullAttributeObject("Contact", sObject);

    expect(actual).toEqual(expectedTraitsObject);
  });
});
