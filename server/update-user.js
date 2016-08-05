import _ from 'lodash';
import request from 'request';
import Hogan from 'hogan.js';

export default function updateUser({ message={} }, { ship={}, hull }) {

  console.warn("Hello updateUser", message);

  const { user={}, segments=[] } = message;


  if (!ship || !user || !user.id) {
    console.warn("Bye bye")
    return false;
  }


  // User has already been pushed to nutshell
  if (user[`traits_nutshell/created_at`]) {
    console.warn("Skip update: user already imported", { id: user.id, email: user.email });
    return false;
  }

  // Ignore if form_api_url is not present
  const { form_api_url, synchronized_segments, mapping } = ship.private_settings || {};

  if (!form_api_url) {
    console.warn('No credentials for ship', ship.id);
    return Promise.reject(new Error("Missing credentials"));
  }

  if (
    synchronized_segments.length > 0 &&
    !_.intersection(_.map(segments, 'id'), synchronized_segments).length
    ) {
    console.warn(`Skip update for ${user.id} because not matching any segment`);
    return false;
  }

  // Ignore if mapping is not defined
  if (!mapping || !mapping.length) {
    console.log('Skip update:  no mapping defined', mapping)
    return false;
  }


  let missingField = false;
  const form = mapping.reduce((r, m) => {

    if (r) {
      let value;
      try {
        value = Hogan.compile(m.hull).render(user);
      } catch (err) {
        console.warn("Error in hogan render ", err);
      }

      if (_.isEmpty(value) && m.is_required) {
        missingField = m;
        return false;
      }

      return _.set(r, m.nutshell, value);
    }
  }, {});

  if (!form) {
    console.log('Skip update:  missing required field: ', { missingField, user });
    return false;
  }

  console.warn("Create user", user.id, JSON.stringify({form }));

  request.post({ url: form_api_url, form }, (err, res, body) => {
    if (!err && res.statusCode < 400) {
      return hull.as(user.id).traits({ created_at: new Date().toISOString() }, { source: 'nutshell' });
    }
  });


}
