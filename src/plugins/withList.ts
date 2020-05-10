import { Node, Editor, Transforms } from "slate";
import {
  nextSiblingPath,
  isFirstChild,
  getPreviousSiblingPath,
} from "./withHelpers";

const withList = (editor: any) => {
  editor.parentListItemFromPath = (path: any) => {
    if (!path) return;

    try {
      const ancestors = Array.from(
        Node.ancestors(editor, path, { reverse: true })
      );

      return ancestors.find((ancestor) => ancestor[0].type === "list-item");
    } catch (e) {
      console.log(`Couldn't find parent list item entry`);
      return null;
    }
  };

  editor.parentListItemEntryAtSelection = () => {
    if (!editor.selection) return null;
    const { selection } = editor;
    const parentListItemEntry = Array.from(
      Editor.nodes(editor, {
        at: selection,
        match: (n) => n.type === "list-item",
        mode: "lowest",
      })
    );

    return parentListItemEntry;
  };

  editor.parentRootListItemFromPath = (path: any) => {
    if (!path) return;

    try {
      const ancestors = Array.from(Node.ancestors(editor, path));

      return ancestors.find((ancestor) => ancestor[0].type === "list-item");
    } catch (e) {
      console.log(`Couldn't find parent list item entry`);
      return null;
    }
  };

  editor.childListItemEntriesFromPath = (path: any) => {
    if (!path) return;

    const children = Array.from(Node.children(editor, path)).filter(
      ([n]) => n.type === "list"
    );

    return children;
  };

  editor.grandParentListFromSelection = () => {
    const { path } = editor.selection.anchor;
    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );

    return ancestors.find((ancestor) => ancestor[0].type === "list");
  };

  editor.greatGrandParentListItemFromSelection = () => {
    const { path } = editor.selection.anchor;
    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );

    return ancestors.filter(([{ type }]) => type === "list-item")[1];
  };

  editor.insertBreak = () => {
    const { path } = editor.selection.anchor;
    const [, parentListItemPath] = editor.parentListItemFromPath(path);

    const elementListTuple = Array.from(
      Node.children(editor, parentListItemPath)
    ).find(([element]) => element.type === "list");

    // insert a child if children
    if (!!elementListTuple) {
      const [, elementListPath] = elementListTuple;
      const destination = elementListPath.concat(0);
      Transforms.insertNodes(
        editor,
        {
          type: "list-item",
          children: [{ type: "text-wrapper", children: [] }],
        },
        { at: destination }
      );

      Transforms.setSelection(editor, {
        anchor: { path: destination, offset: 0 },
        focus: { path: destination, offset: 0 },
      });
    } else {
      // insert a sibling if no children
      const destination = nextSiblingPath(parentListItemPath);
      Transforms.insertNodes(
        editor,
        {
          type: "list-item",
          children: [{ type: "text-wrapper", children: [] }],
        },
        { at: destination }
      );

      Transforms.setSelection(editor, {
        anchor: { path: destination, offset: 0 },
        focus: { path: destination, offset: 0 },
      });
    }
  };

  editor.indentNode = () => {
    const { path } = editor.selection.anchor;

    const parentListItemNodeEntry = editor.parentListItemFromPath(path);

    if (!parentListItemNodeEntry || isFirstChild(parentListItemNodeEntry)) {
      return;
    }
    const [, parentListItemPath] = parentListItemNodeEntry;

    const parentListItemsPreviousSibling = Node.get(
      editor,
      getPreviousSiblingPath(parentListItemPath)
    );

    const previousSiblingPath = getPreviousSiblingPath(parentListItemPath);
    const hasListChild = !!parentListItemsPreviousSibling.children.find(
      (child: Node) => child.type === "list"
    );

    // If it's just a text-wrapper (no list)
    if (!hasListChild) {
      const targetListNodePath = previousSiblingPath.concat(
        parentListItemsPreviousSibling.children.length
      );
      Transforms.insertNodes(
        editor,
        {
          type: "list",
          children: [],
        },
        { at: targetListNodePath }
      );

      Transforms.moveNodes(editor, {
        to: targetListNodePath.concat(0),
        at: parentListItemPath,
      });
    } else {
      const previousSiblingExistingListPath = previousSiblingPath.concat(
        parentListItemsPreviousSibling.children.length - 1
      );
      const targetListNode = Node.get(editor, previousSiblingExistingListPath);
      Transforms.moveNodes(editor, {
        to: previousSiblingExistingListPath.concat(
          targetListNode.children.length
        ),
        at: parentListItemPath,
      });
    }
  };

  editor.moveSubsequentListItemSiblingsIntoGrandParentList = () => {
    const { path } = editor.selection.anchor;
    const [parentListItem, parentListItemPath] = editor.parentListItemFromPath(
      path
    );
    const [grandparentList] = editor.grandParentListFromSelection();
    const parentLineItemPositionInList = grandparentList.children.indexOf(
      parentListItem
    );

    const targetListPath = parentListItemPath.concat(
      parentListItem.children.length
    );

    const parentListItemChildList = parentListItem.children.find(
      (child: Node) => child.type === "list"
    );
    const hasListChild = !!parentListItemChildList;

    // If the list-item isn't the last in it's list and therefore has siblings to move
    if (grandparentList.children.length - 1 > parentLineItemPositionInList) {
      // If the list-item doesn't already have a list beneath it, create one
      if (!hasListChild) {
        Transforms.insertNodes(
          editor,
          { type: "list", children: [] },
          { at: targetListPath }
        );
      }

      const targetListExistingItemCount =
        parentListItemChildList?.children.length || 0;

      let i;
      for (
        i = parentLineItemPositionInList + 1;
        i < grandparentList.children.length;
        i++
      ) {
        let originPath = nextSiblingPath(parentListItemPath);

        Transforms.moveNodes(editor, {
          at: originPath,
          to: targetListPath.concat(
            i - parentLineItemPositionInList - 1 + targetListExistingItemCount
          ),
        });
      }
    }
  };

  editor.unindentNode = () => {
    // Bail if grandParentList is root
    if (editor.grandParentListFromSelection()[1].length === 1) {
      return;
    }

    editor.moveSubsequentListItemSiblingsIntoGrandParentList();

    const { path } = editor.selection.anchor;
    const [, parentListItemPath] = editor.parentListItemFromPath(path);
    const [, grandParentListPath] = editor.grandParentListFromSelection();
    const [
      ,
      greatGrandParentListItemPath,
    ] = editor.greatGrandParentListItemFromSelection();

    Transforms.moveNodes(editor, {
      at: parentListItemPath,
      to: nextSiblingPath(greatGrandParentListItemPath),
    });

    const previousGrandParentList = Node.get(editor, grandParentListPath);
    if (!previousGrandParentList.children[0].type) {
      Transforms.removeNodes(editor, { at: grandParentListPath });
    }
  };

  editor.canBackspace = () => {
    const selection = editor.selection;
    if (!selection) return;
    const parentListItemFromPath = editor.parentListItemFromPath(
      selection.anchor.path
    );
    if (!parentListItemFromPath) return true;
    const [, path] = parentListItemFromPath;

    if (selection.anchor.offset === 0 && selection.focus.offset === 0) {
      const listItemChildren = editor.childListItemEntriesFromPath(path);
      const hasListItemChildren = !!listItemChildren.length;

      return !hasListItemChildren;
    }

    return true;
  };

  return editor;
};

export default withList;
