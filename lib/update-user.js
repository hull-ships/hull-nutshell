"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = updateUser;

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _hogan = require("hogan.js");

var _hogan2 = _interopRequireDefault(_hogan);

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _bottleneck = require("bottleneck");

var _bottleneck2 = _interopRequireDefault(_bottleneck);

var _lruCache = require("lru-cache");

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Limiter = new _bottleneck2.default(1, 1000);

var cache = (0, _lruCache2.default)({ max: 1000, maxAge: 24 * 3600 * 1000 }); // Max age 1 day

function createUser(url, form) {
  return new _bluebird2.default(function (resolve, reject) {
    _request2.default.post({ url: url, form: form }, function (err, res) {
      if (!err && res.statusCode < 400) {
        resolve(res);
      } else {
        var error = err || new Error(res.body);
        reject(error);
      }
    });
  });
}

// return updateUser({ message }, { ship, hull });
function updateUser(_ref, _ref2) {
  var _ref$message = _ref.message,
      message = _ref$message === undefined ? {} : _ref$message;
  var _ref2$ship = _ref2.ship,
      ship = _ref2$ship === undefined ? {} : _ref2$ship,
      hull = _ref2.hull,
      _ref2$force = _ref2.force,
      force = _ref2$force === undefined ? false : _ref2$force;
  // eslint-disable-line consistent-return
  hull.logger.debug("nutshell.user.update", message);

  var _message$user = message.user,
      user = _message$user === undefined ? {} : _message$user,
      _message$segments = message.segments,
      segments = _message$segments === undefined ? [] : _message$segments;


  if (!ship || !user || !user.id) {
    return hull.logger.debug("nutshell.user.error", { message: "missing data", ship: ship, user: user });
  }

  // User has already been pushed to nutshell
  if (!force && cache.get(user.id)) {
    return hull.logger.warn("nutshell.user.skip", { message: "id in cache", id: user.id, email: user.email });
  }
  // if (!force && user[`traits_nutshell/created_at`]) return hull.logger.warn("nutshell.user.skip",{ message: "already imported", id: user.id, email: user.email, nutshell_created_at: user[`traits_nutshell/created_at`] });

  // Ignore if form_api_url is not present

  var _ref3 = ship.private_settings || {},
      form_api_url = _ref3.form_api_url,
      synchronized_segments = _ref3.synchronized_segments,
      mapping = _ref3.mapping;

  if (!form_api_url) return hull.logger.error("nutshell.error.credentials", { message: "missing form_api_url" });

  if (!force && synchronized_segments.length > 0 && !_lodash2.default.intersection(_lodash2.default.map(segments, "id"), synchronized_segments).length) {
    return hull.logger.warn("nutshell.user.skip", { message: "not matching any segments", user: user.id });
  }

  // Ignore if mapping is not defined
  if (!mapping || !mapping.length) {
    return hull.logger.info("nutshell.user.skip", { message: "no mapping defined", mapping: mapping });
  }

  var missingField = false;
  var form = mapping.reduce(function (r, m) {
    // eslint-disable-line array-callback-return, consistent-return
    if (r) {
      var value = void 0;
      try {
        value = _hogan2.default.compile(m.hull).render(user);
      } catch (err) {
        hull.logger.error("nutshell.user.template.error ", err.message);
      }

      if (_lodash2.default.isEmpty(value)) {
        if (m.is_required) {
          missingField = m;
          return false;
        }
        return r;
      }

      return _lodash2.default.set(r, m.nutshell, value);
    }
  }, {});

  var formEmail = _lodash2.default.get(form, "contact.email");

  if (!force && formEmail && cache.get(formEmail)) {
    return hull.logger.warn("nutshell.user.skip", { message: "email in cache", id: user.id, email: formEmail });
  }

  if (!form) {
    return hull.logger.info("nutshell.user.skip", { message: "missing field", field: missingField, user: user });
  }

  hull.logger.warn("nutshell.user.create", { id: user.id, form: form });

  cache.set(user.id, new Date().getTime());

  if (formEmail) cache.set(formEmail, new Date().getTime());

  Limiter.schedule(createUser, form_api_url, form).then(function () {
    hull.logger.info("nutshell.user.create.success", { id: user.id, email: formEmail });
    return hull.asUser({ id: user.id }).traits({ created_at: new Date().toISOString() }, { source: "nutshell", sync: true });
  }, function (err) {
    cache.del(user.id);
    if (formEmail) {
      cache.del(formEmail);
    }
    hull.logger.warn("nutshell.user.create.error", { id: user.id, err: JSON.stringify(err) });
  });
}