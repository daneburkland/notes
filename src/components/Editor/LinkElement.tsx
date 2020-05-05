import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import classnames from "classnames";
import { PageContext } from "../Page";

export default function (props: any) {
  const { element } = props;
  const { touchedLinkNodes } = useContext(PageContext);
  const touchedIds = touchedLinkNodes.map((node: any) => node.id);

  const history = useHistory();

  if (touchedIds.includes(element.id)) {
    return (
      <span className="relative">
        <span>{props.children}</span>
      </span>
    );
  }

  return (
    <a
      onMouseDown={() => history.push(`/page/${element.value}`)}
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
