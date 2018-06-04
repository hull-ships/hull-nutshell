/* @flow */
import type { THullUserUpdateMessage, THullObjectIdent } from "hull";

export type TResourceType = "Account" | "Contact" | "Activity" | "Lead";

export interface ILogger {
  info(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  debug(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
}

export interface IMetricsClient {
  value(name: string, value: number, additionalTags?: Array<string>): void;
  increment(name: string, value: number, additionalTags?: Array<string>): void;
}

export interface IDropdownEntry {
  value: string;
  label: string;
}

export interface IUserUpdateEnvelope {
  message: THullUserUpdateMessage,
  currentNutshellAccount?: Object;
  currentNutshellContact?: Object;
  skipReason?: string;
}

export interface IFilterResult {
  toInsert: Array<IUserUpdateEnvelope>;
  toUpdate: Array<IUserUpdateEnvelope>;
  toSkip: Array<IUserUpdateEnvelope>;
}

export interface INutshellClientOptions {
  userId: string;
  apiKey: string;
  metricsClient?: IMetricsClient;
}

export interface INutshellClientResponse {
  result: Object;
  error: Object;
  id: string;
  jsonrpc: string;
}

export interface INutshellOperationOptions {
  host: string;
  requestId: string;
}

export interface IFilterUtil {
  filterAccounts(envelopes: Array<IUserUpdateEnvelope>, skipSegmentCheck: boolean): IFilterResult;
  filterContacts(envelopes: Array<IUserUpdateEnvelope>, skipSegmentCheck: boolean): IFilterResult;
  filterLeads(envelopes: Array<IUserUpdateEnvelope>, skipSegmentCheck: boolean): IFilterResult;
}

export interface IAttributesMapper {
  mapToServiceObject(resource: TResourceType, hullObject: any):any;
  mapToHullAttributeObject(resource: TResourceType, sObject: any): any;
  mapToHullIdentObject(resource: TResourceType, sObject: Object, leadContactsIndex?: number): THullObjectIdent;
}

export interface IPatchResult {
  hasChanges: boolean;
  patchObject: any;
}

export interface IPatchUtil {
  createPatchObject(resource: TResourceType, newObject: any, currentObject: any): IPatchResult;
}

/**
 * This is a contact object Nutshell API returns
 */
export type TNutshellCurrentContact = {
  id: string,
  name: {
    givenName: string,
    familyName: string,
    salutation: string | null,
    displayName: string
  },
  phone: {
    [string]: {
      countryCode: string,
      number: string,
      extension: string | null
    }
  },
  [string]: string | Array<string> | Object
};

/**
 * This is the object we send to create endpoint of the API to create a contact
 */
export type TNutshellNewContact = {
  id: string,
  name: string,
  phone: {
    [string]: string
  },
  [string]: string | Array<string> | Object;
};
