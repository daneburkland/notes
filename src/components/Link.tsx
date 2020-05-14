import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import Editor from "./Editor";
import { createEditor } from "slate";
import withLink from "../plugins/withLinks";
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
    <div className="mb-1">
      <Link to={{ pathname: `/page/${data.pageTitle}` }}>
        <h3 className="text-lg">{data.pageTitle}</h3>
      </Link>
      <Editor
        className="text-sm"
        value={[wrapInList(data.listItemNode)]}
        editor={editor}
        readOnly
      />
    </div>
  );
}

export default LinkNode;
