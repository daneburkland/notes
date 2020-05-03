import gql from "graphql-tag";

// Get all daily pages plus pages that have at least one link
const GET_PAGE = gql`
  query GetPages {
    page(where: { _or: [{ links: {} }, { isDaily: { _eq: true } }] }) {
      node
      title
      links_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export default GET_PAGE;
