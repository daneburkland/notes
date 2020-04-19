// Import React dependencies.
import React, { useMemo, useState } from "react";
import { useMachine } from "@xstate/react";
// Import the Slate editor factory.
import { createEditor, Transforms, Editor, Text } from "slate";
import withRelation from "../plugins/withRelation";
import pageMachine, { KEY_DOWN, CHANGE } from "../machines/pageMachine";
// Import the Slate components and React plugin.
import { Slate, Editable, withReact } from "slate-react";

import gql from "graphql-tag";
import { useMutation } from "@apollo/react-hooks";

const ADD_RELATION = gql`
  mutation AddRelation($value: String!, $id: uuid!) {
    insert_link_one(object: { value: $value, id: $id }) {
      id
      value
    }
  }
`;

interface Children {
  text: string;
}

interface ListItem {
  type: string;
  children: Children[];
}

interface IValue {
  type: string;
  children: ListItem[];
}

const CustomEditor = {
  isBoldMarkActive(editor: any) {
    const [match] = Editor.nodes(editor, {
      match: (n) => n.bold === true,
      universal: true,
    });

    return !!match;
  },

  toggleBoldMark(editor: any) {
    const isActive = CustomEditor.isBoldMarkActive(editor);
    Transforms.setNodes(
      editor,
      { bold: isActive ? null : true },
      { match: (n) => Text.isText(n), split: true }
    );
  },
};

// Define a React component renderer for our code blocks.
const CodeElement = (props: any) => {
  return (
    <pre {...props.attributes}>
      <code>{props.children}</code>
    </pre>
  );
};

const List = (props: any) => {
  return (
    <ul className="list-disc pl-4" {...props.attributes}>
      {props.children}
    </ul>
  );
};

const ListItem = (props: any) => {
  return <li {...props.attributes}>{props.children}</li>;
};

const RelationElement = (props: any) => {
  return <span {...props.attributes}>{props.children}</span>;
};

const renderElement = (props: any) => {
  switch (props.element.type) {
    case "list":
      return <List {...props} />;
    case "code":
      return <CodeElement {...props} />;
    case "relation":
      return <RelationElement {...props} />;
    case "list-item":
    default:
      return <ListItem {...props} />;
  }
};

const renderLeaf = (props: any) => <Leaf {...props} />;

const Leaf = (props: any) => {
  return (
    <span
      {...props.attributes}
      style={{ fontWeight: props.leaf.bold ? "bold" : "normal" }}
    >
      {props.children}
    </span>
  );
};

function Page() {
  const editor = useMemo(() => withRelation(withReact(createEditor())), []);

  const [addLink, { data }] = useMutation(ADD_RELATION);

  const [state, send] = useMachine(pageMachine, {
    context: {
      editor,
      addLink,
    },
  });

  console.log(state.value);

  // TODO: move value into context
  const [value, setValue] = useState([
    {
      type: "list",
      children: [
        {
          type: "list-item",
          children: [{ text: "A line of text in a paragraph." }],
        },
      ],
    },
  ]);

  return (
    <div className="container mx-auto my-10">
      <Slate
        editor={editor}
        value={value}
        onChange={(value) => {
          console.log(value);
          send({ type: CHANGE, value });
          setValue(value as IValue[]);
        }}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={(event) => {
            if (["Tab"].includes(event.key)) {
              event.preventDefault();
            }
            send({ type: KEY_DOWN, key: event.key, shiftKey: event.shiftKey });
            if (event.key === "#") {
              CustomEditor.toggleBoldMark(editor);
            }
          }}
        />
      </Slate>
    </div>
  );
}

export default Page;
