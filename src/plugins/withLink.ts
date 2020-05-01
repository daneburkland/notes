import { Transforms, Editor, Node, NodeEntry, Path, Text } from "slate";
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

function previousSiblingPath(path: any) {
  const previousSiblingPath = [...path];
  previousSiblingPath[path.length - 1]--;
  return previousSiblingPath;
}

function nextSiblingPath(path: any) {
  const nextSiblingPath = [...path];
  nextSiblingPath[path.length - 1]++;
  return nextSiblingPath;
}

function isNodeEntryFirstChild([, path]: NodeEntry) {
  return !path[path.length - 1];
}

const withLink = (editor: any) => {
  const { isInline } = editor;

  editor.isInline = (element: any) => {
    return element.type === "link" ? true : isInline(editor);
  };

  editor.initLink = () => {
    Transforms.insertText(editor, "]");
    Transforms.move(editor, { distance: 1, reverse: true });
  };

  editor.parentListItemEntryFromPath = (path: any) => {
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

  editor.childListItemEntriesFromPath = (path: any) => {
    if (!path) return;

    const children = Array.from(Node.children(editor, path)).filter(
      ([n]) => n.type === "list"
    );

    return children;
  };

  editor.parentTextWrapperFromPath = (path: any) => {
    if (!path) return;

    try {
      const ancestors = Array.from(
        Node.ancestors(editor, path, { reverse: true })
      );

      return ancestors.find((ancestor) => ancestor[0].type === "text-wrapper");
    } catch (e) {
      console.log(`Couldn't find parent text-wrapper`);
    }
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
    const [, parentListItemPath] = editor.parentListItemEntryFromPath(path);

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

    const parentListItemNodeEntry = editor.parentListItemEntryFromPath(path);

    if (isNodeEntryFirstChild(parentListItemNodeEntry)) {
      return;
    }
    const [, parentListItemPath] = parentListItemNodeEntry;

    const parentListItemsPreviousSibling = Node.get(
      editor,
      previousSiblingPath(parentListItemPath)
    );

    const targetListNodePath = previousSiblingPath(parentListItemPath).concat(
      1
    );
    // If it's just a text-wrapper (no list)
    if (parentListItemsPreviousSibling.children.length === 1) {
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

      // the sibling has two children: a text-wrapper and a list, we need to move
      // the grandparent into this list
    } else {
      const targetListNode = Node.get(editor, targetListNodePath);
      Transforms.moveNodes(editor, {
        to: targetListNodePath.concat(targetListNode.children.length),
        at: parentListItemPath,
      });
    }
  };

  editor.moveSubsequentListItemSiblingsIntoGrandParentList = () => {
    const { path } = editor.selection.anchor;
    const [
      parentListItem,
      parentListItemPath,
    ] = editor.parentListItemEntryFromPath(path);
    const [grandparentList] = editor.grandParentListFromSelection();
    const parentLineItemPositionInList = grandparentList.children.indexOf(
      parentListItem
    );

    const targetListPath = parentListItemPath.concat(1);

    // If the list-item isn't the last in it's list
    if (grandparentList.children.length - 1 > parentLineItemPositionInList) {
      // if the list-item doesn't already have a list beneath it
      if (parentListItem.children.length === 1) {
        Transforms.insertNodes(
          editor,
          { type: "list", children: [] },
          { at: targetListPath }
        );
      }

      const targetListExistingItemCount =
        parentListItem.children[1]?.children.length || 0;

      let i;
      for (
        i = parentLineItemPositionInList + 1;
        i < grandparentList.children.length;
        i++
      ) {
        let originPath = [
          ...parentListItemPath.slice(0, parentListItemPath.length - 1),
          parentListItemPath[parentListItemPath.length - 1] + 1,
        ];
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
    const [, parentListItemPath] = editor.parentListItemEntryFromPath(path);
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
      .getTouchedLinkEntries()
      .filter((nodeEntry: NodeEntry) =>
        editor.isLinkNodeEntryBroken(nodeEntry)
      );
  };

  editor.getTouchedLinkEntries = () => {
    return Array.from(
      Editor.nodes(editor, {
        at: [0],
        match: (n) => n.type === "link" && n.touched,
      })
    );
  };

  editor.getTouchedListItemEntries = () => {
    return Array.from(
      Editor.nodes(editor, {
        at: [0],
        match: (n) => n.type === "list-item" && n.touched,
      })
    );
  };

  editor.getTouchedTextWrapperEntries = () => {
    return Array.from(
      Editor.nodes(editor, {
        at: [0],
        match: (n) => n.type === "text-wrapper" && n.touched,
      })
    );
  };

  editor.removeBrokenLinkNodeEntries = () => {
    const linkNodeEntriesToDestroy = editor.getLinkNodesToDestroy();

    linkNodeEntriesToDestroy.forEach(([node, path]: NodeEntry) => {
      Transforms.insertNodes(editor, node.children[0], {
        at: path,
      });

      Transforms.removeNodes(editor, {
        at: path,
      });
    });

    return linkNodeEntriesToDestroy.map(([node]: NodeEntry) => node.id);
  };

  editor.createNewLinkNodeEntries = () => {
    const touchedTextWrapperEntries = editor.getTouchedTextWrapperEntries();

    touchedTextWrapperEntries.forEach(([node, path]: NodeEntry) => {
      node.children.forEach((child: Node, i: number) => {
        if (child.type) return;

        const matches = [] as any[];
        let match;
        let reg = /\[\[(.*?)\]\]/g;
        while ((match = reg.exec(child.text))) {
          matches.push(match);
        }

        matches.reverse().forEach((match) => {
          Transforms.delete(editor, {
            at: {
              anchor: { path: path.concat(i), offset: match.index },
              focus: {
                path: path.concat(i),
                offset: match.index + match[0].length,
              },
            },
          });

          Transforms.insertNodes(
            editor,
            {
              type: "link",
              isInline: true,
              touched: true,
              id: uuid(),
              value: editor.stripBrackets(match[0]),
              children: [{ text: match[0] }],
            },
            {
              at: {
                path: path.concat(i),
                offset: match.index,
              },
            }
          );
        });
      });
    });
  };

  editor.syncListItemSelection = () => {
    editor.createNewLinkNodeEntries();

    Transforms.unsetNodes(editor, "touched", {
      at: [0],
      match: ({ type }) => type === "link",
      mode: "all",
    });

    Transforms.unsetNodes(editor, "touched", {
      at: [0],
      match: ({ type }) => type === "text-wrapper",
      mode: "all",
    });

    if (editor.selection) {
      const { path } = editor.selection.anchor;
      const parentListItemNodeEntry = editor.parentTextWrapperFromPath(path);
      const parentTextWrapperPathNodeEntry = editor.parentTextWrapperFromPath(
        path
      );

      if (parentListItemNodeEntry) {
        const [, parentListItemPath] = parentListItemNodeEntry;
        Transforms.setNodes(
          editor,
          { isSelected: true, touched: true },
          {
            match: (n) => n.type === "link",
            at: parentListItemPath,
          }
        );
      }

      if (parentTextWrapperPathNodeEntry) {
        const [, parentTextWrapperPath] = parentTextWrapperPathNodeEntry;
        Transforms.setNodes(
          editor,
          { touched: true },
          {
            match: (n) => n.type === "text-wrapper",
            at: parentTextWrapperPath,
            mode: "highest",
          }
        );
      }
    }
  };

  editor.getLinkEntries = (path: Path) => {
    return Array.from(
      Editor.nodes(editor, {
        at: path || [0],
        match: (n) => n.type === "link",
      })
    );
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
      listItemNode: editor.parentListItemEntryFromPath(path)[0],
    };
  };

  editor.serializeLinkEntries = ({
    pageTitle,
  }: {
    linkEntries: NodeEntry[];
    previousLinkEntries: NodeEntry[];
    pageTitle: string;
  }) => {
    const serializedLinkEntries = editor
      .getTouchedLinkEntries()
      .map((linkEntry: NodeEntry) =>
        editor.serializeLinkEntry({ linkEntry, pageTitle })
      );
    return serializedLinkEntries;
  };

  editor.isListItemNodeEntryEmpty = ([, path]: NodeEntry) => {
    const hasText = !!Array.from(Node.texts(editor, { from: path })).filter(
      ([{ text }]) => !!text
    ).length;

    return !hasText;
  };

  editor.doesListItemNodeEntryHaveListItemChildren = ([, path]: NodeEntry) => {
    const hasText = !!Array.from(Node.texts(editor, { from: path })).filter(
      ([{ text }]) => !!text
    ).length;

    return !hasText;
  };

  editor.canBackspace = () => {
    const selection = editor.selection;
    if (!selection) return;
    const parentListItemEntryFromPath = editor.parentListItemEntryFromPath(
      selection.anchor.path
    );
    if (!parentListItemEntryFromPath) return true;
    const [, path] = parentListItemEntryFromPath;

    if (selection.anchor.offset === 0 && selection.focus.offset === 0) {
      const listItemChildren = editor.childListItemEntriesFromPath(path);
      const hasListItemChildren = !!listItemChildren.length;
      // const isParentListItemFirstChild = isNodeEntryFirstChild(
      //   parentListItemEntryFromPath
      // );

      return !hasListItemChildren;
      // this should be: can backspace unless it has children and it's the first child
      // return !hasListItemChildren || !isParentListItemFirstChild;
    }

    return true;
  };

  editor.handleBackSpace = () => {
    const selection = editor.selection;

    if (selection.anchor.offset === 0 && selection.focus.offset === 0) {
      // Transforms.mergeNodes(editor);
    }

    // TODO: this needs to move a deleted list item's children after the end of it's previous
    // sibling's children...can I use Transforms.mergeNodes?

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

  return editor;
};

export default withLink;
