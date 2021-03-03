import Route from "route-parser";
import { Machine, assign, spawn, Interpreter } from "xstate";
import createPageMachine, { IContext as IPageContext } from "./page";
import { map } from "rxjs/operators";
import { todayDateString } from "../utils/datetime";
import { path } from "xstate/lib/utils";

export const SELECT = "SELECT";
export const ROUTE_CHANGED = "ROUTE_CHANGED";

interface IPages {
  [page: string]: Interpreter<IPageContext, any, any> | null;
}

export interface IContext {
  page: any;
  pages: IPages;
  apolloClient: any;
  history$: any;
  authClient: any;
}

interface ISchema {
  states: {
    init: {};
    selectedPage: {};
    error: {};
  };
}

type IEvent =
  | { type: "SELECT"; pageTitle: string }
  | { type: "ROUTE_CHANGED"; value: any };

const resolveSelectedPageContext = ({
  context,
  pageTitle: pageTitleFromUrl,
}: {
  context: any;
  pageTitle: string;
}) => {
  const pageTitle = pageTitleFromUrl || todayDateString();
  let page = context.pages[pageTitle];
  const { apolloClient, authClient } = context;

  if (page) {
    return {
      ...context,
      page,
    };
  }

  page = spawn(
    createPageMachine({
      apolloClient,
      authClient,
      title: pageTitle,
    })
  );

  return {
    pages: {
      ...context.pages,
      [pageTitle]: page,
    },
    page,
  };
};

const appMachine = {
  initial: "init",
  invoke: {
    src: ({ history$ }: any) => {
      return history$.pipe(
        map(() => {
          return {
            type: ROUTE_CHANGED,
          };
        })
      );
    },
  },
  states: {
    init: {
      on: {
        "": [
          {
            target: "selectedPage",
            cond: { type: "verifyRoute", location: "/page/:pageTitle" },
          },
          {
            target: "selectedPage",
            cond: { type: "verifyRoute", location: "/" },
          },
          { target: "error" },
        ],
      },
    },
    selectedPage: {
      entry: [
        assign<IContext>((context: any) => {
          const { pathname } = window.location;
          const route = new Route("/page/:pageTitle");
          const { pageTitle } = route.match(pathname) as { pageTitle: string };
          return resolveSelectedPageContext({ context, pageTitle });
        }),
      ],
    },
    error: {},
  },
  on: {
    [ROUTE_CHANGED]: [
      {
        target: ".selectedPage",
        cond: { type: "verifyRoute", location: "/page/:pageTitle" },
        internal: false,
      },
      {
        target: ".selectedPage",
        cond: { type: "verifyRoute", location: "/" },
        internal: false,
      },
      { target: ".error" },
    ],
    [SELECT]: {
      target: ".selectedPage",
      actions: assign<IContext>((context, event: any) => {
        const pageTitle = event.pageTitle;

        return resolveSelectedPageContext({ context, pageTitle });
      }),
    },
  },
};

export default appMachine;
