import React from "react";
import { Router, Switch, Route, Link, useHistory } from "react-router-dom";
import Page from "./components/Page";
import PageList from "./components/PageList";
import { useMachine } from "@xstate/react";
import appMachine from "./machines/appMachine";
import UPSERT_LINKS from "./mutations/upsertLinks";
import UPSERT_PAGE from "./mutations/upsertPage";
import DELETE_LINKS from "./mutations/deleteLinks";
import GET_OR_CREATE_PAGE from "./mutations/getOrCreatePage";
import GET_LINKS_BY_VALUE from "./queries/getLinksByValue";
import { useMutation } from "@apollo/react-hooks";
import { fromEventPattern } from "rxjs";
import { Interpreter } from "xstate";
import { IContext } from "./machines/page";
import { createBrowserHistory } from "history";
import { useLazyQuery } from "./client";

export const AppContext = React.createContext({
  state: {},
  send: (obj: any) => obj,
  page: {} as Interpreter<IContext, any, any> | null,
});

export function App() {
  const [upsertLinks] = useMutation(UPSERT_LINKS);
  const [upsertPage] = useMutation(UPSERT_PAGE);
  const [deleteLinks] = useMutation(DELETE_LINKS);
  const getLinksByValue = useLazyQuery(GET_LINKS_BY_VALUE);
  const [getOrCreatePage] = useMutation(GET_OR_CREATE_PAGE);
  const history = useHistory();
  const history$ = fromEventPattern(history.listen);

  const [state, send] = useMachine(appMachine, {
    context: {
      upsertLinks,
      upsertPage,
      deleteLinks,
      getOrCreatePage,
      getLinksByValue,
      history$,
    },
  });
  const { page } = state.context;

  return (
    <AppContext.Provider value={{ state, send, page }}>
      <ul className="flex py-4">
        <li className="mr-6">
          <Link
            to={{ pathname: "/all" }}
            className="text-blue-500 hover:text-blue-800"
            href="#"
          >
            All pages
          </Link>
        </li>
      </ul>
      <Switch>
        <Route path="/all">
          <PageList />
        </Route>
        <Route exact path="/">
          <Page page={state.context.page} />
        </Route>
        <Route exact path="/page/:pageTitle">
          <Page page={state.context.page} />
        </Route>
      </Switch>
    </AppContext.Provider>
  );
}

function AppWrapper() {
  const history = createBrowserHistory();
  return (
    <div className="App max-w-lg mx-auto">
      <Router history={history}>
        <App />
      </Router>
    </div>
  );
}

export default AppWrapper;
