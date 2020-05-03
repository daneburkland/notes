import { Machine, assign, actions, sendParent } from "xstate";
import { Node, createEditor, Editor, Path, NodeEntry, Range } from "slate";
import withLink, { placeholderNode } from "../plugins/withLink";
import { withReact, ReactEditor } from "slate-react";
import { createRef } from "react";
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

export const CLOSE_BRACKET = "CLOSE_BRACKET";
export const KEY_DOWN = "KEY_DOWN";
export const CHANGE = "CHANGE";
export const SYNC = "SYNC";
export const BACKSPACE = "BACKSPACE";
export const UNINDENT_NODE = "UNINDENT_NODE";
export const SELECT_LINK = "SELECT_LINK";
export const INDENT_NODE = "INDENT_NODE";
export const INIT_LINK = "INIT_LINK";
export const LINK_CREATED = "LINK_CREATED";
export const LINK_UPDATED = "LINK_UPDATED";
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
  getLinksByValue(value: any): Promise<any>;
  value: Node[] | any[];
  title: string;
  placeholderNode: Node;
  canBackspace: boolean;
  links: NodeEntry[];
  prevLinks: NodeEntry[];
  filteredExistingLinks: any[];
  linkTooltipRef: any;
  linkValueAtSelection: string;
  activeLinkId: string | null;
}

