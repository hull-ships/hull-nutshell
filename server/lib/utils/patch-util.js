/* @flow */
import type { IPatchResult, IPatchUtil, TResourceType } from "../types";

const _ = require("lodash");

const { SUPPORTED_RESOURCETYPES, COMPLEX_FIELDS_MAP } = require("../shared");

class PatchUtil implements IPatchUtil {
  /**
   * Gets or sets the outbound mappings.
   *
   * @type {Object}
   * @memberof PatchUtil
   */
  mappingsOutbound: Object;

  complexFieldsMap: Object;

  /**
   * Creates an instance of PatchUtil.
   * @param {Object} settings The connector settings that contain the attribute mappings.
   * @memberof PatchUtil
   */
  constructor(settings: Object) {
    this.mappingsOutbound = {};
    _.forEach(SUPPORTED_RESOURCETYPES, (r) => {
      _.set(this.mappingsOutbound, r, _.get(settings, `${r.toLowerCase()}_attributes_outbound`, {}));
    });
    this.complexFieldsMap = COMPLEX_FIELDS_MAP;
  }

  /**
   * Creates a patch object that can be used for edit calls against the Nutshell API.
   *
   * @param {TResourceType} resource The name of the Nutshell resource.
   * @param {*} newObject The new object to create (result of AttributesMapper).
   * @param {*} currentObject The current object in Nutshell.
   * @returns {IPatchResult} The patch result indicating whether to process the object or not.
   * @memberof PatchUtil
   *
   * @throws Will throw an error if the `id` or `rev` of the newObject and currentObject are different to
   *         prevent incorrect patches.
   */
  createPatchObject(resource: TResourceType, newObject: Object, currentObject: Object): IPatchResult {
    const mappings = _.get(this.mappingsOutbound, resource);
    const result: IPatchResult = {
      hasChanges: false,
      patchObject: {}
    };

    if (!_.isArray(mappings) || _.size(mappings) === 0) {
      return result;
    }

    // Throw an error if one attempts to patch two different objects.
    if (_.has(newObject, "id") && _.has(currentObject, "id") && newObject.id !== currentObject.id) {
      throw new Error(`The identifier for the hull object ${newObject.id} and nutshell object ${currentObject.id} do not match.`);
    }

    // Throw an error if one attempts to patch the same objects, but different revisions.
    if (_.has(newObject, "rev") && _.has(currentObject, "rev") && newObject.rev !== currentObject.rev) {
      throw new Error(`The revision for the hull object ${newObject.rev} and nutshell object ${currentObject.rev} do not match.`);
    }

    _.forEach(mappings, (m) => {
      const newObjectAttrName = m.nutshell_field_name;
      const currentObjectAttrName = _.get(this.complexFieldsMap, `${resource}.${m.nutshell_field_name}`, m.nutshell_field_name);
      if (_.has(newObject, newObjectAttrName) && !_.isNil(_.get(newObject, newObjectAttrName, null))) {
        if (!_.has(currentObject, currentObjectAttrName) || _.isNil(_.get(currentObject, currentObjectAttrName)) || _.get(currentObject, currentObjectAttrName) === "") {
          _.set(result.patchObject, newObjectAttrName, _.get(newObject, newObjectAttrName));
          result.hasChanges = true;
        } else if (_.get(currentObject, currentObjectAttrName) !== _.get(newObject, newObjectAttrName) && m.overwrite === true) {
          _.set(result.patchObject, newObjectAttrName, _.get(newObject, newObjectAttrName));
          result.hasChanges = true;
        }
      }
    });

    // Apply the identifier and rev if we have changes detected,
    // but drop it if the actual nutshell object has none
    if (result.hasChanges === true) {
      // TODO: if this is set API rejects contact edits
      // _.set(result.patchObject, "id", _.get(currentObject, "id"));
      _.set(result.patchObject, "rev", _.get(currentObject, "rev"));
    }

    return result;
  }
}

module.exports = PatchUtil;
