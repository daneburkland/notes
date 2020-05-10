import { Transforms, Editor, Node, NodeEntry, Text } from "slate";
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

const withLink = (editor: any) => {
  const { isInline } = editor;

  editor.isInline = (element: any) => {
    return element.type === "link" ? true : isInline(editor);
  };

  editor.closeBracket = () => {
    Transforms.insertText(editor, "]");
    Transforms.move(editor, { distance: 1, reverse: true });
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
