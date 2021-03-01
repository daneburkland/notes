import React from "react";
import ReactDOM from "react-dom";
import "./styles/index.css";
import "./index.css";
import AppWrapper from "./AppWrapper";
import RouterWrapper from "./RouterWrapper";
import * as serviceWorker from "./serviceWorker";
import "./fonts/Montserrat-Black.ttf";
import "./fonts/Montserrat-Regular.ttf";

ReactDOM.render(
  <React.StrictMode>
    <RouterWrapper>
      
          <AppWrapper />
      
    </RouterWrapper>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
