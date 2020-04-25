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

function isPathInitialNode(path: any) {
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

    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );

    return ancestors.find((ancestor) => ancestor[0].type === "list-item");
  };

  editor.childListItemEntriesFromPath = (path: any) => {
    console.log(path);
    if (!path) return;

    const children = Array.from(Node.children(editor, path)).filter(
      ([n]) => n.type === "list"
    );

    // const children = Array.from(
    //   Editor.nodes(editor, {
    //     at: path,
    //     mode: "lowest",
    //     match: (n) => n.type === "list-item",
    //   })
    // );

    return children;
  };

  editor.parentTextWrapperFromPath = (path: any) => {
    if (!path) return;

    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );

    return ancestors.find((ancestor) => ancestor[0].type === "text-wrapper");
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
    const [, parentListItemPath] = editor.parentListItemEntryFromPath(path);

    if (isPathInitialNode(parentListItemPath)) {
      return;
    }
    const parentListItemsPreviousSibling = Node.get(
      editor,
      previousSiblingPath(parentListItemPath)
    );

    // TODO: isn't it alwasy a list-item?
    if (parentListItemsPreviousSibling.type === "list-item") {
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
        //
        const targetListNode = Node.get(editor, targetListNodePath);
        Transforms.moveNodes(editor, {
          to: targetListNodePath.concat(targetListNode.children.length),
          at: parentListItemPath,
        });
      }
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
              id: uuid(),
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

  editor.serializeLinkEntry = ({
    linkEntry,
    pageId,
  }: {
    linkEntry: NodeEntry;
    pageId: string;
  }) => {
    const [node, path] = linkEntry;
    return {
      id: node.id,
      pageId,
      value: editor.getLinkValueFromNode(node),
      listItemNode: editor.parentListItemEntryFromPath(path)[0],
    };
  };

  editor.serializeLinkEntries = ({
    linkEntries,
    pageId,
  }: {
    linkEntries: NodeEntry[];
    previousLinkEntries: NodeEntry[];
    pageId: string;
  }) => {
    const serializedLinkEntries = linkEntries.map((linkEntry) =>
      editor.serializeLinkEntry({ linkEntry, pageId })
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
    const [parentListItemEntry, path] = editor.parentListItemEntryFromPath(
      selection.anchor.path
    );

    const listItemChildren = editor.childListItemEntriesFromPath(path);
    console.log("listItemChildren", listItemChildren);

    if (selection.anchor.offset === 0) {
      const listItemChildren = editor.childListItemEntriesFromPath(path);
      console.log("listItemChildren", listItemChildren);
      return !listItemChildren.length;
    }

    return true;
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

  return editor;
};

export default withLink;
