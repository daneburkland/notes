import { Machine, assign, actions, StateNodeConfig } from "xstate";
import { Node, createEditor, Editor, Path, NodeEntry, Range } from "slate";
import withLink, { placeholderNode } from "../../plugins/withLink";
import { withReact, ReactEditor } from "slate-react";
import { createRef } from "react";
import pageSyncState from "./syncState";
import loadingState from "./loadingState";
import tooltipState from "./tooltipState";

import {
  CLOSE_BRACKET,
  KEY_DOWN,
  CHANGE,
  BACKSPACE,
  UNINDENT_NODE,
  INDENT_NODE,
  INIT_LINK,
  LINK_CREATED,
  INSERT_BREAK,
  SYNC_LIST_ITEM,
} from "./events";

const { send } = actions;

function arraysEqual(a: any, b: any) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface IContext {
  editor: Editor;
  selectedListItemPath: Path | null;
  previousSelectedListItemPath: Path | null;
  upsertLinks(links: any): any;
  upsertPage(page: any): any;
  title: string;
  value: Node[] | any[];
  deleteLinks(linkIds: any): any;
  getOrCreatePage(variables: any): Promise<any>;
  getLinksByValue(value: any): Promise<any>;
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
        sync: {
          states: {
            unsynced: {};
            synced: {};
            syncing: {};
          };
        };
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
        prevLinks: [],
        links: [],
        filteredExistingLinks: [],
        linkTooltipRef: createRef(),
        linkValueAtSelection: "",
        activeLinkId: "",
      },
      states: {
        failed: {},
        loading: {
          ...loadingState,
        },
        loaded: {
          type: "parallel",
          states: {
            sync: {
              ...(pageSyncState as StateNodeConfig<IContext, any, IEvent>),
              initial: "synced",
            },
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
              ...(tooltipState as StateNodeConfig<IContext, any, IEvent>),
              initial: "hidden",
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
