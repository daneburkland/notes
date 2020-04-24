import React from "react";

export default function (props: any) {
  return (
    <ul className="list-disc pl-4" {...props.attributes}>
      {props.children}
    </ul>
  );
}
