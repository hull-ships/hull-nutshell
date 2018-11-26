/* global describe, test, expect */
const PatchUtil = require("../../server/lib/utils/patch-util");

describe("PatchUtil", () => {
  const CONNECTOR_SETTINGS = {
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
      },
      {
        hull_field_name: "account.mrr",
        nutshell_field_name: "MRR",
        overwrite: true
      },
      {
        hull_field_name: "account.foo",
        nutshell_field_name: "Foo",
        overwrite: true
      }
    ],
    contact_attributes_outbound: [
      { hull_field_name: "name", nutshell_field_name: "name", overwrite: true },
      { hull_field_name: "traits_title", nutshell_field_name: "title", overwrite: true },
      { hull_field_name: "email", nutshell_field_name: "email", overwrite: false }
    ],
    lead_attributes_outbound: [
      { hull_field_name: "name", nutshell_field_name: "name" },
      { hull_field_name: "traits_title", nutshell_field_name: "title" },
      { hull_field_name: "email", nutshell_field_name: "contact.email" },
      { hull_field_name: "name", nutshell_field_name: "contact.name" },
      { hull_field_name: "account.name", nutshell_field_name: "account.name" },
      { hull_field_name: "account.domain", nutshell_field_name: "account.url" }
    ]
  };

  test("should initialize outbound mappings", () => {
    const util = new PatchUtil(CONNECTOR_SETTINGS);
    const expectedMappings = {
      Account: CONNECTOR_SETTINGS.account_attributes_outbound,
      Contact: CONNECTOR_SETTINGS.contact_attributes_outbound,
      Lead: CONNECTOR_SETTINGS.lead_attributes_outbound
    };
    expect(util.mappingsOutbound).toEqual(expectedMappings);
  });

  test("should return a falsy result if no mappings are configured to prevent API calls", () => {
    const empty_settings = {
      account_attributes_outbound: [],
      contact_attributes_outbound: []
    };

    const currentObject = {
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

    const newObject = {
      id: 7,
      rev: "0",
      url: "http://hull-test1-modified.io",
      name: "Test Account Hull 1 - Modified"
    };

    const expected = {
      hasChanges: false,
      patchObject: {}
    };

    const util = new PatchUtil(empty_settings);
    const actual = util.createPatchObject("Account", newObject, currentObject);

    expect(actual).toEqual(expected);
  });

  test("should create a patch object for an account that has changes", () => {
    const currentObject = {
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

    const newObject = {
      id: 7,
      rev: "0",
      url: "http://hull-test1-modified.io",
      name: "Test Account Hull 1 - Modified",
      MRR: 650,
      Foo: null
    };

    const expected = {
      hasChanges: true,
      patchObject: {
        // TODO: I needed to remove it from patch util to let nutshell accept edit operation
        // id: 7,
        rev: "0",
        name: "Test Account Hull 1 - Modified",
        MRR: 650
      }
    };

    const util = new PatchUtil(CONNECTOR_SETTINGS);
    const actual = util.createPatchObject("Account", newObject, currentObject);

    expect(actual).toEqual(expected);
  });

  test("should create a falsy patch object for an account that has no changes", () => {
    const currentObject = {
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

    const newObject = {
      id: 7,
      rev: "0",
      url: "http://hull-test1.io",
      name: "Test Account Hull 1"
    };

    const expected = {
      hasChanges: false,
      patchObject: {}
    };

    const util = new PatchUtil(CONNECTOR_SETTINGS);
    const actual = util.createPatchObject("Account", newObject, currentObject);

    expect(actual).toEqual(expected);
  });

  test("should throw an error if the id doesn't match", () => {
    const currentObject = {
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

    const newObject = {
      id: 8,
      rev: "0",
      url: "http://hull-test1-modified.io",
      name: "Test Account Hull 1 - Modified"
    };

    const expectedMessage = `The identifier for the hull object ${newObject.id} and nutshell object ${currentObject.id} do not match.`;

    const util = new PatchUtil(CONNECTOR_SETTINGS);
    expect(() => util.createPatchObject("Account", newObject, currentObject)).toThrow(expectedMessage);
  });

  test("should throw an error if the rev doesn't match", () => {
    const currentObject = {
      id: 7,
      entityType: "Accounts",
      rev: "1",
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

    const newObject = {
      id: 7,
      rev: "0",
      url: "http://hull-test1-modified.io",
      name: "Test Account Hull 1 - Modified"
    };

    const expectedMessage = `The revision for the hull object ${newObject.rev} and nutshell object ${currentObject.rev} do not match.`;

    const util = new PatchUtil(CONNECTOR_SETTINGS);
    expect(() => util.createPatchObject("Account", newObject, currentObject)).toThrow(expectedMessage);
  });

  test("should throw an error if the rev doesn't match", () => {
    const currentObject = require("../fixtures/api_lead_get").result; // eslint-disable-line global-require
    const newObject = {
      note: "Lisa Williams\n Message :     / \nRate:  C\nExpected Value: 320\n----------------------"
    };

    const util = new PatchUtil({
      lead_attributes_outbound: [
        {
          hull_field_name: "",
          nutshell_field_name: "note",
          hull_field_template: "{{user.traits_nutshell/notemarkup}}\n Message :  {{user.traits_message}} / {{user.traits_name}} \n-------",
          overwrite: false
        }
      ]
    });
    console.log(util.createPatchObject("Lead", newObject, currentObject));
  });
});
