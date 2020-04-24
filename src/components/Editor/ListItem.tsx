import React from "react";

export default function (props: any) {
  return (
    <li className="" {...props.attributes}>
      {props.children}
    </li>
  );
}
