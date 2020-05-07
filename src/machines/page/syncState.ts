import { actions, assign } from "xstate";
import { IContext } from ".";
import { ApolloCurrentQueryResult } from "apollo-boost";
import { NodeEntry } from "slate";
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
      target: ".syncingPage",
    },
  },
  states: {
    unsynced: {},
    synced: {},
    failure: {},
    syncingTags: {
      invoke: {
        src: ({ editor, tags: persistedTags, deleteLinks }: IContext) => {
          const tags = editor.getLinkNodeEntries();
          const tagIds = tags.map(([node]: NodeEntry) => node.id);
          const tagIdsToDestroy = persistedTags
            .map(({ id }) => id)
            .filter((id) => !tagIds.includes(id));
          return deleteLinks({
            variables: { linkIds: tagIdsToDestroy },
          });
        },
        onDone: {
          target: "synced",
        },
      },
    },
    syncingPage: {
      invoke: {
        src: ({ upsertPage, title, value }: IContext) => {
          return upsertPage({
            variables: { page: { node: value[0], title } },
          });
        },
        onDone: {
          target: "syncingTags",
          actions: assign({
            tags: (_, event: ApolloCurrentQueryResult<any>) => {
              return event.data.data.insert_page.returning[0].tags;
            },
          }),
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
