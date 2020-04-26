import gql from "graphql-tag";

const GET_PAGE = gql`
  query GetPages {
    page {
      node
      title
    }
  }
`;

export default GET_PAGE;
