import { globIterate } from 'glob';
import fs from 'fs/promises';
import path from 'path';

/** @type {Map<RegExp | string, string>} */
const replace = new Map([
  [/\'.*schema\/basic.graphql\'/, '<get-started>/basic.graphql'],
  [
    /\'.*schema\/subscriptions.graphql\'/g,
    '<get-started>/subscriptions.graphql',
  ],
  [
    /\'.*schema\/authentication.graphql\'/g,
    '<get-started>/authentication.graphql',
  ],
  [
    /\'.*schema\/authorization.graphql\'/g,
    '<get-started>/authorization.graphql',
  ],
  [
    /\'.*schema\/subscriptions.graphql\'/g,
    '<get-started>/subscriptions.graphql',
  ],
  [/@database\/.*\/schema/g, '@database/<database>/schema'],
]);

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

    for (const [searchValue, replaceValue] of replace.entries()) {
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
