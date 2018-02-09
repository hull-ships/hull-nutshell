/*
  USAGE:

  Leads:
  loadAndParse(fileName).map(transformLeadsRecords).consume(mapLeadsRecords).on("data", console.log)

  Contacts
  loadAndParse(fileName).map(transformContactsRecords).map(mapRecords("Contact")).on("data", console.log)

  Accounts
  loadAndParse(fileName).map(transformAccountsRecords).map(mapRecords("Account")).on("data", console.log)
 */
module.exports = function script() {
  const {
    lo, highland, fs, parse, syncAgent
  } = this;

  this.loadAndParse = (file) => {
    return highland(highland(fs.createReadStream(file))
      .split()
      // .slice(0, 10)
      .intersperse("\n")
      .pipe(parse({ delimiter: ",", columns: true })));
  };

  this.transformLeadsRecords = (r) => {
    r.contacts = lo.filter(r.contacts.split(",")).map(id => ({ id: id.replace("-contacts", "") }));
    r.modifiedTime = r.last_modified;
    r.createdTime = r.date_created;
    return r;
  };

  this.mapLeadsRecords = (err, r, push, next) => {
    if (err) {
      push(err);
      next();
    } else if (r === highland.nil) {
      // pass nil (end event) along the stream
      push(null, r);
    } else {
      lo.get(r, "contacts", []).map((contact, i) => {
        const data = {
          traits: syncAgent.attributesMapper.mapToHullAttributeObject("Lead", r),
          ident: syncAgent.attributesMapper.mapToHullIdentObject("Lead", r, i)
        };
        return push(null, data);
      });
      next();
    }
  };

  this.mapRecords = (type) => {
    return r => ({ traits: syncAgent.attributesMapper.mapToHullAttributeObject(type, r), ident: syncAgent.attributesMapper.mapToHullIdentObject(type, r) });
  };

  this.transformContactsRecords = (r) => {
    r.id = r.id.replace("-contacts", "");
    r.email = {
      "--primary": r.email
    };
    return r;
  };

  this.transformAccountsRecords = (r) => {
    r.id = r.id.replace("-accounts", "");
    r.url = {
      "--primary": r.url
    };
    return r;
  };

  this.prepare
};
