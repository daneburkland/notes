import { Transforms, Editor, Node, NodeEntry, Path } from "slate";
import { v4 as uuid } from "uuid";

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
    // editor.deleteBackward({ unit: "character" });
    Transforms.insertText(editor, "]");
    // editor.insertNode({
    //   type: "link",
    //   isInline: true,
    //   id: uuid(),
    //   children: [
    //     {
    //       text: "[]]",
    //     },
    //   ],
    // });
    Transforms.move(editor, { distance: 1, reverse: true });
  };

  editor.parentListItemEntryFromPath = (path: any) => {
    if (!path) return;

    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );

    return ancestors.find((ancestor) => ancestor[0].type === "list-item");
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

  editor.persistLink = ({ id }: any) => {
    const [node, path] = Array.from(Node.elements(editor)).find((arr) => {
      return !!arr[0].id && arr[0].id === id;
    });
    editor.apply({
      type: "set_node",
      path,
      properties: node,
      newProperties: { url: "foo" },
    });
  };

  editor.isWithinLink = () => {
    const [match] = Editor.nodes(editor, {
      match: (n) => n.type === "link",
    });

    return !!match;
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
  };

  editor.createNewLinkNodeEntries = () => {
    const touchedTextWrapperEntries = editor.getTouchedTextWrapperEntries();

    touchedTextWrapperEntries.forEach(([node, path]: NodeEntry) => {
      node.children.forEach((child: Node, i: number) => {
        if (child.type) return;

        const matches = [] as any[];
        let match;
        let reg = /\[\[(.*?)\]\]/g;
        console.log(child, "child", i);
        while ((match = reg.exec(child.text))) {
          matches.push(match);
        }

        matches.reverse().forEach((match) => {
          console.log("splitting", match[0], path);
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
    editor.removeBrokenLinkNodeEntries();
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
    previousLinkEntries,
    pageId,
  }: {
    linkEntries: NodeEntry[];
    previousLinkEntries: NodeEntry[];
    pageId: string;
  }) => {
    // const linkEntriesToDestroy = editor.getLinkNodesToDestroy({
    //   linkEntries,
    //   previousLinkEntries,
    // });
    const serializedLinkEntries = linkEntries.map((linkEntry) =>
      editor.serializeLinkEntry({ linkEntry, pageId })
    );
    return serializedLinkEntries;
  };

  return editor;
};

export default withLink;
