import { globIterate } from 'glob';
import fs from 'fs/promises';
import path from 'path';

const replace = {
  '../../../schema.graphql': '<get-started>/schema.graphql',
  '@database/postgres-with-prisma/schema': '@database/<slug>/schema',
  '@database/postgres-with-postgraphile/schema': '@database/<slug>/schema',
};

async function main() {
  for await (const page of globIterate('website/src/pages/**/*.md?(x)')) {
    console.log(`Inspecting page ${page}...`);

    let contents = (await fs.readFile(page)).toString();

    const codeblocksWithFilename =
      contents.match(/```\w*\sfilename=".*"([\s\S]*?)```/gm) || [];
    console.log(`\tFound ${codeblocksWithFilename.length} codeblocks`);

    let i = 0;
    for (const codeblock of codeblocksWithFilename) {
      i++;
      const filename = codeblock.match(/```\w*\sfilename="(.*)"/)?.[1];
      if (!filename) {
        throw new Error(
          `Unable to read the filename from codeblock #${i} in ${page}`,
        );
      }

      console.log(
        `\t\tGenerating codeblock #${i} with filename ${filename}...`,
      );

      try {
        const source = await fs.readFile(filename);
        const ext = path.extname(filename).substring(1);

        contents = contents.replace(
          codeblock,
          // appending a newline after the source is not necessary because of prettier
          `\`\`\`${ext || 'sh'} filename="${filename}"\n${source}\`\`\``,
        );
      } catch (err) {
        if (err.code === 'ENOENT') {
          throw new Error(
            `Source file at path ${filename} from page ${page} codeblock #${i} does not exist`,
          );
        }
        throw err;
      }
    }

    for (const [searchValue, replaceValue] of Object.entries(replace)) {
      contents = contents.replace(searchValue, replaceValue);
    }

    await fs.writeFile(page, contents);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
