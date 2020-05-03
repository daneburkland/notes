import { assign } from "xstate";
import { IContext } from "./index";
import { placeholderNode } from "../../plugins/withLink";

function invokeFetchPage({ title, getOrCreatePage }: IContext) {
  return getOrCreatePage({
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
      target: "loaded",
      actions: [
        assign<IContext>({
          value: setValue,
          title: setTitle,
        }),
      ],
    },
    onError: "failed",
  },
};

export default loadingState;
