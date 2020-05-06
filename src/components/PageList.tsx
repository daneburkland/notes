import React from "react";
import { useQuery } from "@apollo/react-hooks";
import { Link } from "react-router-dom";
import GET_PAGES from "../queries/getPages";
import { formatRelative } from "date-fns";

function PageList() {
  const { data, loading } = useQuery(GET_PAGES, {
    fetchPolicy: "network-only",
  });

  return (
    <table className="table-auto w-full">
      <thead>
        <tr>
          <th className="text-left px-4 py-2">Title</th>
          <th className="text-left px-4 py-2">Last updated</th>
        </tr>
      </thead>
      <tbody>
        {!loading &&
          data.page.map((page: any) => (
            <tr key={page.title}>
              <td className="border px-4 py-2">
                {
                  <Link
                    to={{ pathname: `/page/${page.title}` }}
                    key={page.id}
                    className="text-blue-500 hover:text-blue-800"
                  >
                    {page.title}
                  </Link>
                }
              </td>
              <td className="border px-4 py-2">
                {formatRelative(new Date(page.updated_at), new Date())}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default PageList;
