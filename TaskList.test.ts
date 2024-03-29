import {
  assertEquals,
  assertThrows,
  assertStringIncludes,
} from "https://deno.land/std@0.214.0/assert/mod.ts"
import { describe, it } from "https://deno.land/std@0.214.0/testing/bdd.ts"

import { fromMarkdown } from "mdast-util-from-markdown"

import TaskList from "./TaskList.ts"

const token = (strs: TemplateStringsArray, ...args: string[]) => {
  const res: string[] = []
  for (let i = 0; i < strs.length; i++) {
    const s = (strs[i] ?? "") + (args[i] ?? "")
    res.push(s)
  }
  return fromMarkdown(res.join(""))
}

describe("toAst", () => {
  it("mdast の AST が出力されること", () => {
    const tokens = token`
# sections
## section 1
* list item 1
* list item 2

## section 2
## section 3
text`
    const taskList = new TaskList(tokens)
    assertEquals(taskList.toAst(), tokens)
  })
})

describe("addItem", () => {
  it("セクションがないとき、エラーをスローすること", () => {
    const taskList = new TaskList(token``)
    assertThrows(() => taskList.addItem("a", "text 1"))
  })

  it("セクションを指定しないとき、最初のセクションに追加されること", () => {
    const taskList = new TaskList(token`
## first
## second`)
    taskList.addItem("b", "text 2")

    assertEquals(taskList.toAst().children[1].type, "list")
  })

  it("「ID: text」というフォーマットで追加されること", () => {
    const taskList = new TaskList(token`## first`)
    taskList.addItem("c", "text 3")

    assertEquals(
      (taskList.toAst() as any).children[1].children[0].children[0].children[0]
        .value,
      "c: text 3"
    )
  })

  it("セクションを指定したとき、該当のセクションに追加されること", () => {
    const taskList = new TaskList(token`
## first
## second`)
    taskList.addItem("d", "text 4", 1)

    assertEquals(taskList.toAst().children[2].type, "list")
  })

  it("リストが存在するとき、そのリストの最後に追加されること", () => {
    const taskList = new TaskList(token`
## first
* item 1`)
    taskList.addItem("e", "text 5")

    assertStringIncludes(
      (taskList.toAst() as any).children[1].children.at(-1).children[0]
        .children[0].value,
      "text 5"
    )
  })
})

describe("shiftItem", () => {
  describe("該当のセクションにタスクが移動されること", () => {
    it("元のセクションから削除されること", () => {
      const taskList = new TaskList(token`
## first
* shift-id1: item 1
* shift-id2: item 2
## second`)

      taskList.shiftItem("shift-id1", 1)
      assertEquals(
        (taskList.toAst() as any).children[1].children.some((item: any) =>
          item.children[0].children[0].value.includes("shift-id1")
        ),
        false
      )
    })

    it("移動先のセクションにタスクが移動されること", () => {
      const taskList = new TaskList(token`
## first
* shift-id3: item 3
* shift-id4: item 4
## second`)

      taskList.shiftItem("shift-id3", 1)
      assertEquals(
        (taskList.toAst() as any).children[3].children.some((item: any) =>
          item.children[0].children[0].value.includes("shift-id3")
        ),
        true
      )
    })
  })
})

describe("removeItem", () => {
  it("削除されること", () => {
    const taskList = new TaskList(token`
## first
* remove-id1: item 1
* remove-id2: item 2
## second`)

    taskList.removeItem("remove-id1")
    assertEquals(
      (taskList.toAst() as any).children[1].children.some((item: any) =>
        item.children[0].children[0].value.includes("remove-id1")
      ),
      false
    )
  })

  describe("削除したタスクの情報を返すこと", () => {
    it("Task ID", () => {
      const taskList = new TaskList(token`
## first
* remove-id3: item 3
* remove-id4: item 4
## second`)

      const res = taskList.removeItem("remove-id3")
      assertEquals(res.id, "remove-id3")
    })

    it("Text", () => {
      const taskList = new TaskList(token`
## first
* remove-id3: item 3
* remove-id4: item 4
## second`)

      const res = taskList.removeItem("remove-id4")
      assertEquals(res.text, "item 4")
    })
  })
})

describe("getSectionIdByTaskId", () => {
  it("最初のセクションに存在するとき", () => {
    const taskList = new TaskList(token`
## first
* id1: item 1
## second`)
    const num = taskList.getSectionIdByTaskId("id1")
    assertEquals(num, 0)
  })

  it("最後のセクションに存在するとき", () => {
    const taskList = new TaskList(token`
## first
* id1: item 1
## second
* id2: item 2
`)
    const num = taskList.getSectionIdByTaskId("id2")
    assertEquals(num, 1)
  })
})
