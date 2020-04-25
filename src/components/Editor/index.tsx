import React, { useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";

import Leaf from "./Leaf";
import ListItem from "./ListItem";
import List from "./List";
import TextWrapper from "./TextWrapper";
import LinkElement from "./LinkElement";
import { createEditor } from "slate";
import withLink, { placeholderNode } from "../../plugins/withLink";
import pageMachine, {
  KEY_DOWN,
  CHANGE,
  GET_PAGE,
} from "../../machines/pageMachine";
import { Slate, Editable, withReact } from "slate-react";

import { useMutation } from "@apollo/react-hooks";
import { useLazyQuery } from "../../index";
import UPSERT_LINKS from "../../mutations/upsertLinks";
import UPSERT_PAGE from "../../mutations/upsertPage";
import DELETE_LINKS from "../../mutations/deleteLinks";
import GET_PAGE_BY_ID from "../../queries/getPage";

interface ListItem {
  type: string;
  children: any;
}

const renderElement = (props: any) => {
  switch (props.element.type) {
    case "list":
      return <List {...props} />;
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

function Editor({ match }: any) {
  const editor = useMemo(() => withLink(withReact(createEditor())), []);
  const { pageId } = match.params;

  const [upsertLinks] = useMutation(UPSERT_LINKS);
  const [upsertPage] = useMutation(UPSERT_PAGE);
  const [deleteLinks] = useMutation(DELETE_LINKS);
  const getPageById = useLazyQuery(GET_PAGE_BY_ID);

  const [current, send] = useMachine(pageMachine, {
    context: {
      editor,
      upsertLinks,
      upsertPage,
      deleteLinks,
      pageId,
      getPageById,
      placeholderNode,
      canBackspace: true,
    },
  });

  useEffect(() => {
    send({ type: GET_PAGE });
  }, []);

  if (current.matches("loading")) {
    return <div>Loading</div>;
  }

  console.log(current.context.canBackspace);

  return (
    <div>
      <h1 className="text-5xl mb-6">{current.context.title}</h1>
      <Slate
        editor={editor}
        value={current.context.value}
        onChange={(value) => {
          send({ type: CHANGE, value });
        }}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={(event) => {
            if (["Tab", "Enter"].includes(event.key)) {
              event.preventDefault();
            }
            if (event.key === "Backspace" && !current.context.canBackspace) {
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
    </div>
  );
}

export default Editor;
