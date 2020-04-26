import gql from "graphql-tag";

const GET_OR_CREATE_PAGE = gql`
  mutation GetOrCreatePage($page: [page_insert_input!]!) {
    insert_page(
      objects: $page
      on_conflict: { constraint: page_pkey, update_columns: [] }
    ) {
      returning {
        title
      }
    }
  }
`;

export default GET_OR_CREATE_PAGE;
