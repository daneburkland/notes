import gql from "graphql-tag";

// Until I set up a way to delete pages that aren't referenced, this query contains that logic
const GET_PAGES_BY_TITLE = gql`
  query GetPagesByTitle($title: String) {
    page(
      where: {
        _and: [
          { title: { _ilike: $title } }
          { _or: [{ references: {} }, { isDaily: { _eq: true } }] }
        ]
      }
    ) {
      title
      references {
        id
      }
    }
  }
`;

export default GET_PAGES_BY_TITLE;
