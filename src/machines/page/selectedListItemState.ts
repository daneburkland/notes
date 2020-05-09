import { assign, actions } from "xstate";
import { CHANGE } from "./events";
const { send } = actions;
const UPDATE = "update";

const selectedListItemState = {
  on: {
    [CHANGE]: {
      actions: [
        assign({
          prevSelectedListItem: ({ selectedListItem }) => selectedListItem,
          selectedListItem: ({ editor }) =>
            editor.parentListItemEntryAtSelection()[0],
        }),
        send(UPDATE),
      ],
    },
    [UPDATE]: {
      actions: ["unwrapHyperlinks", "wrapHyperlinks"],
      cond: { type: "isSelectionAtNewListItem" },
    },
  },
};
export default selectedListItemState;