export interface ISchema {
  states: {
    failed: {};
    loading: {};
    loaded: {
      states: {
        base: {};
        tooltip: {
          states: {
            hidden: {};
            visible: {
              states: {
                base: {};
                data: {
                  states: {
                    idle: {};
                    loading: {};
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}

export type IEvent =
  | { type: "KEY_DOWN"; key: string; shiftKey: boolean }
  // TODO: the value type should be generic
  | { type: "CHANGE"; value: any }
  | { type: "INDENT_NODE" }
  | { type: "BACKSPACE" }
  | { type: "SYNC" }
  | { type: "INSERT_BREAK" }
  | { type: "SELECT_LINK" }
  | { type: "LINK_UPDATED" }
  | { type: "SYNC_LIST_ITEM" }
  | { type: "SET_SELECTED_LIST_ITEM_NODE_LINK_CHILDREN" }
  | { type: "UNINDENT_NODE" }
  | { type: "INIT_LINK" }
  | { type: "LINK_CREATED" }
  | {
      type: "CLOSE_BRACKET";
    };

const getTriggerEvent = ({ editor }: IContext, { key, shiftKey }: any) => {
  switch (key) {
    case "Enter":
      return { type: INSERT_BREAK };
    case "Tab":
      if (shiftKey) {
        return { type: UNINDENT_NODE };
      } else return { type: INDENT_NODE };
    case "[":
      if (editor.willInitLink()) {
        return { type: INIT_LINK };
      } else {
        return { type: CLOSE_BRACKET };
      }
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
      page: { title, node: placeholderNode, isDaily: true },
    },
  });
}

function invokeFetchLinks({ getLinksByValue, linkValueAtSelection }: IContext) {
  return getLinksByValue({
    value: `%${linkValueAtSelection}%`,
  });
}

function setValue(_: IContext, event: any) {
  return [event.data.data.insert_page.returning[0].node];
}

function setTitle(_: IContext, event: any) {
  return event.data.data.insert_page.returning[0].title;
}

function setFilteredExistingLinks(_: IContext, event: any) {
  return event.data.data.link;
}

function canBackspace({ editor }: IContext) {
  return editor.canBackspace();
}

const createPageMachine = ({
  upsertLinks,
  upsertPage,
  deleteLinks,
  title,
  getOrCreatePage,
  getLinksByValue,
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
        getLinksByValue,
        canBackspace: true,
        selectedListItemPath: null,
        previousSelectedListItemPath: null,
        value: [],
        links: [],
        prevLinks: [],
        filteredExistingLinks: [],
        linkTooltipRef: createRef(),
        linkValueAtSelection: "",
        activeLinkId: "",
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
          type: "parallel",
          states: {
            base: {
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
                        const nodeEntry = editor.parentListItemFromPath(
                          editor.selection?.focus?.path
                        );
                        return !!nodeEntry && nodeEntry[1];
                      },
                    }),
                    send(checkSelectedListItem, {
                      delay: 100,
                      id: "checkSelectedListItem",
                    }),
                    cancel("syncTimeout"),
                    send(SYNC, {
                      delay: 2000,
                      id: "syncTimeout",
                    }),
                  ],
                },
                [SYNC]: {
                  actions: [
                    assign<IContext>({
                      prevLinks: ({ links }: IContext) => links,
                      links: ({ editor }: IContext) => editor.getLinks(),
                    }),
                    "sync",
                  ],
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
                [CLOSE_BRACKET]: {
                  actions: ["closeBracket"],
                },
                [INIT_LINK]: {
                  actions: ["closeBracket", "initLink", send(LINK_CREATED)],
                },
                [LINK_CREATED]: {
                  target: "tooltip.visible",
                },
              },
            },
            tooltip: {
              initial: "hidden",
              states: {
                hidden: {
                  id: "hidden",
                  on: {
                    [CHANGE]: {
                      target: "visible",
                      cond: { type: "isEditingLinkNode" },
                    },
                  },
                },
                visible: {
                  id: "visible",
                  type: "parallel",
                  states: {
                    base: {
                      entry: [
                        assign<IContext>({
                          activeLinkId: ({ editor }: IContext) =>
                            editor.getActiveLinkId(),
                        }),
                        "positionTooltip",
                      ],
                      exit: [
                        assign<IContext>({
                          activeLinkId: null,
                        }),
                      ],
                      on: {
                        [CHANGE]: [
                          {
                            target: "#hidden",
                            cond: { type: "isNotEditingLinkNode" },
                          },
                          {
                            target: "base",
                            cond: { type: "isEditingNewLinkNode" },
                          },
                        ],
                        [SELECT_LINK]: {
                          actions: ["setSelectedLinkValue", send(LINK_UPDATED)],
                        },
                        [LINK_UPDATED]: {
                          target: "#hidden",
                        },
                      },
                    },
                    data: {
                      initial: "loading",
                      states: {
                        idle: {
                          on: {
                            [CHANGE]: {
                              target: "loading",
                              actions: [
                                assign<IContext>({
                                  linkValueAtSelection: ({
                                    editor,
                                  }: IContext) => {
                                    if (editor.selection) {
                                      const node = Node.get(
                                        editor,
                                        editor.selection.anchor.path
                                      );

                                      if (!node.text) return null;

                                      return editor.stripBrackets(node.text);
                                    }
                                    return "";
                                  },
                                }),
                                sendParent(CHANGE),
                              ],
                            },
                          },
                        },
                        loading: {
                          invoke: {
                            id: "fetch-links",
                            src: invokeFetchLinks,
                            onDone: {
                              target: "idle",
                              actions: [
                                assign<IContext>({
                                  filteredExistingLinks: setFilteredExistingLinks,
                                }),
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      guards: {
        isEditingLinkNode: ({ editor }: IContext) => {
          const parentNodeAtSelection = editor.getParentNodeAtSelection();
          if (!parentNodeAtSelection) return false;
          return parentNodeAtSelection.type === "link";
        },
        isNotEditingLinkNode: ({ editor }: IContext) => {
          const parentNodeAtSelection = editor.getParentNodeAtSelection();
          if (!parentNodeAtSelection) return true;
          return parentNodeAtSelection.type !== "link";
        },
        isEditingNewLinkNode: ({ editor, activeLinkId }: IContext) => {
          const parent = editor.getParentNodeAtSelection();
          return parent.id !== activeLinkId;
        },
      },
      actions: {
        positionTooltip: ({ linkTooltipRef, editor }: IContext) => {
          console.log("poritions");
          const { selection } = editor;
          if (selection && Range.isCollapsed(selection)) {
            setTimeout(() => {
              const [start] = Range.edges(selection);
              const wordBefore = Editor.before(editor, start, { unit: "word" });
              const before = wordBefore && Editor.before(editor, wordBefore);
              const beforeRange = before && Editor.range(editor, before, start);

              if (!beforeRange) return;
              const domRange = ReactEditor.toDOMRange(
                editor as ReactEditor,
                beforeRange as Range
              );
              const rect = domRange.getBoundingClientRect();
              if (linkTooltipRef?.current) {
                linkTooltipRef.current.style.top = `${
                  rect.top + window.pageYOffset + 24
                }px`;
                linkTooltipRef.current.style.left = `${
                  rect.left + window.pageXOffset
                }px`;
              }
            }, 0);
          }
        },
        syncTouchedListItem: ({
          editor,
          upsertLinks,
          title,
          getOrCreatePage,
        }: IContext) => {
          setTimeout(() => {
            editor.removeBrokenLinkNodeEntries();
            editor.syncLinkNodeValues();

            const serializedLinkEntries = editor.serializeTouchedLinkEntries({
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
        sync: ({
          upsertPage,
          title,
          value,
          prevLinks,
          links,
          deleteLinks,
        }: IContext) => {
          const prevLinkIds = prevLinks.map(([node]: NodeEntry) => node.id);
          const linkIds = links.map(([node]: NodeEntry) => node.id);

          const destroyedLinkIds = prevLinkIds.filter(
            (id) => !linkIds.includes(id)
          );

          if (!!destroyedLinkIds.length) {
            deleteLinks({ variables: { linkIds: destroyedLinkIds } });
            // TODO: .then(delete pages where count of link#value (page.title) is 0 and page isEmpty)
          }

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
        closeBracket: ({ editor }: IContext) => {
          editor.closeBracket();
        },
        initLink: ({ editor }: IContext) => {
          editor.initLink();
        },
        setSelectedLinkValue: ({ editor }: IContext, event: any) => {
          editor.setLinkValue({ value: event.node.value });
        },
      },
    }
  );

export default createPageMachine;
