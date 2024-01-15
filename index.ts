import remarkParse from "remark-parse"
import remarkStringify from "remark-stringify"
import { unified } from "unified"

const main = async () => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkStringify)
    .parse("# Hello, Neptune!")
  // .process("# Hello, Neptune!")

  console.log(file)
}

main()
