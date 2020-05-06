import { Machine, assign, actions, StateNodeConfig } from "xstate";
import { Node, createEditor, Editor, Path, NodeEntry, Range } from "slate";
import withLink, { placeholderNode } from "../../plugins/withLink";
import { withReact, ReactEditor } from "slate-react";
import { createRef } from "react";
import pageSyncState from "./syncState";
import loadingState from "./loadingState";
import editingLinkState from "./editingLinkState";

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
} from "./events";

const { send } = actions;

export interface IContext {
  editor: Editor;
  upsertLinks(links: any): any;
  upsertPage(page: any): any;
  title: string;
  value: Node[] | any[];
  deleteLinks(linkIds: any): any;
  getOrCreatePage(variables: any): Promise<any>;
  getLinksByValue(value: any): Promise<any>;
  getPagesByTitle(value: any): Promise<any>;
  placeholderNode: Node;
  canBackspace: boolean;
  links: NodeEntry[];
  prevLinks: NodeEntry[];
  filteredPages: any[];
  PagesTooltipRef: any;
  linkValueAtSelection: string;
  activeLinkId: string | null;
  errorMessage: string;
  touchedLinkNodes: Node[];
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
        editingLink: {
          states: {
            notEditing: {};
            upsertingLinks: {};
            creatingNewPagesFromLinks: {};
            settingLinkNodeValues: {};
            syncing: {};
            editing: {
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
  getPagesByTitle,
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
        getPagesByTitle,
        canBackspace: true,
        value: [],
        prevLinks: [],
        links: [],
        filteredPages: [],
        PagesTooltipRef: createRef(),
        linkValueAtSelection: "",
        activeLinkId: "",
        errorMessage: "",
        touchedLinkNodes: [],
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
                    }),
                  ],
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
              },
            },
            editingLink: {
              ...(editingLinkState as StateNodeConfig<IContext, any, IEvent>),
              initial: "notEditing",
            },
          },
        },
      },
    },
    {
      guards: {
        isEditingLinkNode: ({ editor }: IContext) => {
          return !!editor.touchedLinkNodes().length;
        },
        isNotEditingLinkNode: ({ editor }: IContext) => {
          return !editor.touchedLinkNodes().length;
        },
        isEditingNewLinkNode: ({ editor, activeLinkId }: IContext) => {
          const parent = editor.getParentNodeAtSelection();
          return parent.id !== activeLinkId;
        },
      },
      actions: {
        positionTooltip: ({ PagesTooltipRef, editor }: IContext) => {
          const { selection } = editor;
          if (selection && Range.isCollapsed(selection)) {
            setTimeout(() => {
              const [start] = Range.edges(selection);
              console.log(start);
              const wordBefore =
                start && Editor.before(editor, start, { unit: "word" });
              const before = wordBefore && Editor.before(editor, wordBefore);
              let beforeRange = before && Editor.range(editor, before, start);

              const domRange = ReactEditor.toDOMRange(
                editor as ReactEditor,
                beforeRange || (editor.selection as Range)
              );
              const rect = domRange.getBoundingClientRect();
              if (PagesTooltipRef?.current) {
                PagesTooltipRef.current.style.top = `${
                  rect.top + window.pageYOffset + 24
                }px`;
                PagesTooltipRef.current.style.left = `${
                  rect.left + window.pageXOffset
                }px`;
              }
            }, 0);
          }
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
          editor.setLinkValue({ value: event.node.title });
        },
        // TODO: seems like these can be called in the tootlip state
        removeBrokenLinkNodeEntries: ({
          editor,
          touchedLinkNodes,
        }: IContext) => {
          setTimeout(() => {
            editor.removeBrokenLinkNodeEntries({ touchedLinkNodes });
          }, 0);
        },
        setLinkNodeValues: ({ editor }: IContext) => {
          setTimeout(() => {
            editor.setLinkNodeValues();
          }, 0);
        },
      },
    }
  );

export default createPageMachine;
