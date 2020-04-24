// Import React dependencies.
import React, { useMemo, useState, useEffect } from "react";
import { useMachine } from "@xstate/react";

import Leaf from "./Leaf";
import ListItem from "./ListItem";
import List from "./List";
import TextWrapper from "./TextWrapper";
import LinkElement from "./LinkElement";
import { createEditor, Node } from "slate";
import withLink from "../../plugins/withLink";
import pageMachine, { KEY_DOWN, CHANGE } from "../../machines/pageMachine";
// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

import { useMutation, useQuery } from "@apollo/react-hooks";
import UPSERT_LINKS from "../../mutations/upsertLinks";
import UPSERT_PAGE from "../../mutations/upsertPage";
import GET_PAGE from "../../queries/getPage";

interface ListItem {
  type: string;
  children: any;
}

interface IValue {
  type: string;
  children: ListItem[];
}

// Define a React component renderer for our code blocks.
const CodeElement = (props: any) => {
  return (
    <pre {...props.attributes}>
      <code>{props.children}</code>
    </pre>
  );
};

const renderElement = (props: any) => {
  switch (props.element.type) {
    case "list":
      return <List {...props} />;
    case "code":
      return <CodeElement {...props} />;
    case "link":
      return <LinkElement {...props} />;
    case "text-wrapper":
      return <TextWrapper {...props} />;
    case "list-item":
    default:
      return <ListItem {...props} />;
  }
};

const renderLeaf = (props: any) => <Leaf {...props} />;

function Page() {
  const editor = useMemo(() => withLink(withReact(createEditor())), []);
  const pageId = "cae40c62-1724-4f6c-b02f-1a3603b2600e";

  const [upsertLinks] = useMutation(UPSERT_LINKS);
  const [upsertPage] = useMutation(UPSERT_PAGE);
  const { data, loading } = useQuery(GET_PAGE, {
    variables: { id: pageId },
  });

  const [, send] = useMachine(pageMachine, {
    context: {
      editor,
      upsertLinks,
      upsertPage,
      pageId,
    },
  });

  const [value, setValue] = useState([
    { type: "text-wrapper", children: [{ text: "" }] } as Node,
  ]);
  useEffect(() => {
    if (!!data) {
      setValue([data.page_by_pk.node]);
    }
  }, [data]);

  return (
    <div className="container mx-auto my-10">
      {/* TODO: loading state */}
      {!loading && (
        <Slate
          editor={editor}
          value={value}
          onChange={(value) => {
            send({ type: CHANGE, value });
            console.log(value);
            setValue(value);
          }}
        >
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            onKeyDown={(event) => {
              if (["Tab", "Enter"].includes(event.key)) {
                event.preventDefault();
              }
              send({
                type: KEY_DOWN,
                key: event.key,
                shiftKey: event.shiftKey,
              });
            }}
          />
        </Slate>
      )}
    </div>
  );
}

export default Page;
