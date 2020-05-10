import { Transforms, Editor, Node, NodeEntry, Text, Path } from "slate";
import { v4 as uuid } from "uuid";

export const placeholderNode = {
  type: "list",
  children: [
    {
      type: "list-item",
      children: [
        {
          type: "text-wrapper",
          children: [
            {
              text: "Enter some text...",
            },
          ],
        },
      ],
    },
  ],
};

function getPreviousSiblingPath(path: any) {
  return [...path.slice(0, path.length - 1), path[path.length - 1] - 1];
}

function nextSiblingPath(path: any) {
  return [...path.slice(0, path.length - 1), path[path.length - 1] + 1];
}

function isFirstChild([, path]: NodeEntry) {
  return !path[path.length - 1];
}

const withLink = (editor: any) => {
  const { isInline } = editor;

  editor.isInline = (element: any) => {
    return element.type === "link" ? true : isInline(editor);
  };

  editor.closeBracket = () => {
    Transforms.insertText(editor, "]");
    Transforms.move(editor, { distance: 1, reverse: true });
  };

  editor.getParentNodeAtSelection = () => {
    if (!editor.selection) return null;
    const { path } = editor.selection.anchor;
    const parentNode = Node.get(editor, path.slice(0, path.length - 1));
    return parentNode;
  };

  editor.getParentNode = (path: Path) => {
    if (!path) return null;
    const parentNode = Node.get(editor, path.slice(0, path.length - 1));
    return parentNode;
  };

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

  editor.isLinkNodeEntryBroken = ([node]: NodeEntry) => {
    const linkText = node.children[0].text;
    return (
      !(linkText.slice(0, 2) === "[[") ||
      !(linkText.slice(linkText.length - 2, linkText.length) === "]]")
    );
  };

  editor.getLinkValueFromNodeEntry = ([node]: NodeEntry) => {
    const linkText = node.children[0].text;
    return linkText.substring(2, linkText.length - 2);
  };

  editor.getLinkNodesToDestroy = () => {
    return editor
      .getLinkNodeEntries()
      .filter((nodeEntry: NodeEntry) =>
        editor.isLinkNodeEntryBroken(nodeEntry)
      );
  };

  editor.getLinkNodeEntries = ({ matchFn }: any = {}) => {
    const defaultMatch = (n: Node) => n.type === "link";
    const match = matchFn || defaultMatch;
    return Array.from(
      Editor.nodes(editor, {
        at: [0],
        match,
      })
    );
  };

  editor.removeBrokenLinkNodeEntries = () => {
    const linkNodeEntriesToDestroy = editor.getLinkNodesToDestroy();

    // TODO: this can prob be .unwrapNodes
    linkNodeEntriesToDestroy.forEach(([node, path]: NodeEntry) => {
      Transforms.insertNodes(editor, node.children[0], {
        at: path,
      });

      Transforms.removeNodes(editor, {
        at: path,
      });
    });
  };

  editor.initLink = () => {
    editor.deleteForward({ unit: "character" });
    editor.deleteBackward({ unit: "character" });
    editor.deleteForward({ unit: "character" });

    Transforms.insertNodes(editor, {
      type: "link",
      isInline: true,
      isIncomplete: true,
      id: uuid(),
      value: "",
      children: [{ text: "[]]" }],
    });
    Transforms.move(editor, { distance: 2, unit: "character", reverse: true });
  };

  editor.setLinkNodeValues = () => {
    const linkEntries = editor.getLinkNodeEntries();

    linkEntries.forEach((nodeEntry: NodeEntry) => {
      const value = editor.getLinkValueFromNodeEntry(nodeEntry);
      Transforms.setNodes(
        editor,
        // links need to have at least one character
        { value, isIncomplete: !value.trim().length },
        {
          at: nodeEntry[1],
          match: ({ type }: Node) => type === "link",
        }
      );
    });
  };

  editor.getLinkValueFromNode = (node: Node) => {
    const linkWithBrackets = node.children[0].text;
    return linkWithBrackets.substring(2, linkWithBrackets.length - 2);
  };

  editor.stripBrackets = (text: string) => {
    return text.substring(2, text.length - 2);
  };

  editor.serializeLinkEntry = ({
    linkEntry,
    pageTitle,
  }: {
    linkEntry: NodeEntry;
    pageTitle: string;
  }) => {
    const [node, path] = linkEntry;
    return {
      id: node.id,
      value: node.value,
      pageTitle,
      listItemNode: editor.parentRootListItemFromPath(path)[0],
    };
  };

  editor.serializeLinks = ({
    pageTitle,
    matchFn,
  }: {
    linkEntries: NodeEntry[];
    previousLinkEntries: NodeEntry[];
    pageTitle: string;
    matchFn: any;
  }) => {
    const serializedLinkEntries = editor
      .getLinkNodeEntries({ matchFn })
      .map((linkEntry: NodeEntry) =>
        editor.serializeLinkEntry({ linkEntry, pageTitle })
      )
      .filter((linkNode: Node) => {
        return !linkNode.isIncomplete;
      });
    return serializedLinkEntries;
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

  editor.willInitLink = () => {
    const selection = editor.selection;

    // if selection, won't init link
    if (selection.anchor.offset !== selection.focus.offset) return false;

    const [node] = Array.from(
      Editor.nodes(editor, {
        at: selection.focus,
        match: Text.isText,
      })
    )[0];

    const prevCharacter = node.text[selection.focus.offset - 1];
    return prevCharacter === "[";
  };

  editor.handleBackSpace = () => {
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
  };

  editor.getActiveLinkId = () => {
    const parentNodeAtSelection = editor.getParentNodeAtSelection();
    if (!parentNodeAtSelection || parentNodeAtSelection.type !== "link") {
      return null;
    }
    return parentNodeAtSelection.id;
  };

  editor.setLinkValue = ({ value }: any) => {
    const { selection } = editor;
    const ancestors = Array.from(
      Node.ancestors(editor, selection.anchor.path, { reverse: true })
    );
    const [node, path] = ancestors.find(
      (ancestor) => ancestor[0].type === "link"
    ) as NodeEntry;

    Transforms.removeNodes(editor, {
      match: ({ type }) => type === "link",
    });
    Transforms.insertNodes(
      editor,
      {
        ...node,
        children: [{ text: `[[${value}]]` }],
      },
      {
        at: path,
      }
    );
  };

  editor.touchedLinkNodes = () => {
    const { selection } = editor;
    if (!selection) return false;

    const before = Editor.before(editor, selection.anchor);
    const beforeParentNode = before && editor.getParentNode(before.path);
    const parentNode = editor.getParentNodeAtSelection();

    return [beforeParentNode, parentNode].filter(
      (node) => !!node && node.type === "link"
    );
  };

  return editor;
};

export default withLink;
