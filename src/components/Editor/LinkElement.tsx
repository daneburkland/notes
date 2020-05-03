import React from "react";
import { useHistory } from "react-router-dom";
import classnames from "classnames";

export default function (props: any) {
  const { element } = props;

  const history = useHistory();

  if (element.touched) {
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
