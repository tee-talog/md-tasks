import {
  assertNotEquals,
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
