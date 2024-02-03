#!/usr/bin/env -S deno run --allow-read --allow-write

import { toMarkdown } from "mdast-util-to-markdown"
import { fromMarkdown } from "mdast-util-from-markdown"
import type {
  List,
  Root,
  Heading,
} from "https://esm.sh/mdast-util-from-markdown@2.0.0/lib/index.d.ts"

import { Command } from "cliffy-command"
import { Input, prompt, Select } from "cliffy-prompt"
import TaskList from "./TaskList.ts"

const writeMarkdownIntoFile = (tokens: Root, path: string) => {
  const str = toMarkdown(tokens)
  Deno.writeTextFileSync(path, str)
}

const promptSelectTaskId = async (tokens: Root) => {
  // heading 2 のセクションを探す
  const headings = tokens.children
    .map((token, index) => ({ index, token }))
    .filter(
      (e): e is { index: number; token: Heading } =>
        e.token.type === "heading" && e.token.depth === 2
    )

  // それぞれのセクションについて探索する
  const tasks = new Map<string, { id: string; text: string }[]>()
  for (
    let headingIndexesIndex = 0;
    headingIndexesIndex < headings.length;
    headingIndexesIndex++
  ) {
    const headingIndex = headings[headingIndexesIndex].index
    const lists = tokens.children.filter(
      (e, i): e is List =>
        e.type === "list" &&
        // heading の次のトークンから、次の heading の前のトークンまで
        i > headingIndex &&
        (headings[headingIndexesIndex + 1] === undefined
          ? true
          : i < headings[headingIndexesIndex + 1].index)
    )

    const tasksOfList: { id: string; text: string }[] = []
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

        const [taskId, ...taskText] = text.value.split(":")
        tasksOfList.push({ id: taskId.trim(), text: taskText.join(":").trim() })
      }
    }

    const headingText = headings[headingIndexesIndex].token.children[0]
    if (headingText.type !== "text") {
      throw new Error("There is no text")
    }
    tasks.set(headingText.value, tasksOfList)
  }

  const options = [...tasks.entries()].flatMap(
    ([sectionText, sectionTasks]) => [
      Select.separator(""),
      Select.separator(`## ${sectionText}`),
      ...sectionTasks.map((e) => `${e.id}: ${e.text}`),
    ]
  )
  const result = await prompt([
    {
      name: "ids",
      message: "Select Task",
      type: Select,
      options,
      transform: (value) => value.split(":")[0],
    },
  ])
  return result.ids
}

const promptTaskText = async () => {
  const result = await prompt([
    {
      name: "text",
      message: "Input Task Text",
      type: Input,
    },
  ])
  return result.text
}

const main = async () => {
  const commandAdd = await new Command()
    .description("add task to first section")
    .arguments("[text...:string]")
    .action(async (_, ...args) => {
      const file = Deno.readTextFileSync("tasks.md")
      const tokens = fromMarkdown(file)

      const taskList = new TaskList(tokens)
      const id = Date.now()
      if (args.length) {
        // 引数で指定された場合
        const ids = args.map((text, i) => taskList.addItem(id + i + "", text))

        if (args.length === 1) {
          console.log(`Added: ${ids[0]}`)
        } else {
          console.log(`Added ${args.length} tasks.\n${ids.join(", ")}`)
        }
      } else {
        // 引数で指定されていない場合、プロンプトで入力してもらう
        const text = await promptTaskText()
        if (text === undefined) {
          throw new Error("No task text")
        }

        taskList.addItem(id + "", text)
        console.log(`Added: ${id}: ${text}`)
      }

      const ast = taskList.toAst()
      writeMarkdownIntoFile(ast, "tasks.md")
    })

  const commandShift = await new Command()
    .description("shift existing task")
    .option("-b, --backward", "backward shift", { default: false })
    .option("-s, --step <step:number>", "shift step", { default: 1 })
    .arguments("[id:string]")
    .action(async (options, ...args) => {
      const file = Deno.readTextFileSync("tasks.md")
      const tokens = fromMarkdown(file)
      const id = args[0] ?? (await promptSelectTaskId(tokens))

      if (id === undefined) {
        throw new Error("Task ID is not specified")
      }

      const taskList = new TaskList(tokens)
      // 現在地とオプションから、移動先を決める
      const fromSectionIndex = taskList.getSectionIdByTaskId(id)
      const step = options.step * (options.backward ? -1 : 1)
      const toSectionIndex = fromSectionIndex + step

      taskList.shiftItem(id, toSectionIndex)

      const ast = taskList.toAst()
      writeMarkdownIntoFile(ast, "tasks.md")
    })

  const commandRemove = await new Command()
    .description("remove task")
    .arguments("[id:string]")
    .action(async (_, ...args) => {
      const file = Deno.readTextFileSync("tasks.md")
      const tokens = fromMarkdown(file)
      const id = args[0] ?? (await promptSelectTaskId(tokens))

      if (id === undefined) {
        throw new Error("Task ID is not specified")
      }

      const taskList = new TaskList(tokens)
      const removed = taskList.removeItem(id)
      console.log(`Removed: ${removed.id}: ${removed.text}`)

      const ast = taskList.toAst()
      writeMarkdownIntoFile(ast, "tasks.md")
    })

  await new Command()
    .name("md-tasks")
    .version("0.0.0")
    .description("Simple task management tool based on Markdown")
    // subcommand
    .command("add", commandAdd)
    .command("shift", commandShift)
    .command("remove", commandRemove)
    // parse
    .parse(Deno.args)
}

main()
