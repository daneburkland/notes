import React from "react";
import { useQuery } from "@apollo/react-hooks";
import { Link } from "react-router-dom";
import GET_PAGES from "../queries/getPages";

function PageList() {
  const { data, loading } = useQuery(GET_PAGES);
  return (
    <ul>
      {!loading &&
        data.page.map((page: any) => (
          <Link to={{ pathname: `/page/${page.id}` }} key={page.title}>
            {page.title}
          </Link>
        ))}
    </ul>
  );
}

export default PageList;
