import React from "react";
import { Switch, Route, Link } from "react-router-dom";
import Page from "./components/Page";
import PageList from "./components/PageList";
import { LOG_IN } from "./machines/authMachine";

export function App({ current, send }: { current: any; send: any }) {
  const isNotAuthenticated = current.matches({
    initialized: { auth: "idleNotAuthenticated" },
  });

  return (
    <div className="App max-w-xl px-4 py-10 mx-auto">
      <ul className="flex justify-between pb-5">
        <li className="mr-6">
          <Link
            to={{ pathname: "/all" }}
            className="font-black text-2xl"
            href="#"
          >
            notes
          </Link>
        </li>
        {!process.env.REACT_APP_IS_DEMO && isNotAuthenticated && (
          <button className="cursor-pointer" onClick={() => send(LOG_IN)}>
            Log in
          </button>
        )}
      </ul>
      <Switch>
        <Route path="/all">
          <PageList />
        </Route>
        <Route exact path="/">
          <Page machine={current.context.page} />
        </Route>
        <Route exact path="/page/:pageTitle">
          <Page machine={current.context.page} />
        </Route>
      </Switch>
    </div>
  );
}

export default App;
