import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import classnames from "classnames";
import { SELECT_LINK } from "../machines/page/events";

const Portal = ({ children }: { children: ReactElement }) => {
  return ReactDOM.createPortal(children, document.body);
};

function LinkTooltip({ send, current }: any) {
  const isEditingLink =
    current.matches({
      loaded: { tooltip: { visible: { data: "idle" } } },
    }) ||
    current.matches({ loaded: { tooltip: { visible: { data: "loading" } } } });

  const hasMatches = !!current.context.filteredExistingLinks.length;
  return (
    <Portal>
      <div
        ref={current.context.linkTooltipRef}
        className={classnames(
          { hidden: !isEditingLink || !hasMatches },
          "shadow-lg absolute bg-white border-gray-500 border overflow-y-auto"
        )}
        style={{ top: 0, width: 200, maxHeight: 200 }}
      >
        {current.context.filteredExistingLinks.map((node: any) => {
          return (
            <div
              key={node.id}
              className="cursor-pointer hover:bg-gray-300 py-1 px-5"
              onMouseDown={() => send({ type: SELECT_LINK, node })}
            >
              {node.value}
            </div>
          );
        })}
      </div>
    </Portal>
  );
}

export default LinkTooltip;
