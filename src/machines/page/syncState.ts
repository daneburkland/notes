import { actions, assign } from "xstate";
import { IContext } from ".";
import { ApolloCurrentQueryResult } from "apollo-boost";
import { NodeEntry } from "slate";
const { send, cancel } = actions;

const SYNC = "SYNC";
const CHANGE = "CHANGE";

function upsertLinks({ upsertLinks, editor, title }: IContext) {
  const serializedLinkEntries = editor.serializeLinks({
    pageTitle: title,
  });

  if (!!serializedLinkEntries.length) {
    return upsertLinks({
      variables: { links: serializedLinkEntries },
    });
  } else return Promise.resolve();
}

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
    syncingLinks: {
      id: "upsertingLinks",
      invoke: {
        src: upsertLinks,
        onDone: { target: "synced" },
        onError: {
          target: "failure",
          actions: assign({
            errorMessage: (_, event: ApolloCurrentQueryResult<any>) => {
              return event.data.toString();
            },
          }),
        },
      },
    },
    deletingLinks: {
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
          target: "syncingLinks",
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
          target: "deletingLinks",
          actions: assign({
            tags: (_, event: ApolloCurrentQueryResult<any>) => {
              return event.data.data.insert_page.returning[0].tags;
            },
          }),
        },
        onError: {
          target: "failure",
          actions: assign({
            errorMessage: (_, event: ApolloCurrentQueryResult<any>) => {
              return event.data.toString();
            },
          }),
        },
      },
    },
  },
};

export default pageSyncState;
