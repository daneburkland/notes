const devConfig = {
  redirect_uri: process.env.REACT_APP_AUTH0_REDIRECT_URI_DEV,
  audience: process.env.REACT_APP_GRAPHQL_ENDPOINT_DEV,
};

const prodConfig = {
  redirect_uri: process.env.REACT_APP_AUTH0_REDIRECT_URI_PROD,
  audience: process.env.REACT_APP_GRAPHQL_ENDPOINT_PROD,
};

export default {
  domain: process.env.REACT_APP_AUTH0_DOMAIN,
  clientId: process.env.REACT_APP_AUTH0_CLIENTID,
  ...(process.env.NODE_ENV === "production" ? prodConfig : devConfig),
};
