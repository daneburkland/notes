import { Transforms, Editor } from "slate";

const withCodeBlockListItems = (editor: any) => {
  const { insertData } = editor;

  editor.insertData = (data: any) => {
    insertData(data);
  };
  editor.toggleCodeBlock = () => {
    const [match] = Editor.nodes(editor, {
      match: (n) => n.type === "codeBlock",
    });
    Transforms.setNodes(
      editor,
      { type: match ? "text-wrapper" : "codeBlock" },
      { match: (n) => Editor.isBlock(editor, n) }
    );
  };
  return editor;
};

export default withCodeBlockListItems;
