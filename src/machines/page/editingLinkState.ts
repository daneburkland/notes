import { assign, sendParent } from "xstate";
import { IContext } from ".";
import { CHANGE, SELECT_LINK, LINK_UPDATED } from "./events";
import { Node } from "slate";
import { placeholderNode } from "../../plugins/withLinks";

function invokeFetchPages({ getPagesByTitle, linkValueAtSelection }: IContext) {
  return getPagesByTitle({
    title: `%${linkValueAtSelection}%`,
  });
}

function setFilteredPages(_: IContext, event: any) {
  return event.data.data.page;
}

function getOrCreatePages({
  editor,
  title,
  getOrCreatePage,
  touchedLinkNodes,
}: IContext) {
  const touchedLinkIds = touchedLinkNodes.map((node) => node.id);
  const matchFn = (n: Node) =>
    n.type === "link" && touchedLinkIds.includes(n.id);
  const serializedLinkEntries = editor.serializeLinks({
    pageTitle: title,
    matchFn,
  });

  if (!!serializedLinkEntries.length) {
    return Promise.all(
      serializedLinkEntries.map((linkEntry: any) => {
        return getOrCreatePage({
          variables: {
            page: { title: linkEntry.value, node: placeholderNode },
          },
        });
      })
    );
  } else return Promise.resolve();
}

function upsertLinks({
  upsertLinks,
  touchedLinkNodes,
  editor,
  title,
}: IContext) {
  const touchedLinkIds = touchedLinkNodes.map((node) => node.id);
  const matchFn = (n: Node) =>
    n.type === "link" && touchedLinkIds.includes(n.id);
  const serializedLinkEntries = editor.serializeLinks({
    pageTitle: title,
    matchFn,
  });

  if (!!serializedLinkEntries.length) {
    return upsertLinks({
      variables: { links: serializedLinkEntries },
    });
  } else return Promise.resolve();
}

async function setLinkNodeValues({ editor }: IContext) {
  return new Promise((done) =>
    setTimeout(() => {
      editor.setLinkNodeValues();
      done();
    }, 0)
  );
}

const editingLinkState = {
  initial: "notEditing",
  states: {
    notEditing: {
      id: "notEditing",
      entry: [
        assign({
          touchedLinkNodes: [],
        }),
      ],
      on: {
        [CHANGE]: {
          target: "editing",
          cond: { type: "isEditingLinkNode" },
        },
      },
    },
    upsertingLinks: {
      id: "upsertingLinks",
      invoke: {
        src: upsertLinks,
        onDone: { target: "notEditing" },
      },
    },
    creatingNewPagesFromLinks: {
      id: "creatingNewPagesFromLinks",
      invoke: {
        src: getOrCreatePages,
        onDone: {
          target: "upsertingLinks",
        },
      },
    },
    settingLinkNodeValues: {
      id: "settingLinkNodeValues",
      invoke: {
        src: setLinkNodeValues,
        onDone: {
          target: "creatingNewPagesFromLinks",
        },
      },
    },
    editing: {
      id: "editing",
      type: "parallel",
      states: {
        base: {
          entry: [
            assign<IContext>({
              activeLinkId: ({ editor }: IContext) => editor.getActiveLinkId(),
              touchedLinkNodes: ({ editor }: IContext) =>
                editor.touchedLinkNodes(),
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
                target: "#settingLinkNodeValues",
                cond: { type: "isNotEditingLinkNode" },
                actions: ["removeBrokenLinkNodeEntries"],
              },
              {
                target: "base",
                cond: { type: "isEditingNewLinkNode" },
                actions: ["removeBrokenLinkNodeEntries"],
              },
            ],
            [SELECT_LINK]: {
              actions: ["setSelectedLinkValue"],
              after: {
                1: { target: "#upsertingLinks" },
              },
            },
            [LINK_UPDATED]: {
              target: "#creatingNewPagesFromLinks",
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
                      linkValueAtSelection: ({ editor }: IContext) => {
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
                src: invokeFetchPages,
                onDone: {
                  target: "idle",
                  actions: [
                    assign<IContext>({
                      filteredPages: setFilteredPages,
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
};
export default editingLinkState;
