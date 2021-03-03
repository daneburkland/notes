import { assign } from "xstate";
import { IContext } from "./index";
import { placeholderNode } from "../../plugins/withLinks";
import GET_OR_CREATE_PAGE from "../../mutations/getOrCreatePage";

function invokeFetchPage({ title, apolloClient }: IContext) {
  return apolloClient.mutate({
    mutation: GET_OR_CREATE_PAGE,
    variables: {
      page: { title, node: placeholderNode, isDaily: true },
    },
  });
}

function setValue(_: IContext, event: any) {
  return [event.data.data.insert_page.returning[0].node];
}

function setTitle(_: IContext, event: any) {
  return event.data.data.insert_page.returning[0].title;
}

const loadingState = {
  invoke: {
    id: "fetch-page",
    src: invokeFetchPage,
    onDone: {
      target: "loadingAuth",
      actions: [
        assign<IContext>({
          value: setValue,
          title: setTitle,
        }),
      ],
    },
    onError: {
      target: "failed",
      actions: ["logError"],
    },
  },
};

export default loadingState;
