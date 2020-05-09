import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import classnames from "classnames";
import { PageContext } from "../Page";

export default function (props: any) {
  const { element } = props;
  const { touchedLinkNodes } = useContext(PageContext);
  const touchedIds = touchedLinkNodes.map((node: any) => node.id);

  const history = useHistory();

  // it's possible for a link to be in process of creation, user refresh
  // we don't want to make those clickable
  if (touchedIds.includes(element.id) || element.isIncomplete) {
    return (
      <span className="relative">
        <span>{props.children}</span>
      </span>
    );
  }

  // TODO: readOnly something like this
  // const mungedChildren = { ...props.children };
  // const textNode = mungedChildren.props.node.children[0];
  // mungedChildren.props.node.children[0] = {
  //   text: textNode.text.slice(2, textNode.text.length - 2),
  // };

  return (
    <a
      onMouseDown={() =>
        history.push(`/page/${encodeURIComponent(element.value)}`)
      }
      className={classnames("cursor-pointer", {
        "text-gray-500": element.touched,
        "text-blue-500 hover:text-blue-800": !element.touched,
      })}
      {...props.attributes}
    >
      {props.children}
    </a>
  );
}
