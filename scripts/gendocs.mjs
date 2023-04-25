import { globIterate } from 'glob';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  for await (const page of globIterate('website/src/pages/**/*.mdx')) {
    console.log(`Inspecting page ${page}...`);

    const contents = (await fs.readFile(page)).toString();

    const codeblocksWithFilename =
      contents.match(/```\w*\sfilename=".*"([\s\S]*?)```/gm) || [];
    console.log(`Found ${codeblocksWithFilename.length} codeblocks`);

    let i = 0;
    for (const codeblock of codeblocksWithFilename) {
      i++;
      console.log(`Injecting source to codeblock #${i}`);

      const filename = codeblock.match(/```\w*\sfilename="(.*)"/)?.[1];
      if (!filename) {
        throw new Error(
          `Unable to read the filename from codeblock #${i} in ${page}`,
        );
      }

      try {
        const source = await fs.readFile(filename);
        const ext = path.extname(filename).substring(1);

        await fs.writeFile(
          page,
          contents.replace(
            codeblock,
            // appending a newline after the source is not necessary because of prettier
            `\`\`\`${ext} filename="${filename}"\n${source}\`\`\``,
          ),
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
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
