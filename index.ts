import { toMarkdown } from "mdast-util-to-markdown"
import { fromMarkdown } from "mdast-util-from-markdown"
import type {
  List,
  Root,
} from "https://esm.sh/mdast-util-from-markdown@2.0.0/lib/index.d.ts"

// タスクを移動する
const shiftTask = (tokens: Root, id: string, step: number): Root | null => {
  // heading 2 のセクションを探す
  const headingIndexes = tokens.children
    .map((token, i) => ({ i, token }))
    .filter(({ token }) => token.type === "heading" && token.depth === 2)
    .map(({ i }) => i)

  // それぞれのセクションについて探索する
  for (
    let headingIndexesIndex = 0;
    headingIndexesIndex < headingIndexes.length;
    headingIndexesIndex++
  ) {
    const headingIndex = headingIndexes[headingIndexesIndex]
    const lists = tokens.children.filter(
      (e, i): e is List =>
        e.type === "list" &&
        // heading の次のトークンから、次の heading の前のトークンまで
        i > headingIndex &&
        (headingIndexes[headingIndexesIndex + 1] === undefined
          ? true
          : i < headingIndexes[headingIndexesIndex + 1])
    )

    for (const list of lists) {
      // リストアイテムを探索
      for (let listIndex = 0; listIndex < list.children.length; listIndex++) {
        const listItem = list.children[listIndex]

        // ネストしていないものだけチェック
        const paragraph = listItem.children[0]
        if (paragraph.type !== "paragraph") {
          throw new Error("no paragraph")
        }
        const text = paragraph.children[0]
        if (text.type !== "text") {
          throw new Error("no text")
        }

        // ID がマッチしているかチェック
        const [taskId] = text.value.split(":")
        if (taskId === id) {
          // リストアイテムを移動して終了
          // NOTE: とりあえずミュータブルにやる
          // リストから消す
          list.children = list.children.filter((_, i) => i !== listIndex)

          // 移動先のリストに追加する
          const moveTo = headingIndexesIndex + step
          const destinationSectionIndex = headingIndexes[moveTo]
          if (destinationSectionIndex === undefined) {
            // TODO: エラーハンドリングが正しいか確認する
            throw new Error("destination list is out of index")
          }
          // セクション内の最初のリストの最後に追加する
          const destinationList = tokens.children.find(
            (e, i): e is List =>
              e.type === "list" &&
              // 移動先の heading の次のトークンから、次の heading の前のトークンまで
              i > destinationSectionIndex &&
              (headingIndexes[moveTo + 1] === undefined
                ? true
                : i < headingIndexes[moveTo + 1])
          )
          if (destinationList === undefined) {
            // セクションにリストが存在しない場合は、新しくリストを作る
            const defaultList: List = {
              type: "list",
              ordered: false,
              start: null,
              spread: false,
              children: [listItem],
            }
            tokens.children.splice(destinationSectionIndex + 1, 0, defaultList)
            return tokens
          }
          destinationList.children.push(listItem)
          return tokens
        }
      }
    }
  }

  return null
}

const main = () => {
  const file = Deno.readTextFileSync("tasks.md")

  const tokens = fromMarkdown(file)
  // debug
  Deno.writeTextFileSync("token.json", JSON.stringify(tokens))

  const id = "1705225105518-0"

  const movedTokens = shiftTask(tokens, id, 1)
  // debug
  Deno.writeTextFileSync("moved.json", JSON.stringify(movedTokens))

  const str = toMarkdown(tokens)
  Deno.writeTextFileSync("tasks.md", str)
}

main()
