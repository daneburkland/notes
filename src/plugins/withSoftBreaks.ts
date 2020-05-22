import { Transforms } from "slate";

const withSoftBreaks = (editor: any) => {
  editor.insertSoftBreak = () => {
    Transforms.insertText(editor, "\n");
  };
  return editor;
};

export default withSoftBreaks;
