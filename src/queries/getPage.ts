import gql from "graphql-tag";

const GET_PAGE = gql`
  query GetPage($id: String!) {
    page_by_pk(id: $id) {
      id
      node
      title
    }
  }
`;

export default GET_PAGE;
