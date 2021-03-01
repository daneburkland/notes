import createAuth0Client from "@auth0/auth0-spa-js";

const onRedirectCallback = () =>
  window.history.replaceState({}, document.title, window.location.pathname);

export const initAuth0 = async () => {
    const auth0FromHook = await createAuth0Client(initOptions);
    setAuth0(auth0FromHook);

    if (
      window.location.search.includes("code=") &&
      window.location.search.includes("state=")
    ) {
      const { appState } = await auth0FromHook.handleRedirectCallback();
      onRedirectCallback(appState);
    }

    const isAuthenticated = await auth0FromHook.isAuthenticated();

    setIsAuthenticated(isAuthenticated);

    if (isAuthenticated) {
      const user = await auth0FromHook.getUser();
      setUser(user);
    }

    setLoading(false);
  };