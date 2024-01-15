import fs from "fs"
import remarkParse from "remark-parse"
import remarkStringify from "remark-stringify"
import { unified } from "unified"

const main = async () => {
  const file = fs.readFileSync("tasks.md", "utf-8")

  const tokens = await unified()
    .use(remarkParse)
    .use(remarkStringify)
    .parse(file)
  // .process("# Hello, Neptune!")

  console.log(tokens)
}

main()
