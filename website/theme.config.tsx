import { defineConfig, useTheme } from '@theguild/components';

const siteName = 'GraphQL Education';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/the-guild-org/graphql-education',
  logo: (
    <div>
      <h1 className="md:text-md text-sm font-medium">{siteName}</h1>
      <h2 className="hidden text-xs sm:block">The last GraphQL academy</h2>
    </div>
  ),
  main({ children }) {
    useTheme();
    return <>{children}</>;
  },
  siteName,
});
