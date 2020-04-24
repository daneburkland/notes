import { Machine, assign, actions } from "xstate";
import { NodeEntry, Node, Text, Editor } from "slate";
const { send, cancel } = actions;

function arraysEqual(a: any, b: any) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const INIT_LINK = "INIT_LINK";
export const KEY_DOWN = "KEY_DOWN";
export const CHANGE = "CHANGE";
export const SYNC = "SYNC";
export const BACKSPACE = "BACKSPACE";
export const UNINDENT_NODE = "UNINDENT_NODE";
export const INDENT_NODE = "INDENT_NODE";
export const INSERT_BREAK = "INSERT_BREAK";
export const SYNC_LIST_ITEM = "SYNC_LIST_ITEM";
export const SET_SELECTED_LIST_ITEM_NODE_LINK_CHILDREN =
  "SET_SELECTED_LIST_ITEM_NODE_LINK_CHILDREN";
export const GO_TO_SELECTION_NOT_AT_FIRST_CHILD =
  "GO_TO_SELECTION_NOT_AT_FIRST_CHILD";
export const GO_TO_SELECTION_AT_FIRST_CHILD = "GO_TO_SELECTION_AT_FIRST_CHILD";

interface IContext {
  prevKeyDownKey: string;
  keyDownKey: string;
  editor: any;
  addLink: any;
  selectedListItemPath: any;
  previousSelectedListItemPath: any;
  selectedListItemNode: any;
  linkEntries: NodeEntry[];
  previousLinkEntries: NodeEntry[];
  upsertLinks(links: any): any;
  upsertPage(page: any): any;
  pageId: string;
  value: Node;
}

interface ISchema {
  states: {
    idle: {};
  };
}

type IEvent =
  | { type: "KEY_DOWN"; key: string; shiftKey: boolean }
  // TODO: the value type should be generic
  | { type: "CHANGE"; value: any }
  | { type: "INDENT_NODE" }
  | { type: "BACKSPACE" }
  | { type: "CHANGE" }
  | { type: "SYNC" }
  | { type: "INSERT_BREAK" }
  | { type: "SYNC_LIST_ITEM" }
  | { type: "SET_SELECTED_LIST_ITEM_NODE_LINK_CHILDREN" }
  | { type: "UNINDENT_NODE" }
  | {
      type: "INIT_LINK";
    };

const getTriggerEvent = (
  { prevKeyDownKey }: IContext,
  { key, shiftKey }: any
) => {
  switch (key) {
    case "Enter":
      return { type: INSERT_BREAK };
    case "Tab":
      if (shiftKey) {
        return { type: UNINDENT_NODE };
      } else return { type: INDENT_NODE };
    case "[":
      return { type: INIT_LINK };
    case "Backspace":
      return { type: BACKSPACE };
    // if (prevKeyDownKey === "[") {
    //   console.log("initting");
    //   return { type: INIT_LINK };
    // } else return { type: "" };
    default:
      // TODO: better way to bail?
      return { type: "" };
  }
};

const checkSelectedListItem = ({
  selectedListItemPath,
  previousSelectedListItemPath,
}: IContext) => {
  if (!arraysEqual(selectedListItemPath, previousSelectedListItemPath)) {
    return { type: SYNC_LIST_ITEM };
  } else return { type: "" };
};

const pageMachine = Machine<IContext, ISchema, IEvent>(
  {
    id: "page",
    initial: "idle",
    states: {
      idle: {
        on: {
          [CHANGE]: {
            actions: [
              assign<IContext>({
                value: (_: IContext, { value }: any) => value,
                previousSelectedListItemPath: ({
                  selectedListItemPath,
                }: IContext) => selectedListItemPath,
                selectedListItemPath: ({ editor }: IContext) => {
                  const tuple = editor.parentListItemEntryFromPath(
                    editor.selection?.focus?.path
                  );
                  return !!tuple && tuple[1];
                },
                previousLinkEntries: ({ linkEntries }: IContext) => linkEntries,
                linkEntries: ({ editor }: IContext) => editor.getLinkEntries(),
              }),
              send(checkSelectedListItem),
              cancel("syncTimeout"),
              send(SYNC, {
                delay: 2000,
                id: "syncTimeout",
              }),
            ],
          },
          [SYNC]: {
            actions: ["sync"],
          },
          [SYNC_LIST_ITEM]: {
            actions: ["syncListItem"],
          },
          [BACKSPACE]: {
            actions: ["backspace"],
          },
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
          [INIT_LINK]: {
            actions: ["initLink"],
          },
        },
      },
    },
  },
  {
    guards: {},
    actions: {
      syncListItem: ({ editor }: IContext) => {
        console.log("syncing listItem", editor.selection.anchor.path);
        setTimeout(() => {
          editor.syncListItemSelection();
        }, 1);
      },
      sync: ({
        editor,
        linkEntries,
        previousLinkEntries,
        upsertLinks,
        upsertPage,
        pageId,
        value,
      }: IContext) => {
        const serializedLinkEntries = editor.serializeLinkEntries({
          linkEntries,
          previousLinkEntries,
          pageId,
        });

        // upsertPage({ variables: { page: { node: value[0], id: pageId } } });

        // if (!!serializedLinkEntries.length) {
        //   upsertLinks({ variables: { links: serializedLinkEntries } });
        // }
      },
      backspace: ({ editor }: IContext) => {
        const selection = editor.selection;

        // if selection, nothing to do
        if (selection.anchor.offset !== selection.focus.offset) return;

        const [node] = Array.from(
          Editor.nodes(editor, {
            at: selection.focus,
            match: Text.isText,
          })
        )[0];

        const charToDelete = node.text[selection.focus.offset - 1];
        const charAfterCursor = node.text[selection.focus.offset];
        if (charToDelete === "[" && charAfterCursor === "]") {
          editor.deleteForward({ unit: "character" });
        }
      },
      unindentNode: ({ editor }: IContext) => {
        editor.unindentNode();
      },
      indentNode: ({ editor }: IContext) => {
        editor.indentNode();
      },
      insertBreak: ({ editor }: IContext) => {
        editor.insertBreak();
      },
      initLink: ({ editor }: IContext) => {
        editor.initLink();
      },
      // persistLink: ({
      //   editor,
      //   addLink,
      // }: IContext) => {
      //   const [node, path] = Array.from(Node.elements(editor)).find((arr) => {
      //     return !!arr[0].id && arr[0].id === id;
      //   });
      //   editor.apply({
      //     type: "set_node",
      //     path,
      //     properties: node,
      //     newProperties: { url: "foo" },
      //   });
      //   const casted = node as Node;
      //   const value = casted.children[0].text.replace(/\W/g, "");

      //   addLink({ variables: { value, id } });
      // },
    },
  }
);

export default pageMachine;
