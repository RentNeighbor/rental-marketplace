@AGENTS.md

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For simple pre-checks: compile as you plan, run file subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user, update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for the relevant project

### 4. Verification Before Done
- Never mark a task complete before verifying it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Complexity Balance
- Don't over-engineer: ask "is there a more elegant way?"
- If a fix feels hacky: "knowing everything I know now, implement the elegant solution"
- Bias for simple, obvious things — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Finish failing CI tests without being told how

---

## Task Management

1. **Plan First** — Write plan to `tasks/todo.md` with checkable items
2. **Verify Planner** — Check in before starting implementation
3. **Track Progress** — Mark items complete as you go
4. **Display Changes** — High-level summary at each step
5. **Adapt Changes** — Add review section to `tasks/review.md`
6. **Capture Lessons** — Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First** — Make every change as simple as possible. Impart minimal code.
- **Be Laconic** — Flat out casual. No fluff. Terse. Senior developer standards.
- **Be Decisive** — Changes should only touch what's necessary. Avoid introducing bugs.
