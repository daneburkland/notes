import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "./styles/index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { ApolloProvider } from "@apollo/react-hooks";
import { OperationVariables } from "@apollo/react-common";
import { DocumentNode } from "graphql";
import ApolloClient from "apollo-boost";

const client = new ApolloClient({
  uri: "https://apollo-starter.herokuapp.com/v1/graphql",
});

export function useLazyQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode
) {
  return (variables: TVariables) =>
    client.query<TData, TVariables>({
      query: query,
      variables: variables,
    });
}

ReactDOM.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
