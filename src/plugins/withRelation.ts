import { Transforms, Editor, Node } from "slate";

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

  editor.insertList = () => {
    console.log("making list");
    // Transforms.wrapNodes(editor, { type: "list-item", children: [] });
    Transforms.wrapNodes(editor, { type: "list", children: [] });
  };

  editor.unindentNode = () => {
    console.log("making list");
    const { path } = editor.selection.anchor;
    function unindent(path: any) {
      const newPath = [...path];
      newPath[newPath.length - 1] = newPath[newPath.length - 1] + 1;
      return newPath;
    }
    const ancestors = Array.from(
      Node.ancestors(editor, path, { reverse: true })
    );
    const [parent, parentPath] = ancestors[0];
    const [grandParent, grandParentPath] = ancestors[1];

    console.log(unindent(grandParentPath), grandParentPath);
    // Transforms.removeNodes(editor, {
    //   at: grandParentPath,
    // });
    Transforms.moveNodes(editor, {
      at: parentPath,
      to: unindent(grandParentPath),
    });
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
