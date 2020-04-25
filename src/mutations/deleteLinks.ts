import gql from "graphql-tag";

const DELETE_LINKS = gql`
  mutation DeleteLinks($linkIds: [uuid!]!) {
    delete_link(where: { id: { _in: $linkIds } }) {
      returning {
        id
      }
    }
  }
`;

export default DELETE_LINKS;
