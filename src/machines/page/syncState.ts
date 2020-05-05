import { actions, assign } from "xstate";
import { NodeEntry } from "slate";
import { IContext } from ".";
import { ApolloCurrentQueryResult } from "apollo-boost";
const { send, cancel } = actions;

const SYNC = "SYNC";
const CHANGE = "CHANGE";

const pageSyncState = {
  initial: "synced" as string,
  on: {
    [CHANGE]: {
      target: ".unsynced",
      actions: [
        cancel("syncTimeout"),
        send(SYNC, {
          delay: 2000,
          id: "syncTimeout",
        }),
      ],
    },
    [SYNC]: {
      target: ".syncing",
      actions: [
        assign<IContext>({
          prevLinks: ({ links }: IContext) => links,
          links: ({ editor }: IContext) => editor.getLinkNodeEntries(),
        }),
        // TODO: these are causing another CHANGE event
        // "removeBrokenLinkNodeEntries",
        // "setLinkNodeValues",
      ],
    },
  },
  states: {
    unsynced: {},
    synced: {},
    failure: {},
    syncing: {
      invoke: {
        src: ({
          upsertPage,
          title,
          value,
          prevLinks,
          links,
          deleteLinks,
        }: IContext) => {
          const prevLinkIds = prevLinks.map(([node]: NodeEntry) => node.id);
          const linkIds = links.map(([node]: NodeEntry) => node.id);

          const destroyedLinkIds = prevLinkIds.filter(
            (id) => !linkIds.includes(id)
          );

          let deleteLinksPromise;
          if (!!destroyedLinkIds.length) {
            deleteLinksPromise = deleteLinks({
              variables: { linkIds: destroyedLinkIds },
            });
            // TODO: .then(delete pages where count of link#value (page.title) is 0 and page isEmpty)
          }

          const upsertPagePromise = upsertPage({
            variables: { page: { node: value[0], title } },
          });

          return Promise.all([deleteLinksPromise, upsertPagePromise]);
        },
        onDone: {
          target: "synced",
        },
        onError: {
          target: "failure",
          actions: assign({
            errorMessage: (context, event: ApolloCurrentQueryResult<any>) => {
              return event.data.toString();
            },
          }),
        },
      },
    },
  },
};

export default pageSyncState;
