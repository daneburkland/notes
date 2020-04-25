import { Machine, assign, actions } from "xstate";
import { NodeEntry, Node, Text, Editor } from "slate";
import today from "../utils/today";
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
export const GET_PAGE = "GET_PAGE";
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
  value: any;
  getPageById(obj: any): Promise<any>;
  getPagesByDay(obj: any): Promise<any>;
  foo: any;
}

interface ISchema {
  states: {
    loading: {};
    loaded: {};
    failed: {};
  };
}

type IEvent =
  | { type: "KEY_DOWN"; key: string; shiftKey: boolean }
  // TODO: the value type should be generic
  | { type: "CHANGE"; value: any }
  | { type: "INDENT_NODE" }
  | { type: "BACKSPACE" }
  | { type: "GET_PAGE" }
  | { type: "CHANGE" }
  | { type: "SYNC" }
  | { type: "INSERT_BREAK" }
  | { type: "SYNC_LIST_ITEM" }
  | { type: "SET_SELECTED_LIST_ITEM_NODE_LINK_CHILDREN" }
  | { type: "UNINDENT_NODE" }
  | {
      type: "INIT_LINK";
    };

const getTriggerEvent = (_: IContext, { key, shiftKey }: any) => {
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

function invokeFetchPage({ pageId, getPageById, getPagesByDay }: IContext) {
  if (!!pageId) {
    return getPageById({ id: pageId });
  } else {
    return getPagesByDay({ date: today });
  }
}

function setValue({ pageId }: IContext, event: any) {
  if (!!pageId) {
    return [event.data.data.page_by_pk.node];
  } else return [event.data.data.page[0].node];
}

const pageMachine = Machine<IContext, ISchema, IEvent>(
  {
    id: "page",
    initial: "loading",
    states: {
      failed: {},
      loading: {
        invoke: {
          id: "fetch-page",
          src: invokeFetchPage,
          onDone: {
            target: "loaded",
            actions: assign<IContext>({
              value: setValue,
            }),
          },
          onError: "failed",
        },
      },
      loaded: {
        on: {
          [CHANGE]: {
            actions: [
              assign<IContext>({
                value: (_: IContext, { value }: any) => value,
                previousSelectedListItemPath: ({
                  selectedListItemPath,
                }: IContext) => selectedListItemPath,
                selectedListItemPath: ({ editor }: IContext) => {
                  const nodeEntry = editor.parentListItemEntryFromPath(
                    editor.selection?.focus?.path
                  );
                  return !!nodeEntry && nodeEntry[1];
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
          [GET_PAGE]: {
            actions: ["getPage"],
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
            actions: [send(getTriggerEvent)],
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

        upsertPage({ variables: { page: { node: value[0], id: pageId } } });

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
    },
  }
);

export default pageMachine;
