import { StateNodeConfig } from "xstate";
import Route from "route-parser";
import { Machine, assign } from "xstate";
import appMachine, { IContext as IAppContext } from "./appMachine";
import authMachine, { IContext as IAuthContext } from "./authMachine";
import createAuth0Client from "@auth0/auth0-spa-js";

function initAuth0({ domain, clientId, audience, redirectUri }: any) {
  return createAuth0Client({
    domain,
    client_id: clientId,
    audience,
    redirect_uri: redirectUri,
  });
}

interface IContext {
  domain: any;
  clientId: any;
  audience: any;
  redirectUri: any;
  authClient: any;
  user: any;
  accessToken: any;
  page: any;
  pages: any;
  apolloClient: any;
  history$: any;
}

interface ISchema {
  states: {
    app: {
      init: {};
    };
    auth: {};
  };
}

const rootMachine = Machine<any, any, any>(
  {
    id: "root",
    initial: "init",
    states: {
      init: {
        invoke: {
          src: initAuth0,
          onDone: {
            target: "initialized",
            actions: [
              assign<any>({
                authClient: (_: any, event: any) => event.data,
              }),
            ],
          },
        },
      },
      initialized: {
        type: "parallel",
        states: {
          app: {
            ...(appMachine as StateNodeConfig<any, any, any>),
            initial: "init",
          },
          auth: {
            ...(authMachine as StateNodeConfig<any, any, any>),
            initial: "init",
          },
        },
      },
    },
  },
  {
    guards: {
      verifyRoute: (context: IContext, event: any, { cond }: any) => {
        const { pathname } = window.location;
        const route = new Route(cond.location);
        if (route.match(pathname)) {
          return true;
        }
        return false;
      },
    },
  }
);

export default rootMachine;
