import { Node, NodeEntry, Path } from "slate";

export function getPreviousSiblingPath(path: any) {
  return [...path.slice(0, path.length - 1), path[path.length - 1] - 1];
}

export function nextSiblingPath(path: any) {
  return [...path.slice(0, path.length - 1), path[path.length - 1] + 1];
}

export function isFirstChild([, path]: NodeEntry) {
  return !path[path.length - 1];
}

const withHelpers = (editor: any) => {
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

  return editor;
};

export default withHelpers;
