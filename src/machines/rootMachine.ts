import { StateNodeConfig } from "xstate";
import Route from "route-parser";
import { Machine, assign, spawn, Interpreter } from "xstate";
import appMachine, { IContext as IAppContext } from "./appMachine";
import authMachine, { IContext as IAuthContext } from "./authMachine";



interface IContext {
  domain: any;
  clientId: any;
  audience: any;
  redirectUri: any;
  client: any;
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
      init: {}
    };
    auth: {};
  };
}

const rootMachine = Machine<any, any, any>(
  {
    id: "root",
    type: "parallel",
    states: {
      app: {
        ...(appMachine as StateNodeConfig<any, any, any>),
        initial: 'init'
      },
      auth: {
        ...(authMachine as StateNodeConfig<any, any, any>),
        initial: 'init'
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
