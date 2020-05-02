import gql from "graphql-tag";

const GET_LINKS_BY_VALUE = gql`
  query GetLinksByValue($value: String) {
    link(where: { value: { _ilike: $value } }) {
      id
      listItemNode
      pageTitle
      value
    }
  }
`;

export default GET_LINKS_BY_VALUE;
