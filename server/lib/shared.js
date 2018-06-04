/* @flow */
import type { TResourceType } from "./types";

const DISCOVERY_ENDPOINT: string = "http://api.nutshell.com/v1/json";

const SUPPORTED_RESOURCETYPES: Array<TResourceType> = ["Account", "Contact", "Lead"];

/**
 * This are fields which are sent in a different param than they are returned
 */
const COMPLEX_FIELDS_MAP = {
  Contact: {
    name: "name.displayName"
  }
};

/**
 * This are fields which are send as one param but then they are retuned in an array of objects
 */
const SINGLE_ARRAY_FIELDS_MAP = {
  Lead: {
    note: {
      array: "notes",
      param: "note"
    }
  },
  Contact: {
    note: {
      array: "notes",
      param: "note"
    }
  },
  Account: {
    note: {
      array: "notes",
      param: "note"
    }
  }
};


const COMPLEX_ARRAY_FIELDS_MAP = {
  Lead: {
    sources: "id",
    competitors: "id",
    products: "id"
  }
};

module.exports = {
  DISCOVERY_ENDPOINT,
  SUPPORTED_RESOURCETYPES,
  COMPLEX_FIELDS_MAP,
  SINGLE_ARRAY_FIELDS_MAP,
  COMPLEX_ARRAY_FIELDS_MAP
};
