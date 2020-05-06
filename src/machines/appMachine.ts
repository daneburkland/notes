import Route from "route-parser";
import { Machine, assign, spawn, Interpreter } from "xstate";
import createPageMachine, { IContext as IPageContext } from "./page";
import { map } from "rxjs/operators";
import { todayDateString } from "../utils/datetime";

export const SELECT = "SELECT";
export const ROUTE_CHANGED = "ROUTE_CHANGED";

interface IPages {
  [page: string]: Interpreter<IPageContext, any, any> | null;
}

interface IContext {
  page: Interpreter<IPageContext> | null;
  pages: IPages;
  upsertLinks(links: any): any;
  upsertPage(page: any): any;
  getOrCreatePage(variables: any): any;
  deleteLinks(linkIds: any): any;
  getLinksByValue(value: any): any;
  getPagesByTitle(value: any): any;
  history$: any;
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
  context: IContext;
  pageTitle: string;
}) => {
  const pageTitle = pageTitleFromUrl || todayDateString();
  let page = context.pages[pageTitle];
  const {
    upsertLinks,
    upsertPage,
    deleteLinks,
    getOrCreatePage,
    getLinksByValue,
    getPagesByTitle,
  } = context;

  if (page) {
    return {
      ...context,
      page,
    };
  }

  page = spawn(
    createPageMachine({
      upsertLinks,
      upsertPage,
      deleteLinks,
      getOrCreatePage,
      getLinksByValue,
      getPagesByTitle,
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

const appMachine = Machine<IContext, ISchema, IEvent>(
  {
    id: "app",
    initial: "init",
    invoke: {
      src: ({ history$ }) => {
        return history$.pipe(
          map(() => {
            return {
              type: ROUTE_CHANGED,
            };
          })
        );
      },
    },
    context: {
      pages: {},
      page: null,
      upsertLinks: () => null,
      upsertPage: () => null,
      deleteLinks: () => null,
      getOrCreatePage: () => null,
      getLinksByValue: () => null,
      getPagesByTitle: () => null,
      history$: null,
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
        entry: assign<IContext>((context: any, event: any) => {
          const { pathname } = window.location;
          const route = new Route("/page/:pageTitle");
          const { pageTitle } = route.match(pathname) as { pageTitle: string };
          return resolveSelectedPageContext({ context, pageTitle });
        }),
      },
      error: {},
    },
    on: {
      [ROUTE_CHANGED]: [
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
      [SELECT]: {
        target: ".selectedPage",
        actions: assign<IContext>((context, event: any) => {
          const pageTitle = event.pageTitle;

          return resolveSelectedPageContext({ context, pageTitle });
        }),
      },
    },
  },
  {
    guards: {
      verifyRoute: (context: IContext, event: IEvent, { cond }: any) => {
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

export default appMachine;
