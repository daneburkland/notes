import React, { useContext } from "react";
import { PageContext } from "../Page";
import { Link } from "react-router-dom";
import classnames from "classnames";

export default function (props: any) {
  const { element } = props;

  const { activeLinkId } = useContext(PageContext);

  if (activeLinkId === props.element.id) {
    return (
      <span className="relative">
        <span>{props.children}</span>
      </span>
    );
  }

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
