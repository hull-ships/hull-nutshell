import _ from 'lodash';
import request from 'request';
import Hogan from 'hogan.js';
import Promise from 'bluebird';
import Bottleneck from 'bottleneck';
import LRU from "lru-cache";

const Limiter = new Bottleneck(1, 1000);

const cache = LRU({ max: 1000, maxAge: 24 * 3600 * 1000 }); // Max age 1 day

function createUser(url, form) {
  return new Promise((resolve, reject) => {
    request.post({ url, form }, (err, res, body) => {
      if (!err && res.statusCode < 400) {
        resolve(res);
      } else {
        const error = err || new Error(res.body);
        reject(error)
      }
    });
  })
}

// return updateUser({ message }, { ship, hull });
export default function updateUser({ message={} }, { ship={}, hull, force = false }) {

  hull.logger.debug("nutshell.user.update", message);

  const { user={}, segments=[] } = message;


  if (!ship || !user || !user.id) {
    return hull.logger.debug("nutshell.user.error", { message: "missing data", ship, user });
  }

  // User has already been pushed to nutshell
  if (!force && cache.get(user.id)) return hull.logger.warn('nutshell.user.skip',{ message: "id in cache", id: user.id, email: user.email });
  // if (!force && user[`traits_nutshell/created_at`]) return hull.logger.warn('nutshell.user.skip',{ message: "already imported", id: user.id, email: user.email, nutshell_created_at: user[`traits_nutshell/created_at`] });

  // Ignore if form_api_url is not present
  const { form_api_url, synchronized_segments, mapping } = ship.private_settings || {};

  if (!form_api_url) return hull.logger.error('nutshell.error.credentials', { message: "missing form_api_url" });

  if (
    !force &&
    synchronized_segments.length > 0 &&
    !_.intersection(_.map(segments, 'id'), synchronized_segments).length
    ) return hull.logger.warn("nutshell.user.skip", { message: "not matching any segments", user: user.id});

  // Ignore if mapping is not defined
  if (!mapping || !mapping.length) return hull.logger.info('nutshell.user.skip',{ message: "no mapping defined", mapping });


  let missingField = false;
  const form = mapping.reduce((r, m) => {
    if (r) {
      let value;
      try {
        value = Hogan.compile(m.hull).render(user);
      } catch (err) {
        hull.logger.error("nutshell.user.template.error ", err.message);
      }

      if (_.isEmpty(value)) {
        if(m.is_required){
          missingField = m;
          return false;
        }
        return r;
      }

      return _.set(r, m.nutshell, value);
    }
  }, {});

  const formEmail = _.get(form, "contact.email");

  if (!force && formEmail && cache.get(formEmail)) return hull.logger.warn('nutshell.user.skip',{ message: "email in cache", id: user.id, email: formEmail });

  if (!form) return hull.logger.info('nutshell.user.skip', { message:"missing field", field: missingField, user });

  hull.logger.warn("nutshell.user.create", { id: user.id, form });

  cache.set(user.id, new Date().getTime());

  if (formEmail) cache.set(formEmail, new Date().getTime());

  Limiter.schedule(createUser, form_api_url, form).then(
    ok => {
      hull.logger.info('nutshell.user.create.success', { id: user.id, email: formEmail });
      return hull.asUser({ id: user.id }).traits({ created_at: new Date().toISOString() }, { source: 'nutshell', sync: true });
    },
    err => {
      cache.del(user.id);
      if (formEmail) cache.del(formEmail);
      hull.logger.warn('nutshell.user.create.error', { id: user.id, err: JSON.stringify(err) })
    }
  );

}
