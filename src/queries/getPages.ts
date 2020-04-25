import gql from "graphql-tag";

const GET_PAGE = gql`
  query GetPages {
    page {
      id
      node
      title
    }
  }
`;

export default GET_PAGE;
