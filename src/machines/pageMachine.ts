import { Machine, assign, actions } from "xstate";
import { Node } from "slate";
import { v4 as uuid } from "uuid";
const { send } = actions;

export const INIT_RELATION = "INIT_RELATION";
export const KEY_DOWN = "KEY_DOWN";
export const CHANGE = "CHANGE";
export const UNINDENT_NODE = "UNINDENT_NODE";
export const INSERT_LIST = "INSERT_LIST";
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
    selectionAtFirstChild: {};
    addingRelation: {};
    selectionNotAtFirstChild: {};
  };
}

type IEvent =
  | { type: "KEY_DOWN"; key: string; shiftKey: boolean }
  // TODO: the value type should be generic
  | { type: "CHANGE"; value: any }
  | { type: "INSERT_LIST" }
  | { type: "UNINDENT_NODE" }
  | { type: "GO_TO_SELECTION_NOT_AT_FIRST_CHILD" }
  | { type: "GO_TO_SELECTION_AT_FIRST_CHILD" }
  | {
      type: "INIT_RELATION";
    };

const getTriggerEvent = (
  { prevKeyDownKey, editor }: IContext,
  { key, shiftKey }: any
) => {
  // if (editor.selectionAtFirstChild()) {
  //   return { type: GO_TO_SELECTION_NOT_AT_FIRST_CHILD };
  // }
  switch (key) {
    case "Tab":
      if (shiftKey) {
        return { type: UNINDENT_NODE };
      } else return { type: "" };
    case "[":
      if (prevKeyDownKey === "[") {
        return { type: INIT_RELATION };
      } else return { type: "" };
    default:
      // TODO: better way to bail?
      return { type: "" };
  }
};

const getNonInitialTriggerEvent = (
  { editor, prevKeyDownKey }: IContext,
  { key, shiftKey }: any
) => {
  // if (!editor.selectionAtFirstChild()) {
  //   return { type: GO_TO_SELECTION_AT_FIRST_CHILD };
  // }
  switch (key) {
    case "Tab":
      if (shiftKey) {
        return { type: UNINDENT_NODE };
      } else return { type: INSERT_LIST };
    case "[":
      if (prevKeyDownKey === "[") {
        return { type: INIT_RELATION };
      } else return { type: "" };
    default:
      // TODO: better way to bail?
      return { type: "" };
  }
};

const getAtFirstChildChangeEvent = ({ editor }: IContext) => {
  if (!editor.isSelectionAtFirstChild()) {
    return { type: GO_TO_SELECTION_NOT_AT_FIRST_CHILD };
  } else return { type: "" };
};

const getNotAtFirstChildChangeEvent = ({ editor }: IContext) => {
  if (editor.isSelectionAtFirstChild()) {
    return { type: GO_TO_SELECTION_AT_FIRST_CHILD };
  } else return { type: "" };
};

const pageMachine = Machine<IContext, ISchema, IEvent>(
  {
    id: "page",
    initial: "selectionAtFirstChild",
    states: {
      selectionAtFirstChild: {
        on: {
          [UNINDENT_NODE]: {
            actions: ["unindentNode"],
          },
          [CHANGE]: {
            actions: [send(getAtFirstChildChangeEvent)],
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
          [GO_TO_SELECTION_NOT_AT_FIRST_CHILD]: {
            target: "selectionNotAtFirstChild",
          },
        },
      },
      addingRelation: {
        exit: ["persistRelation"],
        on: {
          [KEY_DOWN]: {
            target: "selectionAtFirstChild",
            cond: { type: "hasFinishedCreatingRelation" },
          },
        },
      },
      selectionNotAtFirstChild: {
        on: {
          [CHANGE]: {
            actions: [send(getNotAtFirstChildChangeEvent)],
          },
          [UNINDENT_NODE]: {
            actions: ["unindentNode"],
          },
          [KEY_DOWN]: {
            actions: [
              assign<IContext>({
                prevKeyDownKey: ({ keyDownKey }: IContext) => keyDownKey,
              }),
              assign<IContext>({
                keyDownKey: (_: IContext, { key }: any) => key,
              }),
              send(getNonInitialTriggerEvent),
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
          [GO_TO_SELECTION_AT_FIRST_CHILD]: {
            target: "selectionAtFirstChild",
          },
          [INSERT_LIST]: {
            target: "selectionAtFirstChild",
            actions: ["insertList"],
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
      insertList: ({ editor }: IContext) => {
        editor.insertList();
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
