import gql from "graphql-tag";

const GET_LINKS_BY_VALUE = gql`
  query GetLinksByValue($value: String) {
    link(where: { value: { _eq: $value } }) {
      id
      listItemNode
    }
  }
`;

export default GET_LINKS_BY_VALUE;
