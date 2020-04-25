import React from "react";
import { useQuery } from "@apollo/react-hooks";
import { Link } from "react-router-dom";
import GET_PAGES from "../queries/getPages";

function PageList() {
  const { data, loading } = useQuery(GET_PAGES);
  return (
    <table className="table-auto">
      <thead>
        <tr>
          <th className="px-4 py-2">Title</th>
          <th className="px-4 py-2">ID</th>
        </tr>
      </thead>
      <tbody>
        {!loading &&
          data.page.map((page: any) => (
            <tr key={page.id}>
              <td className="border px-4 py-2">
                {
                  <Link
                    to={{ pathname: `/page/${page.id}` }}
                    key={page.id}
                    className="text-blue-500 hover:text-blue-800"
                  >
                    {page.title}
                  </Link>
                }
              </td>
              <td className="border px-4 py-2">{page.id}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default PageList;
