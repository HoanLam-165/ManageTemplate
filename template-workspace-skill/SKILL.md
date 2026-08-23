# Template Workspace — Controlled Implementation Skill

## Purpose

This skill controls an AI implementation agent building the Template Workspace MVP.

The AI is an implementation agent, not the product owner.

The human owner makes product, architecture, scope, and acceptance decisions.

## Mandatory behavior

1. Work only on the assigned phase.
2. Never silently change architecture, schema, stack, product scope, or acceptance criteria.
3. Never implement future phases "because they are useful".
4. Prefer existing dependencies and project facilities.
5. Before adding a dependency, justify it.
6. If a decision affects architecture, persistence, schema, user-visible behavior, export, security, or compatibility: STOP and ask.
7. If a test fails, do not weaken the test or acceptance criteria.
8. At the end of every phase, produce the required evidence and STOP.
9. Do not declare a phase PASS if any mandatory gate fails.
10. Preserve locked decisions in `00-project-rules.md`.

## Authority order

1. Human decisions in the current conversation.
2. Locked decisions in this skill.
3. Current phase specification.
4. Existing code conventions.
5. AI implementation judgment.

If two requirements conflict, stop and report the conflict.

## Phase isolation

The agent may modify only files necessary for the current phase.

Do not:
- refactor unrelated code;
- redesign unrelated UI;
- add future features;
- add speculative abstractions;
- introduce a backend;
- introduce cloud services;
- introduce AI;
- replace the approved stack.

## Ambiguity rule

For implementation details that do not affect architecture, choose the simplest conventional solution and report it.

For architecture-affecting ambiguity:
- STOP;
- explain the ambiguity;
- list 2–3 options;
- recommend one;
- wait for approval.

## Change control

Every proposed change is classified as:

### A — Approved
Explicitly required by the current plan. Implement.

### B — Necessary implementation detail
Does not alter product/architecture decisions. Implement and report.

### C — Decision change
Changes architecture, schema, stack, scope, persistence, window behavior, export strategy, or user-visible rules.

For C:
STOP. Do not implement until approved.

## Dependency rule

Before adding a package:
1. Check whether existing code can solve the problem.
2. Check whether the package is actually required.
3. State the package name and purpose.
4. Confirm it does not conflict with the approved stack.
5. Add only when justified.

## Completion rule

A phase is complete only when:
- implementation is finished;
- required tests pass;
- acceptance criteria pass;
- no mandatory blocker remains;
- evidence is reported.

Then STOP.

Do not continue automatically.

## Required phase report

At the end of every phase report:

- Phase
- Summary
- Files created
- Files modified
- Dependencies added
- Commands executed
- Tests executed
- Test results
- Acceptance criteria status
- Known limitations
- Decisions requiring approval
- Final status: PASS / FAIL / BLOCKED

