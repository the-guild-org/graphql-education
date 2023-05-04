import { gql, makeExtendSchemaPlugin } from 'postgraphile';
import { GraphQLContext } from './schema';

export const TaskSubscriptionsPlugin = makeExtendSchemaPlugin(
  ({ pgSql: sql }) => ({
    typeDefs: gql`
      extend type Subscription {
        taskCreated: Task!
        # TODO: taskChanged(id: ID!): Task!
      }
    `,
    resolvers: {
      Subscription: {
        taskCreated: {
          subscribe(_parent, _args, ctx: GraphQLContext) {
            return ctx.pgSubscribe('task_created');
          },
          async resolve(payload, _args, _ctx, { graphile }) {
            const [row] = await graphile.selectGraphQLResultFromTable(
              sql.fragment`public.task`,
              (tableAlias, sqlBuilder) => {
                sqlBuilder.where(
                  sql.fragment`${tableAlias}.id = ${sql.value(payload)}`,
                );
              },
            );
            return row;
          },
        },
      },
    },
  }),
);
