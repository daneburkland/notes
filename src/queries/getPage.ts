import gql from "graphql-tag";

const GET_PAGE = gql`
  query GetPage($id: uuid!) {
    page_by_pk(id: $id) {
      id
      node
    }
  }
`;

export default GET_PAGE;
