import { Editor, NodeEntry, Node, Transforms } from "slate";

const hyperlinkMatch = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/g;

const withHyperlinks = (editor: Editor) => {
  const { isInline } = editor;

  editor.isInline = (element: any) => {
    return element.type === "hyperlink" ? true : isInline(editor);
  };

  editor.unwrapHyperlinks = ([, parentPath]: NodeEntry) => {
    try {
      for (const [, path] of Editor.nodes(editor, {
        at: parentPath,
        match: (n) => n.type === "hyperlink",
      })) {
        if (path.length - parentPath.length > 2) {
          return;
        }
        Transforms.unwrapNodes(editor, {
          at: path,
          mode: "highest",
        });
      }
    } catch (e) {
      console.log("nothing to unwrap");
    }
  };

  editor.wrapHyperlinks = (nodeEntry: NodeEntry) => {
    const [, parentPath] = nodeEntry;

    try {
      for (const [node, path] of Node.texts(editor, {
        from: parentPath,
        to: parentPath,
      })) {
        if (path.length - parentPath.length > 2) {
          return;
        }
        let match;
        let str = node.text;

        let matches = [];
        while ((match = hyperlinkMatch.exec(str)) !== null) {
          matches.push(match);
        }
        matches.reverse().forEach((match) => {
          Transforms.wrapNodes(
            editor,
            {
              type: "hyperlink",
              url: match[0],
              children: [],
            },
            {
              mode: "lowest",
              at: {
                anchor: { path, offset: match.index },
                focus: {
                  path,
                  offset: match.index + match[0].length,
                },
              },
              split: true,
            }
          );
        });
      }
    } catch (e) {
      console.log("no hyperlinks to wrap");
    }
  };

  return editor;
};

export default withHyperlinks;
