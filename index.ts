#!/usr/bin/env -S deno run --allow-read --allow-write

import { toMarkdown } from "mdast-util-to-markdown"
import { fromMarkdown } from "mdast-util-from-markdown"
import type {
  List,
  ListItem,
  Paragraph,
  Root,
  Text,
  Heading,
} from "https://esm.sh/mdast-util-from-markdown@2.0.0/lib/index.d.ts"

import { Command } from "cliffy-command"
import { Input, prompt, Select } from "cliffy-prompt"
import TaskList from "./TaskList.ts"

// タスクを移動する
const shiftTask = (tokens: Root, id: string, step: number): Root => {
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

  throw new Error("Can't find task. ID: " + id)
}

const generateTaskId = () => Date.now()

const addTask = (tokens: Root, ...text: string[]): Root => {
  // heading 2 のセクションを探す
  const headingIndexes = tokens.children
    .map((token, i) => ({ i, token }))
    .filter(({ token }) => token.type === "heading" && token.depth === 2)
    .map(({ i }) => i)

  const headingIndex = headingIndexes.at(0)
  if (headingIndex === undefined) {
    throw new Error("There is no section")
  }

  // 一番上のセクションに追加する
  const firstList = tokens.children.find(
    (e, i): e is List =>
      e.type === "list" &&
      // heading の次のトークンから、次の heading の前のトークンまで
      i > headingIndex &&
      (headingIndexes[1] === undefined ? true : i < headingIndexes[1])
  )

  // タスクを追加する
  const taskId = generateTaskId()
  text.forEach((t, i) => {
    const newTaskText = {
      type: "text",
      value: `${taskId + i}: ${t}`,
    } satisfies Text

    const newParagraph = {
      type: "paragraph",
      children: [newTaskText],
    } satisfies Paragraph

    const newTask = {
      type: "listItem",
      checked: false,
      spread: false,
      children: [newParagraph],
    } satisfies ListItem

    // 最初のセクション内の最初のリストの最後に追加する
    // NOTE: とりあえずミュータブルにやる
    if (firstList) {
      firstList.children.push(newTask)
    } else {
      // 最初のセクションにリストがなければ、リストを作成する
      const newList = {
        type: "list",
        ordered: false,
        spread: false,
        children: [newTask],
      } satisfies List
      tokens.children.splice(headingIndex + 1, 0, newList)
    }
  })

  return tokens
}

const removeTask = (tokens: Root, id: string): Root => {
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
          // リストアイテムを削除して終了
          // NOTE: とりあえずミュータブルにやる
          // リストから消す
          list.children = list.children.filter((_, i) => i !== listIndex)
          return tokens
        }
      }
    }
  }

  return tokens
}

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

      if (args.length) {
        const newTokens = addTask(tokens, ...args)

        writeMarkdownIntoFile(newTokens, "tasks.md")
        return
      }

      const text = await promptTaskText()
      if (text === undefined) {
        throw new Error("No task text")
      }

      const newTokens = addTask(tokens, text)

      writeMarkdownIntoFile(newTokens, "tasks.md")
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

      const step = options.step * (options.backward ? -1 : 1)
      const newTokens = shiftTask(tokens, id, step)

      writeMarkdownIntoFile(newTokens, "tasks.md")
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
