import gql from "graphql-tag";

const UPSERT_LINKS = gql`
  mutation UpsertLinks($links: [link_insert_input!]!) {
    insert_link(
      objects: $links
      on_conflict: {
        constraint: link_pkey
        update_columns: [value, listItemNode, pageTitle]
      }
    ) {
      returning {
        id
      }
    }
  }
`;

export default UPSERT_LINKS;
