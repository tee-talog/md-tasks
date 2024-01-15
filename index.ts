import fs from "fs"
import { toMarkdown } from "mdast-util-to-markdown"
import { fromMarkdown } from "mdast-util-from-markdown"

const main = async () => {
  const file = fs.readFileSync("tasks.md", "utf-8")

  const tokens = fromMarkdown(file)
  console.log(tokens)

  const id = "1705225105518_0"

  const list = tokens.children.find((e) => e.type === "list")
  if (list.type === "list") {
    const p = list.children[0].children[0]
    if (p.type === "paragraph") {
      if (p.children[0].type === "text") {
        console.log(p.children[0].value)
      }
    }
  }

  const text = toMarkdown(tokens)
  console.log(text)
}

main()
