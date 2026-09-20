# AGENTS.md

このリポジトリで作業するAIエージェントは、最初に `CLAUDE.md` をすべて読んでください。

次の作業候補は `docs/next-tasks.md` にあります。`tools/統合ツール/` を変更する場合は、同ディレクトリの `AGENTS.md` も先に読み、生成物を直接編集しないでください。

## オーケストレーション

作業開始前に [docs/agent-orchestration.md](docs/agent-orchestration.md) を必ず読み、親エージェントが計画・統合、子エージェントが実行を担当する分担に従う。Codex/GPT の実行担当は `gpt-5.6-luna` / `max`、Claude Code の実行担当は `repo-executor`（Sonnet / `high`）を使う。
