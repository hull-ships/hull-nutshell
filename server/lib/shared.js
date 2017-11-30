// @flow
export type TResourceType = "Account" | "Contact";

export interface ILogger {
  info(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  debug(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
}

export interface IMetricClient {
  value(name: string, value: number): void;
  increment(name: string, value: number): void;
}

export interface IDropdownEntry {
  value: string;
  label: string;
}

export interface IUserUpdateEnvelope {
  message: Object,
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
  filterAccounts(envelopes: Array<IUserUpdateEnvelope>): IFilterResult;
  filterUsers(envelopes: Array<IUserUpdateEnvelope>): IFilterResult;
}

export interface IAttributesMapper {
  mapToServiceObject(resource: TResourceType, hullObject: any):any;
  mapToHullAttributeObject(resource: TResourceType, sObject: any): any;
  mapToHullIdentObject(resource: TResourceType, sObject: any): any;
}

const DISCOVERY_ENDPOINT = "http://api.nutshell.com/v1/json";

module.exports = {
  DISCOVERY_ENDPOINT
};
