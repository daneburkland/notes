import React, { useState, ReactElement, useEffect, useCallback } from "react";
import ApolloClient from "apollo-boost";
import { OperationVariables } from "@apollo/react-common";
import { ApolloProvider } from "@apollo/react-hooks";
import { DocumentNode } from "graphql";
import { useAuth0 } from "./auth/react-auth0-wrapper";

const uri =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_GRAPHQL_ENDPOINT_PROD
    : process.env.REACT_APP_GRAPHQL_ENDPOINT_DEV;

export const ApolloClientContext = React.createContext({
  useLazyQuery: null as any,
});

// TODO: make this a machine
function ApolloWrapper({ children }: { children: ReactElement }) {
  const { getTokenSilently, loading } = useAuth0();

  const [accessToken, setAccessToken] = useState();

  const getAccessToken = useCallback(async () => {
    try {
      const token = await getTokenSilently();
      setAccessToken(token);
    } catch (e) {
      console.log(e);
    }
  }, [getTokenSilently]);

  useEffect(() => {
    !loading && getAccessToken();
  }, [loading, getAccessToken]);

  const client = new ApolloClient({
    uri,
    request: (operation) => {
      const headers = !!accessToken
        ? { authorization: `Bearer ${accessToken}` }
        : {};
      operation.setContext({
        headers,
      });
    },
  });

  function useLazyQuery<TData = any, TVariables = OperationVariables>(
    query: DocumentNode
  ) {
    return (variables: TVariables) =>
      client.query<TData, TVariables>({
        query: query,
        variables: variables,
      });
  }

  return (
    <ApolloProvider client={client}>
      <ApolloClientContext.Provider value={{ useLazyQuery }}>
        {children}
      </ApolloClientContext.Provider>
    </ApolloProvider>
  );
}

export default ApolloWrapper;
