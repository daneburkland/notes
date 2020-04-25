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
import GET_PAGE_BY_ID from "../../queries/getPage";
import GET_PAGES_BY_DAY from "../../queries/getTodaysPage";

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

function Page({ match }: any) {
  const editor = useMemo(() => withLink(withReact(createEditor())), []);
  const { pageId } = match.params;

  const [upsertLinks] = useMutation(UPSERT_LINKS);
  const [upsertPage] = useMutation(UPSERT_PAGE);
  const getPageById = useLazyQuery(GET_PAGE_BY_ID);
  const getPagesByDay = useLazyQuery(GET_PAGES_BY_DAY);

  const [current, send] = useMachine(pageMachine, {
    context: {
      editor,
      upsertLinks,
      upsertPage,
      pageId,
      getPageById,
      getPagesByDay,
    },
  });

  useEffect(() => {
    send({ type: GET_PAGE });
  }, []);

  if (current.matches("loading")) {
    return <div>Loading</div>;
  }

  return (
    <div className="my-10">
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

export default Page;
