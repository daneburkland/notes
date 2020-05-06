import gql from "graphql-tag";

// Get all daily pages plus pages that have at least one link
const GET_PAGES = gql`
  query GetPages {
    page(
      where: { _or: [{ links: {} }, { isDaily: { _eq: true } }] }
      order_by: { updated_at: desc }
    ) {
      node
      title
      updated_at
      links_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export default GET_PAGES;
