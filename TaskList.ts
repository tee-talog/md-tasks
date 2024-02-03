import type {
  Root,
  List,
  ListItem,
  Heading,
} from "https://esm.sh/mdast-util-from-markdown@2.0.0/lib/index.d.ts"

type AstElement = Root["children"][number]

type Task = {
  // tokens.children の何番目か
  listIndex: number
  task: {
    // tokens.children[listIndex].children の何番目か
    listItemIndex: number
    id: string
    text: string
  }
}

class TaskList {
  private tokens: Root

  constructor(tokens: Root) {
    this.tokens = structuredClone(tokens)
  }

  // タスクを追加する
  addItem(taskId: string, text: string, sectionIndex = 0): string {
    // 追加する要素を作成
    const listItem: ListItem = {
      type: "listItem",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value: `${taskId}: ${text.trim()}`,
            },
          ],
        },
      ],
    }

    // 移動先にタスクを追加
    this.appendTaskItem(sectionIndex, listItem)

    return taskId
  }

  // Task ID と移動先のセクションインデックスを指定して、要素を移動する
  shiftItem(taskId: string, sectionIndex: number): void {
    // Task ID に該当するタスクを取得
    const task = this.getTaskItemById(taskId)
    // getTaskItemById で取得した時点で型チェックは終わっている
    const fromList = this.tokens.children[task.listIndex] as List
    const fromListItem = fromList.children[task.task.listItemIndex] as ListItem

    // 移動先にタスクを追加
    this.appendTaskItem(sectionIndex, fromListItem)
    // 移動元のタスクを削除
    fromList.children.splice(task.task.listItemIndex, 1)
  }

  // 指定された Task ID を持つタスクを削除する
  // 削除したタスクの情報を返す
  removeItem(taskId: string) {
    const task = this.getTaskItemById(taskId)

    // getTaskItemById で取得した時点で型チェックは終わっている
    const list = this.tokens.children[task.listIndex] as List
    list.children.splice(task.task.listItemIndex, 1)

    return { id: taskId, text: task.task.text }
  }

  // AST を返す
  toAst() {
    return this.tokens
  }

  // Task ID がどのセクションに存在するかを返す
  // 戻り値は tokens.children のインデックスではなく、セクションの通し番号
  getSectionIdByTaskId(taskId: string): number {
    const task = this.getTaskItemById(taskId)

    // TODO findLastIndex 以外は共通化できそう
    const sectionIndex = this.tokens.children
      .map((element, index) => ({ element, index }))
      .filter(
        (e): e is { element: Heading; index: number } =>
          e.element.type === "heading" && e.element.depth === 2
      )
      .map(({ index }) => this.getSectionByIndex(index))
      // section.index は Heading 要素、task.listIndex は List 要素を指している
      // task.listIndex を下回る最初の Heading 要素が、所属するセクションとなる
      .findLastIndex((section) => section.index < task.listIndex)

    if (sectionIndex === -1) {
      throw new Error(`Task ID "${taskId}" is not found`)
    }
    return sectionIndex
  }

  // タスクを指定したセクションに追加する
  private appendTaskItem(sectionIndex: number, taskItem: ListItem) {
    // sectionIndex 番目のセクション
    // → tokens.children で index 番目の要素
    const index = this.sectionIndexToAstIndex(sectionIndex)
    const toSection = this.getSectionByIndex(index)

    // 該当セクションの最後のリストに追加
    const toList = toSection.items.findLast(
      (item): item is List => item.type === "list"
    )

    if (toList) {
      // リストに追加
      toList.children.push(taskItem)
    } else {
      // リストがないので追加する
      this.tokens.children.splice(toSection.index + 1, 0, {
        type: "list",
        children: [taskItem],
      })
    }
  }

  // セクションの通し番号を tokens.children のインデックスに変換する
  private sectionIndexToAstIndex(sectionIndex: number) {
    let count = -1
    for (let i = 0; i < this.tokens.children.length; i++) {
      const token = this.tokens.children[i]
      if (token.type === "heading" && token.depth === 2) {
        count++
        if (count === sectionIndex) {
          return i
        }
      }
    }
    throw new Error(`No. ${sectionIndex} Section is not found`)
  }

  // Task ID で検索する
  private getTaskItemById(taskId: string): Task {
    const sections = this.tokens.children
      .map((element, index) => ({ element, index }))
      .filter(
        ({ element }) => element.type === "heading" && element.depth === 2
      )
      .map(({ index }) => this.getSectionByIndex(index))

    // 各セクションを見ていく
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex]

      // リストを見つける
      for (let listIndex = 0; listIndex < section.items.length; listIndex++) {
        const list = section.items[listIndex]
        if (!list || list.type !== "list") {
          continue
        }

        // 見つけたリストのリストアイテム === タスクを見ていく
        for (
          let listItemIndex = 0;
          listItemIndex < list.children.length;
          listItemIndex++
        ) {
          const listItem = list.children[listItemIndex]
          if (!listItem || listItem.type !== "listItem") {
            continue
          }

          // リストアイテムの中にはパラグラフが入っている
          const paragraph = listItem.children[0]
          // NOTE: リストがネストしている場合は、type === "list" が来ることもあるが、
          // タスクにはテキストがあるので、パラグラフが最初に来るはず
          if (!paragraph || paragraph.type !== "paragraph") {
            continue
          }

          // パラグラフの中にテキストが入っている
          const listItemText = paragraph.children[0]
          if (!listItemText || listItemText.type !== "text") {
            continue
          }

          // ID が一致しているか見る
          const text = listItemText.value
          const [id, value] = text.split(":")
          if (id === taskId) {
            // 一致
            return {
              listIndex: section.index + 1 + listIndex,
              task: {
                listItemIndex,
                id,
                text: value.trim(),
              },
            }
          }
        }
      }
    }

    throw new Error(`task ID ${taskId} is not found`)
  }

  // h2 のテキストから、該当するセクション内の要素を取得する
  private getSectionByText(headingTitle: string) {
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
        return this.getSectionByIndex(i)
      }
    }

    throw new Error("Cannot find section")
  }

  // h2 のインデックスから、該当するセクション内の要素を取得する
  private getSectionByIndex(index: number) {
    const heading = this.tokens.children[index]
    if (heading.type !== "heading") {
      throw new Error("No Heading")
    }
    const textElement = heading.children[0]
    if (!textElement || textElement.type !== "text") {
      throw new Error("No Heading Text")
    }
    const title = textElement.value

    const sectionItems: AstElement[] = []
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
      // tokens.children に対するインデックス
      index,
      items: sectionItems,
    }
  }
}

export default TaskList
