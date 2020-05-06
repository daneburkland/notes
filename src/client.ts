import ApolloClient from "apollo-boost";
import { OperationVariables } from "@apollo/react-common";
import { DocumentNode } from "graphql";
import { uri } from "./api";

export const client = new ApolloClient({
  uri,
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
