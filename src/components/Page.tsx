import React from "react";
import { useService } from "@xstate/react";
import Editor from "./Editor";
import LinkNode from "./Link";
import { NodeEntry } from "slate";
import { KEY_DOWN, CHANGE } from "../machines/pageMachine";
import LinkToolTip from "./LinkTooltip";

import { useQuery } from "@apollo/react-hooks";
import GET_LINKS_BY_VALUE from "../queries/getLinksByValue";
import { IContext, IEvent } from "../machines/pageMachine";

export const PageContext = React.createContext({ activeLinkId: "" });

function Page({ page: pageMachine }: { page: any }) {
  const [current, send] = useService<IContext, IEvent>(pageMachine as any);

  const {
    context: { title },
  } = current;
  const { data: linkData, loading: linksLoading } = useQuery(
    GET_LINKS_BY_VALUE,
    {
      variables: { value: title },
    }
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    if (["Tab", "Enter"].includes(event.key)) {
      event.preventDefault();
    }
    if (event.key === "Backspace" && !current.context.canBackspace) {
      event.preventDefault();
    }

    send({
      type: KEY_DOWN,
      key: event.key,
      shiftKey: event.shiftKey,
    });
  };

  const handleChange = (value: NodeEntry[]) => {
    send({ type: CHANGE, value });
  };

  if (current.matches("loading")) {
    return <div>Loading</div>;
  }

  console.log("activeLinkId", current.context.activeLinkId);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-5xl mb-6">{current.context.title}</h1>
        <PageContext.Provider
          value={{ activeLinkId: current.context.activeLinkId as string }}
        >
          <Editor
            value={current.context.value}
            editor={current.context.editor}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            title={current.context.title}
          />
        </PageContext.Provider>
        <LinkToolTip current={current} send={send} />
      </div>
      <div>
        {linksLoading ? (
          <div>Loading links...</div>
        ) : (
          linkData.link.map((link: any) => (
            <LinkNode key={link.id} data={link} />
          ))
        )}
      </div>
    </div>
  );
}

export default Page;
