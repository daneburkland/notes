import React from "react";
import { render, findByText, cleanup } from "@testing-library/react";
import { Router } from "react-router-dom";
import { App } from "./App";
import { MockedProvider } from "@apollo/react-testing";
import GET_OR_CREATE_PAGE from "./mutations/getOrCreatePage";
import GET_PAGE from "./queries/getPages";
import { createBrowserHistory } from "history";
import { todayDateString } from "./utils/datetime";
import GET_LINKS_BY_VALUE from "./queries/getLinksByValue";
import { placeholderNode } from "./plugins/withLink";

const rootMocks = [
  {
    request: {
      query: GET_OR_CREATE_PAGE,
      variables: {
        page: {
          title: todayDateString(),
          node: placeholderNode,
        },
      },
    },
    result: {
      data: {
        insert_page: {
          returning: [{ node: placeholderNode, title: todayDateString() }],
        },
      },
    },
  },

  {
    request: {
      query: GET_LINKS_BY_VALUE,
      variables: { value: todayDateString() },
    },
    result: {
      data: {
        link: [],
      },
    },
  },
];

test("root", async () => {
  window.getSelection = function () {
    return {
      removeAllRanges: function () {},
    };
  };

  const history = createBrowserHistory();
  history.push({ pathname: "/" });
  const { container } = render(
    <MockedProvider addTypename={false} mocks={rootMocks}>
      <Router history={history}>
        <App />
      </Router>
    </MockedProvider>
  );

  const titleElement = await findByText(container, todayDateString());
  expect(titleElement).toBeInTheDocument();

  // it("title element is present", async () => {
  //   const titleElement = await findByText(container, todayDateString());
  //   expect(titleElement).toBeInTheDocument();
  // });

  cleanup();
});

const pageMocks = [
  {
    request: {
      query: GET_OR_CREATE_PAGE,
      variables: {
        page: {
          title: "yay",
          node: placeholderNode,
        },
      },
    },
    result: {
      data: {
        insert_page: {
          returning: [{ node: placeholderNode, title: "yay" }],
        },
      },
    },
  },

  {
    request: {
      query: GET_LINKS_BY_VALUE,
      variables: { value: "yay" },
    },
    result: {
      data: {
        link: [],
      },
    },
  },
];

test("page", async () => {
  window.getSelection = function () {
    return {
      removeAllRanges: function () {},
    };
  };

  const history = createBrowserHistory();
  history.push({ pathname: "/page/yay" });
  const { container } = render(
    <MockedProvider addTypename={false} mocks={pageMocks}>
      <Router history={history}>
        <App />
      </Router>
    </MockedProvider>
  );

  const titleElement = await findByText(container, "yay");
  expect(titleElement).toBeInTheDocument();

  cleanup();
});
