import fs from "fs"
import remarkParse from "remark-parse"
// import remarkStringify from "remark-stringify"
import { unified } from "unified"
import { toMarkdown } from "mdast-util-to-markdown"

const main = async () => {
  const file = fs.readFileSync("tasks.md", "utf-8")

  const tokens = await unified().use(remarkParse).parse(file)
  // .use(remarkStringify)
  // .process("# Hello, Neptune!")

  console.log(tokens)

  const text = toMarkdown(tokens)
  console.log(text)
}

main()
