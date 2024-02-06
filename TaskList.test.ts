import { assertNotEquals } from "https://deno.land/std@0.214.0/assert/mod.ts"
import TaskList from "./TaskList.ts"

Deno.test("first test", () => {
  const taskList = new TaskList({ type: "root", children: [] })
  assertNotEquals(taskList, null)
})
