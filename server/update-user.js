import _ from 'lodash';
import request from 'request';
import objectMapper from 'object-mapper';


export default function({ message={} }, { ship={}, hull }) {

  try {
    const { user={}, segments=[] } = message;

    if(!ship || !user || !user.id || !user.external_id) {
      console.warn("Skip update : who is this user", { user })
      return false;
    }


    // User has already been pushed to nutshell
    if (user.traits_nutshell_pushed_at) {
      console.warn("Skip update : user already imported")
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
      console.log(`Skip update for ${user.id} because not matching any segment`);
      return false;
    };


    // Ignore if mapping is not defined
    if (!mapping || !mapping.length) {
      console.log('Skip update:  no mapping defined', mapping)
      return false;
    }

    const userMapping = mapping.reduce((r,m) => {
      if (r && (user[m.hull] || !m.is_required)) {
        r[m.hull] = m.nutshell;
      } else {
        r = false
      }
      return r;
    }, {});

    if (!userMapping) {
      console.log('Skip update:  missing required field')
      return false;
    }

    const form = objectMapper(user, userMapping);

    console.warn("Hello User", { userMapping, form, form_api_url });

    request.post({ url: form_api_url, form }, (err, res, body) => {
      if (!err && res.statusCode < 400) {
        return hull.as(user.id).traits({
          nutshell_pushed_at: new Date().toISOString()
        }).then(
          ok => console.warn('ok trait updated'),
          err => console.warn('oops error updaeing trauts', err)
        );
      }
    })

  } catch(err) {
    console.warn("Alors ca c'est pas banal, ", err);
  }


}
