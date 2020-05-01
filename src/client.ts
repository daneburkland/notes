import ApolloClient from "apollo-boost";
import { OperationVariables } from "@apollo/react-common";
import { DocumentNode } from "graphql";

export const client = new ApolloClient({
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
