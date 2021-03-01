import React from "react";
import { Switch, Route, Link } from "react-router-dom";
import Page from "./components/Page";
import PageList from "./components/PageList";

export function App({ current }: { current: any }) {
  const isAuthenticated = current.matches({ auth: "idleAuthenticated" });

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
        {!process.env.REACT_APP_IS_DEMO && !isAuthenticated && (
          <button
            className="cursor-pointer"
            // onClick={() => loginWithRedirect()}
          >
            Log in
          </button>
        )}
      </ul>
      <Switch>
        <Route path="/all">
          <PageList />
        </Route>
        <Route exact path="/">
          <Page current={current} />
        </Route>
        <Route exact path="/page/:pageTitle">
          <Page current={current} />
        </Route>
      </Switch>
    </div>
  );
}

export default App;
