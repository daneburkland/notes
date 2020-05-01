import { Machine, assign, actions } from "xstate";
import { Node, createEditor, Editor, Path } from "slate";
import withLink, { placeholderNode } from "../plugins/withLink";
import { withReact } from "slate-react";
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

export interface IContext {
  editor: Editor;
  selectedListItemPath: Path | null;
  previousSelectedListItemPath: Path | null;
  upsertLinks(links: any): any;
  upsertPage(page: any): any;
  getOrCreatePage(variables: any): Promise<any>;
  deleteLinks(linkIds: any): any;
  value: Node[] | any[];
  title: string;
  placeholderNode: Node;
  canBackspace: boolean;
}

export interface ISchema {
  states: {
    loading: {};
    loaded: {};
    failed: {};
  };
}

export type IEvent =
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

function invokeFetchPage({ title, getOrCreatePage }: IContext) {
  return getOrCreatePage({
    variables: {
      page: { title, node: placeholderNode },
    },
  });
}

function setValue(_: IContext, event: any) {
  return [event.data.data.insert_page.returning[0].node];
}

function setTitle(_: IContext, event: any) {
  return event.data.data.insert_page.returning[0].title;
}

function canBackspace({ editor }: IContext, event: any) {
  return editor.canBackspace();
}

const createPageMachine = ({
  upsertLinks,
  upsertPage,
  deleteLinks,
  title,
  getOrCreatePage,
}: any) =>
  Machine<IContext, ISchema, IEvent>(
    {
      id: `page-${title}`,
      initial: "loading",
      context: {
        editor: withLink(withReact(createEditor())),
        upsertLinks,
        upsertPage,
        deleteLinks,
        title,
        getOrCreatePage,
        placeholderNode,
        canBackspace: true,
        selectedListItemPath: null,
        previousSelectedListItemPath: null,
        value: [],
      },
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

            editor.createNewLinkNodeEntries();
            const serializedLinkEntries = editor.serializeLinkEntries({
              pageTitle: title,
            });
            console.log("serialized link entries", serializedLinkEntries);

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

export default createPageMachine;
