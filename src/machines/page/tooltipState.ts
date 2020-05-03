import { assign, sendParent, actions } from "xstate";
import { IContext } from ".";
import { CHANGE, SELECT_LINK, LINK_UPDATED } from "./events";
import { Node } from "slate";

const { send } = actions;

function invokeFetchLinks({ getLinksByValue, linkValueAtSelection }: IContext) {
  return getLinksByValue({
    value: `%${linkValueAtSelection}%`,
  });
}

function setFilteredExistingLinks(_: IContext, event: any) {
  return event.data.data.link;
}

const tooltipState = {
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
              activeLinkId: ({ editor }: IContext) => editor.getActiveLinkId(),
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
};
export default tooltipState;
