import type {
  Root,
  Heading,
} from "https://esm.sh/mdast-util-from-markdown@2.0.0/lib/index.d.ts"

class TaskList {
  private tokens: Root

  constructor(tokens: Root) {
    this.tokens = structuredClone(tokens)
  }

  addItem(text: string, sectionIndex = 0) {}
  removeItem(taskId: string) {}
  toAst() {}

  // h2 のテキストから、該当するセクション内の要素を取得する
  private getSectionFromText(headingTitle: string) {
    for (let i = 0; i < this.tokens.children.length; i++) {
      const rootChild = this.tokens.children[i]
      if (!rootChild || rootChild.type !== "heading" || rootChild.depth !== 2) {
        continue
      }

      const headingChild = rootChild.children[0]
      if (!headingChild || headingChild.type !== "text") {
        continue
      }
      if (headingChild.value.trim() === headingTitle) {
        // 該当するセクションが確定
        return this.getSectionFromIndex(i)
      }
    }

    throw new Error("Cannot find section")
  }

  // h2 のインデックスから、該当するセクション内の要素を取得する
  private getSectionFromIndex(index: number) {
    const heading = this.tokens.children[index]
    if (heading.type !== "heading") {
      throw new Error("No Heading")
    }
    const textElement = heading.children[0]
    if (!textElement || textElement.type !== "text") {
      throw new Error("No Heading Text")
    }
    const title = textElement.value

    const sectionItems: Root["children"] = []
    for (let i = index + 1; ; i++) {
      const sectionItem = this.tokens.children[i]
      if (
        !sectionItem ||
        (sectionItem.type === "heading" && sectionItem.depth === 2)
      ) {
        // 探索終了
        // tokens を全部見終わったか、次のセクションに移動したか
        break
      }
      sectionItems.push(sectionItem)
    }

    return {
      title,
      index,
      items: sectionItems,
    }
  }
}

export default TaskList
