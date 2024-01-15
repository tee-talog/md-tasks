import fs from "fs"
import { toMarkdown } from "mdast-util-to-markdown"
import { fromMarkdown } from "mdast-util-from-markdown"

const main = async () => {
  const file = fs.readFileSync("tasks.md", "utf-8")

  const tokens = fromMarkdown(file)
  console.log(tokens)

  const text = toMarkdown(tokens)
  console.log(text)
}

main()
