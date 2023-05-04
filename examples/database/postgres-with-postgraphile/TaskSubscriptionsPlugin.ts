import { gql, makeExtendSchemaPlugin } from 'postgraphile';
import { GraphQLContext } from './schema';

export const TaskSubscriptionsPlugin = makeExtendSchemaPlugin((build) => ({
  typeDefs: gql`
    extend type Subscription {
      taskCreated: Task!
      # TODO: taskChanged(id: ID!): Task!
    }
  `,
  resolvers: {
    Subscription: {
      taskCreated: {
        async subscribe(_parent, _args, ctx: GraphQLContext, { graphile }) {
          const notifs = await ctx.pgSubscribe('task_created');
          return {
            [Symbol.asyncIterator]() {
              return this;
            },
            async next() {
              const { value, done } = await notifs.next();
              if (done) {
                return { value: undefined, done: true };
              }
              const [row] = await graphile.selectGraphQLResultFromTable(
                build.pgSql.fragment`public.task`,
                (tableAlias, sqlBuilder) => {
                  sqlBuilder.where(
                    build.pgSql.fragment`${tableAlias}.id = ${build.pgSql.value(
                      value,
                    )}`,
                  );
                },
              );
              return { value: { taskCreated: row }, done: false };
            },
            async throw(err: unknown) {
              notifs.throw!(err);
              return { value: undefined, done: true };
            },
            async return() {
              notifs.return!();
              return { value: undefined, done: true };
            },
          };
        },
      },
    },
  },
}));
