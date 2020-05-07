# Notes

A bidirectional note taking app inspired by Roam Research.

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

## Setting up a GraphQL server

To set up a Hasura GraphQL API + Postgres database (with correct schema) on Heroku's free tier, first follow the one click deploy [here](https://hasura.io/docs/1.0/graphql/manual/getting-started/heroku-simple.html).

After the Heroku app has finished deploying, click the 'Open app' button. Your GraphQL endpoint will be listed at the top of the 'GraphiQL' tab.

Create an `api.js` file in `src/`:

```
touch src/api.js
echo 'export const uri = <YOUR_GRAPHQL_ENDPOINT>;' > src/api.js
```

Next, copy the correct schema to your Postgres database:

`heroku pg:backups:restore https://notes-schema.s3.amazonaws.com/latest.dump?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAZNFWS7JQQOMOIZMZ%2F20200507%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200507T021342Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=3024f1776250104208968462d34a22be9d4eab33ad7f71d73f363a73f5966764 DATABASE --app <YOUR_HEROKU_APP_NAME>`

After restoring your database with the correct schema, you may need to access the "Data > Schema" section of your Hasura GUI and 'Track all' untracked foreign-key relations
