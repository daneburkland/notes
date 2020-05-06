import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import classnames from "classnames";
import { SELECT_LINK } from "../machines/page/events";

const Portal = ({ children }: { children: ReactElement }) => {
  return ReactDOM.createPortal(children, document.body);
};

function PagesTooltip({ send, current }: any) {
  const isEditingLink =
    current.matches({
      loaded: { editingLink: { editing: { data: "idle" } } },
    }) ||
    current.matches({
      loaded: { editingLink: { editing: { data: "loading" } } },
    });

  const hasMatches = !!current.context.filteredPages.length;
  return (
    <Portal>
      <div
        ref={current.context.PagesTooltipRef}
        className={classnames(
          { hidden: !isEditingLink || !hasMatches },
          "shadow-lg absolute bg-white border-gray-500 border overflow-y-auto"
        )}
        style={{ top: 0, width: 200, maxHeight: 200 }}
      >
        {current.context.filteredPages.map((node: any) => {
          return (
            <div
              key={node.title}
              className="cursor-pointer hover:bg-gray-300 py-1 px-5"
              onMouseDown={() => send({ type: SELECT_LINK, node })}
            >
              {node.title}
            </div>
          );
        })}
      </div>
    </Portal>
  );
}

export default PagesTooltip;
