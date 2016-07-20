import express from 'express';
import path from 'path';
import { NotifHandler, BatchHandler } from 'hull';

import updateUser from './update-user';

export function Server({ hostSecret = '123' }) {

  const app = express();
  app.use(express.static(path.resolve(__dirname, '..', 'dist')));
  app.use(express.static(path.resolve(__dirname, '..', 'assets')));

  app.post('/notify', NotifHandler({
    hostSecret,
    groupTraits: false,
    handlers: {
      'user:update': updateUser
    }
  }));

  app.post('/batch', BatchHandler({
    hostSecret,
    groupTraits: false,
    handler(notifications, context) {
      return notifications.map(n => updateUser(n, context))
    }
  }));

  app.get('/manifest.json', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'manifest.json'));
  });

  return app;

}
