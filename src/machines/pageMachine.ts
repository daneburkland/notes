import { Machine, assign, actions } from "xstate";
import { NodeEntry, Node } from "slate";
import { todayDateString, localTodayISO } from "../utils/datetime";
import { placeholderNode } from "../plugins/withLink";
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
  getOrCreatePage(variables: any): any;
  deleteLinks(linkIds: any): any;
  pageTitle: string;
  value: Node[];
  title: string;
  getPage(obj: any): Promise<any>;
  placeholderNode: Node;
  canBackspace: boolean;
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

function invokeFetchPage({ title, getPage }: IContext) {
  return getPage({ title: title || todayDateString() });
}

function setValue({ placeholderNode }: IContext, event: any) {
  if (!!event.data.data.page_by_pk) {
    return [event.data.data.page_by_pk.node];
  } else return [placeholderNode];
}

function setTitle({ title }: IContext, event: any) {
  if (!!event.data.data.page_by_pk) {
    return event.data.data.page_by_pk.title;
  } else return todayDateString();
}

function canBackspace({ editor }: IContext) {
  return editor.canBackspace();
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
            actions: [
              assign<IContext>({
                value: setValue,
                title: setTitle,
              }),
              "sync",
            ],
          },
          onError: "failed",
        },
      },
      loaded: {
        on: {
          [CHANGE]: {
            actions: [
              assign<IContext>({
                canBackspace,
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
            actions: ["syncTouchedListItem"],
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
      syncTouchedListItem: ({
        editor,
        deleteLinks,
        upsertLinks,
        title,
        getOrCreatePage,
      }: IContext) => {
        setTimeout(() => {
          const linkIds = editor.removeBrokenLinkNodeEntries();
          if (!!linkIds.length) {
            deleteLinks({ variables: { linkIds } });
          }
          const serializedLinkEntries = editor.serializeLinkEntries({
            pageTitle: title,
          });

          if (!!serializedLinkEntries.length) {
            upsertLinks({ variables: { links: serializedLinkEntries } });

            serializedLinkEntries.forEach((linkEntry: any) => {
              getOrCreatePage({
                variables: {
                  page: { title: linkEntry.value, node: placeholderNode },
                },
              });
            });
          }

          editor.syncListItemSelection();
        }, 1);
      },
      sync: ({ upsertPage, title, value }: IContext) => {
        upsertPage({
          variables: { page: { node: value[0], title } },
        });
      },
      backspace: ({ editor, canBackspace }: IContext) => {
        if (canBackspace) {
          editor.handleBackSpace();
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
