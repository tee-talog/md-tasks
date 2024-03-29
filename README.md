# md-tasks

Markdown ベースの最高にシンプルなタスク管理ツール

## Features

* Markdown で書かれたタスクリストの操作

## Command-line Options

`mdt --help` を実行すると、詳細なヘルプが表示されます

```
Usage:   md-tasks
Version: 1.0.0

Description:

  Simple task management tool based on Markdown

Options:

  -h, --help     - Show this help.
  -V, --version  - Show the version number for this program.

Commands:

  add     [text...]  - add task to first section
  shift   [id]       - shift existing task
  remove  [id]       - remove task
  init               - initialize task list
```

## Installation

```bash
wget https://github.com/tee-talog/md-tasks/releases/download/1.0.0/mdt
chmod +x mdt
```

## License
The MIT License
