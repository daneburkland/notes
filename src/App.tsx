import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import Editor from "./components/Editor/";
import PageList from "./components/PageList";

function App() {
  return (
    <div className="App max-w-lg mx-auto">
      <Router>
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
          <Route exact path="/" component={Editor} />
          <Route path="/all">
            <PageList />
          </Route>
          <Route exact path="/page/:pageTitle" component={Editor} />
        </Switch>
      </Router>
    </div>
  );
}

export default App;
