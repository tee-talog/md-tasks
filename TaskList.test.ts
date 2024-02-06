import {
  assertNotEquals,
  assertEquals,
  assertThrows,
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
})
