import gql from "graphql-tag";

const GET_PAGE = gql`
  query GetPage($title: String!) {
    page_by_pk(title: $title) {
      node
      title
    }
  }
`;

export default GET_PAGE;
