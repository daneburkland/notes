import React from "react";

import Leaf from "./Leaf";
import ListItem from "./ListItem";
import List from "./List";
import TextWrapper from "./TextWrapper";
import Link from "./Link";
import { Slate, Editable } from "slate-react";

interface ListItem {
  type: string;
  children: any;
}

const renderElement = (props: any) => {
  switch (props.element.type) {
    case "list":
      return <List {...props} />;
    case "link":
      return <Link {...props} />;
    case "text-wrapper":
      return <TextWrapper {...props} />;
    case "list-item":
    default:
      return <ListItem {...props} />;
  }
};

const renderLeaf = (props: any) => <Leaf {...props} />;

function Editor({
  value,
  onChange,
  onKeyDown,
  editor,
  readOnly,
  title,
  className,
}: any) {
  return (
    <div className={className}>
      <Slate editor={editor} value={value} onChange={onChange} key={title}>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
        />
      </Slate>
    </div>
  );
}

export default Editor;
