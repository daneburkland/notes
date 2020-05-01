import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import Editor from "./Editor";
import { createEditor } from "slate";
import withLink from "../plugins/withLink";
import { withReact } from "slate-react";

function wrapInList(node: any) {
  return {
    type: "list",
    children: [node],
  };
}

function LinkNode({ data }: any) {
  const editor = useMemo(() => withLink(withReact(createEditor())), []);

  return (
    <div>
      <div className="mb-6">
        <Link to={{ pathname: `/page/${data.pageTitle}` }}>
          <h3 className="text-lg text-blue-500 hover:text-blue-800">
            {data.pageTitle}
          </h3>
        </Link>
        <Editor
          value={[wrapInList(data.listItemNode)]}
          editor={editor}
          readOnly
        />
      </div>
    </div>
  );
}

export default LinkNode;
