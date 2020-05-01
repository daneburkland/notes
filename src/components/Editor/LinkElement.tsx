import React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";

export default function (props: any) {
  const { element } = props;

  return (
    <Link
      to={{ pathname: `/page/${element.value}` }}
      className={classnames("cursor-pointer", {
        "text-gray-500": element.touched,
        "text-blue-500 hover:text-blue-800": !element.touched,
      })}
      {...props.attributes}
    >
      {props.children}
    </Link>
  );
}
