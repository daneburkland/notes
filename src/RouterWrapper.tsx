import React, { ReactElement } from "react";
import { Router } from "react-router-dom";
import { createBrowserHistory } from "history";

function RouterWrapper({ children }: { children: ReactElement }) {
  const history = createBrowserHistory();
  return <Router history={history}>{children}</Router>;
}

export default RouterWrapper;
