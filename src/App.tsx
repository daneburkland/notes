import React, { useContext } from "react";
import { Switch, Route, Link, useHistory } from "react-router-dom";
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
import GET_PAGES_BY_TITLE from "./queries/getPagesByTitle";
import { useAuth0 } from "./auth/react-auth0-wrapper";
import { ApolloClientContext } from "./ApolloWrapper";

export const AppContext = React.createContext({
  state: {},
  send: (obj: any) => obj,
  page: {} as Interpreter<IContext, any, any> | null,
});

export function App() {
  const { useLazyQuery } = useContext(ApolloClientContext);
  const [upsertLinks] = useMutation(UPSERT_LINKS);
  const [upsertPage] = useMutation(UPSERT_PAGE);
  const [deleteLinks] = useMutation(DELETE_LINKS);
  const getLinksByValue = useLazyQuery(GET_LINKS_BY_VALUE);
  const getPagesByTitle = useLazyQuery(GET_PAGES_BY_TITLE);
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
      getPagesByTitle,
      history$,
    },
  });
  const { page } = state.context;
  const { loginWithRedirect } = useAuth0();

  return (
    <AppContext.Provider value={{ state, send, page }}>
      <ul className="flex justify-between py-4">
        <li className="mr-6">
          <Link
            to={{ pathname: "/all" }}
            className="text-blue-500 hover:text-blue-800"
            href="#"
          >
            All pages
          </Link>
        </li>
        {!!process.env.REACT_APP_IS_DEMO && (
          <li
            className="cursor-pointer text-blue-500 hover:text-blue-800"
            onClick={() => loginWithRedirect()}
          >
            Log in
          </li>
        )}
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

// const onRedirectCallback = (appState: any) => {
//   window.history.replaceState(
//     {},
//     document.title,
//     appState && appState.targetUrl
//       ? appState.targetUrl
//       : window.location.pathname
//   );
// };

function AppWrapper() {
  return (
    <div className="App max-w-lg mx-auto">
      <App />
    </div>
  );
}

export default AppWrapper;
