import { Transforms, Editor, Node, Path } from "slate";

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

const withRelation = (editor: any) => {
  const { isInline } = editor;

  editor.isInline = (element: any) => {
    return element.type === "relation" ? true : isInline(editor);
  };

  editor.isSelectionAtFirstChild = () => {
    const { path } = editor.selection.anchor;
    // console.log(path, path.length - 2);
    // console.log(!path[path.length - 1]);
    return !path[path.length - 2];
  };

  editor.initRelation = ({ id }: { id: string }) => {
    editor.deleteBackward({ unit: "character" });
    editor.insertNode({
      type: "relation",
      isInline: true,
      id,
      children: [
        {
          text: "[]]",
        },
      ],
    });
    Transforms.move(editor, { distance: 2, reverse: true });
  };

  editor.parentListItemFromSelection = () => {
    const { path } = editor.selection.anchor;
    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );

    return ancestors[1];
  };

  editor.insertBreak = () => {
    const [
      parentListItem,
      parentListItemPath,
    ] = editor.parentListItemFromSelection();

    const elementListTuple = Array.from(
      Node.children(editor, parentListItemPath)
    ).find(([element]) => element.type === "list");

    // insert a child if children
    if (!!elementListTuple) {
      const [elementList, elementListPath] = elementListTuple;
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
    const [
      parentListItem,
      parentListItemPath,
    ] = editor.parentListItemFromSelection();

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

  editor.unindentNode = () => {
    console.log("making list");
    const { path } = editor.selection.anchor;
    function unindent(path: any) {
      const newPath = [...path];
      newPath[newPath.length - 1] = newPath[newPath.length - 1] + 1;
      return newPath;
    }

    console.log(path);
    // Transforms.removeNodes(editor, {
    //   at: parentListItemPath,
    // });
    // Transforms.moveNodes(editor, {
    //   mode: "all",
    //   at: parentPath,
    //   to: unindent(grandParentPath),
    // });
    // Transforms.removeNodes(editor, { at: parentPath });
    // Transforms.wrapNodes(editor, { type: "list", children: [] });
    // Transforms.liftNodes(editor, { at: path });
  };

  editor.persistRelation = ({ id }: any) => {
    const [node, path] = Array.from(Node.elements(editor)).find((arr) => {
      return !!arr[0].id && arr[0].id === id;
    });
    editor.apply({
      type: "set_node",
      path,
      properties: node,
      newProperties: { url: "foo" },
    });
    // addLink({variables: {value: node.}})
  };

  editor.isWithinRelation = () => {
    const [match] = Editor.nodes(editor, {
      match: (n) => n.type === "relation",
    });

    return !!match;
  };

  return editor;
};

export default withRelation;
