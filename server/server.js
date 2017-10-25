import { notifHandler } from "hull/lib/utils";

import updateUser from "./update-user";

const NotifyHandler = notifHandler({
  handlers: {
    "user:update": ({ ship, client: hull }, messages = []) => {
      return Promise.all(messages.map((message) => {
        return updateUser({ message }, { ship, hull });
      }));
    }
  }
});

export default function Server(app) {
  app.post("/batch", NotifyHandler);
  app.post("/notify", NotifyHandler);
  return app;
}
