import React from "react";
import { useService } from "@xstate/react";
import Editor from "./Editor";
import LinkNode from "./Link";
import { NodeEntry } from "slate";
import { KEY_DOWN, CHANGE } from "../machines/page/events";
import PagesTooltip from "./PagesTooltip";

import { useQuery } from "@apollo/react-hooks";
import GET_LINKS_BY_VALUE from "../queries/getLinksByValue";
import { IContext, IEvent } from "../machines/page";

export const PageContext = React.createContext({
  activeLinkId: "",
  touchedLinkNodes: [] as any,
});

function Page({ machine }: any) {
  const [current, send] = useService<IContext, IEvent>(machine as any);
  const isAuthenticated = current.matches("authenticated");
  console.log(current.toStrings());

  const {
    context: { title },
  } = current;
  const { data: linkData, loading: linksLoading } = useQuery(
    GET_LINKS_BY_VALUE,
    {
      variables: { value: title },
      fetchPolicy: "network-only",
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
      metaKey: event.metaKey,
    });
  };

  const handleChange = (value: NodeEntry[]) => {
    send({ type: CHANGE, value });
  };

  if (current.matches("loading")) {
    return <div>Waking up free Heroku dynos...</div>;
  }

  const isSynced = current.matches({ authenticated: { sync: "synced" } });

  return (
    <div>
      <div className="mb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl truncate font-black">
            {current.context.title}
          </h1>
          <svg height="16" width="16">
            <circle cx="8" cy="8" r="8" fill={isSynced ? "green" : "yellow"} />
          </svg>
        </div>
        {!!current.context.errorMessage && (
          <span>{current.context.errorMessage}</span>
        )}
        <PageContext.Provider
          value={{
            activeLinkId: current.context.activeLinkId as string,
            touchedLinkNodes: current.context.touchedLinkNodes,
          }}
        >
          <Editor
            readOnly={!isAuthenticated && !process.env.REACT_APP_IS_DEMO}
            value={current.context.value}
            editor={current.context.editor}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            title={current.context.title}
          />
        </PageContext.Provider>
        <PagesTooltip current={current} send={send} />
      </div>
      <div className="mb-4">
        <h3 className="text-lg mb-2 text-gray-600">References</h3>
        {linksLoading ? (
          <div>Loading references...</div>
        ) : (
          linkData.link.map((link: any) => (
            <LinkNode key={link.id} data={link} />
          ))
        )}
      </div>
      <hr className="mb-4" />
      {process.env.REACT_APP_AUTHOR && (
        <div>
          <span>
            The working notes of{" "}
            <strong>
              <a href={process.env.REACT_APP_AUTHOR_URL}>
                {process.env.REACT_APP_AUTHOR}
              </a>
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}

export default Page;
