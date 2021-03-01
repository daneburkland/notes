import { Machine, assign } from "xstate";
import createAuth0Client from "@auth0/auth0-spa-js";

export interface IContext {
  domain: any;
  clientId: any;
  audience: any;
  redirectUri: any;
  client: any;
  user: any;
  accessToken: any;
}

interface ISchema {
  states: {
    init: {};
    initialized: {};
    authenticated: {};
    gettingToken: {};
    error: {};
    idle: {};
  };
}

function initAuth0({ domain, clientId, audience, redirectUri }: IContext) {
  return createAuth0Client({
    domain,
    client_id: clientId,
    audience,
    redirect_uri: redirectUri,
  });
}

function getIsAuthenticated({ client }: IContext) {
  return client.isAuthenticated();
}

function getUser({ client }: IContext) {
  return client.getUser();
}

function getToken({ client }: IContext) {
  return client.getTokenSilently();
}

const authMachine = {
  id: "auth",
  initial: "init",
  context: {
    domain: "",
    clientId: "",
    audience: "",
    redirectUri: "",
    client: {},
    user: {},
    accessToken: "",
  },
  states: {
    init: {
      invoke: {
        src: initAuth0,
        onDone: {
          target: "initialized",
          actions: [
            assign<IContext>({
              client: (_: IContext, event: any) => event.data,
            }),
          ],
        },
      },
    },
    initialized: {
      invoke: {
        src: getIsAuthenticated,
        onDone: [
          {
            target: "authenticated",
            cond: (_: IContext, event: any) => event.data,
          },
          {
            target: "idleNotAuthenticated",
          },
        ],
      },
    },
    authenticated: {
      invoke: {
        src: getUser,
        onDone: {
          target: "gettingToken",
          actions: [
            assign<IContext>({
              user: (_: IContext, event: any) => event.data,
            }),
          ],
        },
      },
    },
    gettingToken: {
      invoke: {
        src: getToken,
        onDone: {
          target: "idleAuthenticated",
          actions: [
            assign<IContext>({
              accessToken: (_: IContext, event: any) => event.data,
            }),
          ],
        },
      },
    },
    idleAuthenticated: {},
    idleNotAuthenticated: {},
    error: {},
  },
};

export default authMachine;
