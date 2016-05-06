import express from 'express';
import path from 'path';
import { NotifHandler } from 'hull';

import updateUser from './update-user';

export function Server() {

  const notifHandler = NotifHandler({
    groupTraits: false,
    events: {
      'user_report:update' : updateUser
    }
  });

  const app = express();
  app.use(express.static(path.resolve(__dirname, '..', 'dist')));
  app.use(express.static(path.resolve(__dirname, '..', 'assets')));

  app.post('/notify', notifHandler);

  app.get('/manifest.json', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'manifest.json'));
  });

  return app;

}
