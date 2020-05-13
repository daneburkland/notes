import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "./styles/index.css";
import App from "./App";
import RouterWrapper from "./RouterWrapper";
import * as serviceWorker from "./serviceWorker";

import { Auth0Provider } from "./auth/react-auth0-wrapper";
import config from "./auth/auth-config.js";
import ApolloWrapper from "./ApolloWrapper";

ReactDOM.render(
  <React.StrictMode>
    <RouterWrapper>
      <Auth0Provider
        domain={config.domain}
        client_id={config.clientId}
        audience={config.audience}
        redirect_uri={config.redirect_uri}
      >
        <ApolloWrapper>
          <App />
        </ApolloWrapper>
      </Auth0Provider>
    </RouterWrapper>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
