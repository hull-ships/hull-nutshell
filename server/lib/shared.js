/* @flow */
import type { TResourceType } from "./types";

const DISCOVERY_ENDPOINT: string = "http://api.nutshell.com/v1/json";

const SUPPORTED_RESOURCETYPES: Array<TResourceType> = ["Account", "Contact", "Lead"];

const COMPLEX_FIELDS_MAP = {
  Contact: {
    name: "name.displayName"
  }
};

module.exports = {
  DISCOVERY_ENDPOINT,
  SUPPORTED_RESOURCETYPES,
  COMPLEX_FIELDS_MAP
};
