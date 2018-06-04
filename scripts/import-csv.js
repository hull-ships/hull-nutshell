/*
  USAGE:

  loadSyncAgent()
  loadScript("./scripts/import-csv")

  Contacts
  loadAndParse(fileName).map(transformContactsRecords).map(mapRecords("Contact")).filter(filterLeads).map(prepareUserImport).on("data", console.log).pipe(fs.createWriteStream(fileName))

  Accounts
  loadAndParse(fileName).map(transformAccountsRecords).map(mapRecords("Account")).on("data", console.log)

  Prepare index:
  cat prepared-import-contacts.json | jq '.traits["nutshell_contact/id"] + " " + .traits.email' > filename
  contactIds = fs.readFileSync(filename).toString()
  indexedContactIds = contactIds.split("\n").map(r => lo.trim(r, '"').split(" ")).filter(r => r[1] !== '').reduce((acc, item) => { acc[item[0]] = item[1]; return acc; }, {})
  loadScript("./scripts/import-csv")

  Leads:
  loadAndParse(fileName).map(transformLeadsRecords).consume(mapLeadsRecords).map(findContactIdent).filter(filterLeads).map(prepareUserImport).on("data", console.log).pipe(fs.createWriteStream(fileName))
 */
module.exports = function script() {
  const {
    lo, highland, fs, parse, syncAgent, indexedContactIds
  } = this;

  this.loadAndParse = (file) => {
    return highland(highland(fs.createReadStream(file))
      .split()
      // .slice(0, 10)
      .intersperse("\n")
      .pipe(parse({ delimiter: ",", columns: true })));
  };

  this.transformLeadsRecords = (r) => {
    r.id = r.id.replace("-leads", "");
    r.contacts = lo.filter(r.contacts.split(",")).map(id => ({ id: id.replace("-contacts", "") }));
    r.modifiedTime = r.last_modified;
    r.createdTime = r.date_created;
    r.confidence = r.confidence.replace("%", "");
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

  this.findContactIdent = (r) => {
    if (indexedContactIds === undefined) {
      throw new Error("We need indexedContactIds");
    }
    const contactAnonymousId = r.ident.anonymous_id;
    const id = contactAnonymousId.replace("nutshell-contact:", "");
    try {
      r.ident.email = indexedContactIds[id];
    } catch (e) {}

    return r;
  };

  this.filterLeads = (r) => {
    return r.ident.email !== "" || (r.traits.first_name === "" && r.traits.last_name);
  };

  this.mapRecords = (type) => {
    return r => ({ traits: syncAgent.attributesMapper.mapToHullAttributeObject(type, r), ident: syncAgent.attributesMapper.mapToHullIdentObject(type, r) });
  };

  this.transformContactsRecords = (r) => {
    r.id = r.id.replace("-contacts", "");
    const splitName = r.name.split(" ");
    r.name = {
      givenName: splitName.splice(0, 1).join(" "),
      familyName: splitName.splice(1).join(" ")
    };
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

  this.prepareUserImport = (r) => {
    const parsedTraits = lo.reduce(r.traits, (acc, trait, traitName) => {
      if (trait && trait.value) {
        acc[traitName] = trait.value;
      } else {
        acc[traitName] = "";
      }
      return acc;
    }, {});
    const data = {
      traits: parsedTraits
    };
    data.traits.email = r.ident.email;
    data.traits.anonymous_ids = [r.ident.anonymous_id];
    data.traits.initial_nutshell_import = true;
    return JSON.stringify(data) + "\n";
  };
};
