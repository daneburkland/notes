import { Machine, assign } from "xstate";
import createAuth0Client from "@auth0/auth0-spa-js";

export const LOG_IN = "LOG_IN";

export interface IContext {
  domain: any;
  clientId: any;
  audience: any;
  redirectUri: any;
  authClient: any;
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

function getIsAuthenticated({ authClient }: IContext) {
  return authClient.isAuthenticated();
}

function getUser({ authClient }: IContext) {
  return authClient.getUser();
}

function getToken({ authClient }: IContext) {
  return authClient.getTokenSilently();
}

function loginWithRedirect({ authClient }: IContext) {
  return authClient.loginWithRedirect();
}

const authMachine = {
  id: "auth",
  initial: "init",
  context: {
    domain: "",
    clientId: "",
    audience: "",
    redirectUri: "",
    authClient: {},
    user: {},
    accessToken: "",
  },
  states: {
    init: {
      invoke: {
        src: initAuth0,
        onDone: {
          target: "gettingToken",
          actions: [
            assign<IContext>({
              authClient: (_: IContext, event: any) => event.data,
            }),
          ],
        },
      },
    },
    loggingIn: {
      invoke: {
        src: loginWithRedirect,
        onDone: {
          target: "initialized",
        },
      },
    },
    gettingToken: {
      invoke: {
        src: getToken,
        onDone: {
          target: "initialized",
          actions: [
            assign<IContext>({
              accessToken: (_: IContext, event: any) => event.data,
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
            cond: (_: IContext, event: any) => {
              return event.data;
            },
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
          target: "idleAuthenticated",
          actions: [
            assign<IContext>({
              user: (_: IContext, event: any) => event.data,
            }),
          ],
        },
      },
    },
    idleAuthenticated: {},
    idleNotAuthenticated: {},
    error: {},
  },
  on: {
    [LOG_IN]: {
      target: ".loggingIn",
    },
  },
};

export default authMachine;
