import React from "react";
import classnames from "classnames";

export default function (props: any) {
  return (
    <a
      href={props.element.url}
      onMouseDown={() => window.open(props.element.url)}
      className={classnames("cursor-pointer text-blue-500 hover:text-blue-800")}
      {...props.attributes}
    >
      {props.children}
    </a>
  );
}
