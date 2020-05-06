import gql from "graphql-tag";

const GET_PAGES_BY_TITLE = gql`
  query GetPagesByTitle($title: String) {
    page(where: { title: { _ilike: $title } }) {
      title
    }
  }
`;

export default GET_PAGES_BY_TITLE;