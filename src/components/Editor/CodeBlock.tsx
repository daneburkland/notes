import React from "react";

export default function (props: any) {
  return (
    <pre className="bg-gray-200 p-2 whitespace-pre-wrap">
      <code {...props.attributes}>{props.children}</code>
    </pre>
  );
}
