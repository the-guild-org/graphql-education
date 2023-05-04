import { gql, makeExtendSchemaPlugin } from 'postgraphile';
import { GraphQLContext } from './schema';

export const SessionPlugin = makeExtendSchemaPlugin(
  ({ pgSql: sql, graphql }) => ({
    typeDefs: gql`
      extend type Query {
        me: User @pgField
      }
      extend type Mutation {
        login(email: String!, password: String!): User! @pgField
        register(input: RegisterInput!): User! @pgField
      }
      input RegisterInput {
        name: String!
        email: String!
        password: String!
      }
    `,
    resolvers: {
      Query: {
        async me(_parent, _args, ctx: GraphQLContext, { graphile }) {
          if (!ctx.sessionId) {
            return null;
          }
          const {
            rows: [session],
          } = await ctx.pgOwnerPool.query(
            'select user_id from session where id = $1',
            [ctx.sessionId],
          );
          if (!session) {
            return null;
          }
          const [row] = await graphile.selectGraphQLResultFromTable(
            sql.fragment`public.user`,
            (tableAlias, sqlBuilder) => {
              sqlBuilder.where(
                sql.fragment`${tableAlias}.id = ${sql.value(session.user_id)}`,
              );
            },
          );
          return row;
        },
      },
      Mutation: {
        async login(
          _parent,
          args: { email: string; password: string },
          ctx: GraphQLContext,
          { graphile },
        ) {
          // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
          const {
            rows: [user],
          } = await ctx.pgOwnerPool.query(
            'select id from public.user where email = $1 and password = $2',
            [args.email, args.password],
          );
          if (!user) {
            throw new graphql.GraphQLError('Wrong credentials!');
          }

          const {
            rows: [session],
          } = await ctx.pgOwnerPool.query(
            'insert into session (user_id) values ($1) returning id',
            [user.id],
          );
          ctx.setSessionId(session.id);

          const [row] = await graphile.selectGraphQLResultFromTable(
            sql.fragment`public.user`,
            (tableAlias, sqlBuilder) => {
              sqlBuilder.where(
                sql.fragment`${tableAlias}.id = ${sql.value(user.id)}`,
              );
            },
          );
          return row;
        },
        async register(
          _parent,
          args: { input: { name: string; email: string; password: string } },
          ctx: GraphQLContext,
          { graphile },
        ) {
          // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
          const {
            rows: [user],
          } = await ctx.pgOwnerPool.query(
            'insert into public.user (name, email, password) values ($1, $2, $3) returning id',
            [args.input.name, args.input.email, args.input.password],
          );

          const {
            rows: [session],
          } = await ctx.pgOwnerPool.query(
            'insert into session (user_id) values ($1) returning id',
            [user.id],
          );
          ctx.setSessionId(session.id);

          const [row] = await graphile.selectGraphQLResultFromTable(
            sql.fragment`public.user`,
            (tableAlias, sqlBuilder) => {
              sqlBuilder.where(
                sql.fragment`${tableAlias}.id = ${sql.value(user.id)}`,
              );
            },
          );
          return row;
        },
      },
    },
  }),
);
