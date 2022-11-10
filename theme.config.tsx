import { defineConfig, useTheme } from '@theguild/components';

const siteName = 'GraphQL Education';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/the-guild-org/graphql-education',
  // TODO:
  // getNextSeoProps() {
  //   return {
  //     openGraph: {
  //       images: [
  //         { url: "" },
  //       ],
  //     },
  //   };
  // },
  logo: (
    <div>
      <h1 className="md:text-md text-sm font-medium">{siteName}</h1>
      <h2 className="hidden text-xs sm:block">The last GraphQL academy.</h2>
    </div>
  ),
  main({ children }) {
    useTheme();

    // const comments = route !== "/" && (
    //   <Giscus
    //     key={route}
    //     repo=""
    //     repoId=""
    //     category="Education Discussion"
    //     categoryId=""
    //     mapping="pathname"
    //     theme={resolvedTheme}
    //   />
    // );

    return <>{children}</>;
  },
  siteName,
});
