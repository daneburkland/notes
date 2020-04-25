import gql from "graphql-tag";

const GET_PAGES_BY_DAY = gql`
  query GetPagesByDay($date: String) {
    page(where: { date: { _eq: $date } }) {
      id
      node
      title
    }
  }
`;

export default GET_PAGES_BY_DAY;
