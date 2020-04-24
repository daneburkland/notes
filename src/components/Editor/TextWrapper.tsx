import React from "react";

export default function (props: any) {
  return (
    <span className="" {...props.attributes}>
      {props.children}
    </span>
  );
}
