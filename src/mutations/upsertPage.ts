import gql from "graphql-tag";

const UPSERT_PAGE = gql`
  mutation UpsertPage($page: [page_insert_input!]!) {
    insert_page(
      objects: $page
      on_conflict: { constraint: page_pkey, update_columns: [node] }
    ) {
      returning {
        title
        tags {
          id
        }
      }
    }
  }
`;

export default UPSERT_PAGE;
