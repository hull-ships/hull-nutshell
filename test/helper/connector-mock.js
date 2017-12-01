/* @flow */
class ConnectorMock {
  id: string;
  settings: any;
  private_settings: any;

  constructor(id: string = "1234", settings: any = {}, private_settings: any = {}) {
    this.id = id;
    this.settings = settings;
    this.private_settings = private_settings;
  }
}

module.exports = { ConnectorMock };
