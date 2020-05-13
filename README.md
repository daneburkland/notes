# Notes

A bidirectional note taking app inspired by Roam Research. [Live demo](https://linked-notes.netlify.app/)

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

## Setting up a GraphQL server

To set up a Hasura GraphQL API + Postgres database (with correct schema) on Heroku's free tier, first follow the one click deploy [here](https://hasura.io/docs/1.0/graphql/manual/getting-started/heroku-simple.html).

After the Heroku app has finished deploying, click the 'View' button. Your GraphQL endpoint will be listed at the top of the 'GraphiQL' tab.

To allow your app to talk to your backend, you'll need to set a `REACT_APP_GRAPHQL_ENDPOINT_DEV` (`REACT_APP_GRAPHQL_ENDPOINT_PROD`) environment variable with that endpoint.

Finally, copy the correct schema to your Postgres database:

`heroku pg:backups:restore https://notes-schema.s3.amazonaws.com/latest.dump DATABASE --app <YOUR_HEROKU_APP_NAME>`

## Deployment

If you'd like to deploy your app, Netlify is a great option:

```
npm run build
netlify deploy
```

## Authentication

This app is set up to use Auth0 as an optional authentication provider. To secure your GraphQL endpoints, follow [these](https://hasura.io/docs/1.0/graphql/manual/deployment/heroku/securing-graphql-endpoint.html#heroku-secure) steps. Next, follow [these](https://hasura.io/docs/1.0/graphql/manual/guides/integrations/auth0-jwt.html) Auth0 integration steps. Lastly, you'll need to set the appropriate environment variables: `REACT_APP_AUTH0_DOMAIN`, `REACT_APP_AUTH0_CLIENTID`, `REACT_APP_AUTH0_REDIRECT_URI_PROD` (`REACT_APP_AUTH0_REDIRECT_URI_DEV`). Permissions can then be assigned by role in the Hasura GUI.
