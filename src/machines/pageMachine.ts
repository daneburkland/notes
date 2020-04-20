import { Machine, assign, actions } from "xstate";
import { Node } from "slate";
import { v4 as uuid } from "uuid";
const { send } = actions;

export const INIT_RELATION = "INIT_RELATION";
export const KEY_DOWN = "KEY_DOWN";
export const CHANGE = "CHANGE";
export const UNINDENT_NODE = "UNINDENT_NODE";
export const INDENT_NODE = "INDENT_NODE";
export const INSERT_BREAK = "INSERT_BREAK";
export const GO_TO_SELECTION_NOT_AT_FIRST_CHILD =
  "GO_TO_SELECTION_NOT_AT_FIRST_CHILD";
export const GO_TO_SELECTION_AT_FIRST_CHILD = "GO_TO_SELECTION_AT_FIRST_CHILD";

interface IContext {
  unpersistedRelationUuid: any;
  prevKeyDownKey: string;
  keyDownKey: string;
  editor: any;
  addLink: any;
}

interface ISchema {
  states: {
    idle: {};
    addingRelation: {};
  };
}

type IEvent =
  | { type: "KEY_DOWN"; key: string; shiftKey: boolean }
  // TODO: the value type should be generic
  | { type: "CHANGE"; value: any }
  | { type: "INDENT_NODE" }
  | { type: "INSERT_BREAK" }
  | { type: "UNINDENT_NODE" }
  | {
      type: "INIT_RELATION";
    };

const getTriggerEvent = (
  { prevKeyDownKey, editor }: IContext,
  { key, shiftKey }: any
) => {
  // if (editor.selectionAtFirstChild()) {
  //   return { type: GO_TO_SELECTION_NOT_AT_FIRST_CHILD };
  //
  switch (key) {
    case "Enter":
      return { type: INSERT_BREAK };
    case "Tab":
      if (shiftKey) {
        return { type: UNINDENT_NODE };
      } else return { type: INDENT_NODE };
    case "[":
      if (prevKeyDownKey === "[") {
        return { type: INIT_RELATION };
      } else return { type: "" };
    default:
      // TODO: better way to bail?
      return { type: "" };
  }
};

const pageMachine = Machine<IContext, ISchema, IEvent>(
  {
    id: "page",
    initial: "idle",
    states: {
      idle: {
        on: {
          [UNINDENT_NODE]: {
            actions: ["unindentNode"],
          },
          [INDENT_NODE]: {
            actions: ["indentNode"],
          },
          [INSERT_BREAK]: {
            actions: ["insertBreak"],
          },
          [KEY_DOWN]: {
            actions: [
              assign<IContext>({
                prevKeyDownKey: ({ keyDownKey }: IContext) => keyDownKey,
              }),
              assign<IContext>({
                keyDownKey: (_: IContext, { key }: any) => key,
              }),
              send(getTriggerEvent),
            ],
          },
          [INIT_RELATION]: {
            target: "addingRelation",
            actions: [
              assign<IContext>({
                unpersistedRelationUuid: uuid(),
              }),
              "initRelation",
            ],
          },
        },
      },
      addingRelation: {
        exit: ["persistRelation"],
        on: {
          [KEY_DOWN]: {
            target: "idle",
            cond: { type: "hasFinishedCreatingRelation" },
          },
        },
      },
    },
  },
  {
    guards: {
      hasFinishedCreatingRelation: ({ editor }: IContext) => {
        return !editor.isWithinRelation();
      },
      selectionAtFirstChild: ({ editor }: IContext) => {
        return editor.isSelectionAtFirstChild();
      },
    },
    actions: {
      unindentNode: ({ editor }: IContext) => {
        editor.unindentNode();
      },
      indentNode: ({ editor }: IContext) => {
        editor.indentNode();
      },
      insertBreak: ({ editor }: IContext) => {
        console.log("handler");
        editor.insertBreak();
      },
      initRelation: ({ editor, unpersistedRelationUuid }: IContext) => {
        editor.initRelation({ id: unpersistedRelationUuid });
      },
      persistRelation: ({
        editor,
        unpersistedRelationUuid: id,
        addLink,
      }: IContext) => {
        const [node, path] = Array.from(Node.elements(editor)).find((arr) => {
          return !!arr[0].id && arr[0].id === id;
        });
        editor.apply({
          type: "set_node",
          path,
          properties: node,
          newProperties: { url: "foo" },
        });
        const casted = node as Node;
        const value = casted.children[0].text.replace(/\W/g, "");

        addLink({ variables: { value, id } });
      },
    },
  }
);

export default pageMachine;
