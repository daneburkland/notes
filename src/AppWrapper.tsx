import React from "react";
import { useHistory } from "react-router-dom";
import ApolloClient from "apollo-boost";
import { useMachine } from "@xstate/react";
import App from "./App";
import { fromEventPattern } from "rxjs";
import rootMachine from "./machines/rootMachine";
import { ApolloProvider, useApolloClient } from "@apollo/react-hooks";
import config from "./auth/auth-config";

const uri =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_GRAPHQL_ENDPOINT_PROD
    : process.env.REACT_APP_GRAPHQL_ENDPOINT_DEV;

export function AppWrapper() {
  const history = useHistory();
  const history$ = fromEventPattern(history.listen);
  const apolloClient = useApolloClient();

  const [state] = useMachine(rootMachine, {
    context: {
      history$,
      apolloClient,
      page: null,
      pages: {},
      domain: config.domain,
      clientId: config.clientId,
      audience: config.audience,
      redirectUri: config.redirect_uri,
    },
  });

  return <App current={state} />;
}

function ApolloWrapper() {
  const client = new ApolloClient({
    uri,
    request: (operation) => {
      const headers = !!false
        ? { authorization: `Bearer ${"accessToken"}` }
        : {};
      operation.setContext({
        headers,
      });
    },
  });

  return (
    <ApolloProvider client={client}>
      <AppWrapper />
    </ApolloProvider>
  );
}

export default ApolloWrapper;
