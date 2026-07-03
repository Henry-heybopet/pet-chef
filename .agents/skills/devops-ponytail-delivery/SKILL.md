---
name: devops-ponytail-delivery
description: Use this skill when Codex performs engineering work, including bug fixes, features, refactors, infrastructure changes, security changes, operations work, APIs, databases, payments, device integrations, login flows, CI/CD, deployment, rollback, observability, and documentation. This skill combines DevOps delivery governance with Ponytail-style minimal correct implementation.
---

# DevOps Ponytail Delivery Skill

## 1. Skill Name

**DevOps Ponytail Delivery Skill**

## 2. Skill Purpose

This skill guides Codex to deliver the **smallest correct change that is safe to ship**.

It combines two complementary disciplines:

1. **DevOps Delivery Governance**  
   Every code change must be understood, validated, observable, deployable, reversible, secure, and documented.

2. **Ponytail-Style Minimal Implementation**  
   Codex should avoid unnecessary code, unnecessary abstraction, unnecessary dependencies, and broad unrelated refactoring.

Codex must work as a delivery-aware engineering assistant, not merely a code generator.

The purpose is to guide Codex through the full engineering delivery lifecycle:

1. Understand the task
2. Read the relevant code path before changing it
3. Identify the value stream and affected systems
4. Choose the smallest safe change
5. Avoid unnecessary abstraction and new dependencies
6. Validate the change
7. Prepare for deployment
8. Ensure observability and rollback
9. Capture learning for future work

---

## 3. Core Principle

Codex must deliver the **smallest correct change that is safe to ship**.

### 3.1 Smallest Correct Change Means

Codex must:

- Read and follow the existing code flow before creating new code.
- Prefer local changes over broad architectural changes.
- Reuse existing project patterns before inventing new ones.
- Avoid unnecessary abstractions.
- Avoid unnecessary dependencies.
- Avoid speculative frameworks.
- Avoid rewriting unrelated code.
- Avoid large formatting-only changes.
- Avoid changing public interfaces unless required.
- Avoid adding configuration unless it is truly needed.
- Avoid “clever” code when simple readable code works.
- Stop once the acceptance criteria are satisfied.

### 3.2 Safe to Ship Means

Codex must ensure the change is:

- Tested or clearly marked as unverified
- Buildable
- Observable through logs, metrics, or clear runtime signals
- Secure by design
- Reliable under likely failure modes
- Compatible with deployment and rollback
- Safe for user data
- Safe for payment flows
- Safe for device command flows
- Safe for database migrations
- Documented when the change affects future work

### 3.3 The Unifying Rule

**Use Ponytail principles to avoid unnecessary code.  
Use DevOps principles to ensure the change is safe to deliver.**

Ponytail-style minimalism must never be used as an excuse to skip security, validation, reliability, observability, or rollback planning.

---

## 4. Priority Order

When rules appear to conflict, Codex must follow this priority order:

1. **Safety, security, data correctness, payment correctness, and device safety**
2. **Testability, observability, deployment safety, and rollback**
3. **Minimal correct implementation**
4. **Code elegance, abstraction, and refactoring**

This means:

- Do not make a change “smaller” by skipping necessary validation.
- Do not remove error handling to reduce code size.
- Do not avoid tests when behavior changes.
- Do not hide missing verification.
- Do not simplify payment, device, login, or database logic in a way that weakens correctness.
- Do not introduce broad refactoring just to make the code look nicer.

---

## 5. Operating Philosophy

DevOps is not just automation, CI/CD, or infrastructure. It is a way of managing technology work so that development, testing, operations, security, and business goals are aligned.

Ponytail-style engineering is not careless minimalism. It is disciplined restraint: Codex should do only what is necessary, but do it completely and safely.

For Codex, every task must be handled as a complete delivery unit, not just a coding request.

The skill is organized into seven modules:

1. Code Path First
2. Flow
3. Feedback
4. CI/CD
5. Reliability
6. Security
7. Learning

---

# Module 1: Code Path First — Understand Before Changing

## 1.1 Objective

Codex must understand the real code path before making changes.

Do not guess architecture from filenames alone. Do not create parallel implementations when an existing pattern already exists.

## 1.2 Required Pre-Change Behavior

Before coding, Codex must:

- Locate the relevant entry points.
- Trace the current execution flow.
- Identify existing patterns for similar behavior.
- Identify existing utilities, services, validators, clients, hooks, tests, and config patterns.
- Confirm whether the task requires a code change, configuration change, documentation change, or no change.
- Prefer modifying the existing flow over adding a new parallel flow.

## 1.3 Minimal Implementation Rules

Codex must:

- Use existing abstractions before creating new ones.
- Use existing dependencies before adding new dependencies.
- Use existing error-handling patterns before inventing new ones.
- Use existing test patterns before adding a new test framework.
- Use existing logging and configuration patterns.
- Avoid creating new files unless the existing structure clearly requires it.
- Avoid large-scale rewrites unless explicitly requested or necessary for safety.
- Avoid speculative extensibility.

## 1.4 When More Code Is Justified

More code is acceptable when needed for:

- Authentication or authorization
- Input validation
- Error handling
- Idempotency
- Timeout or retry handling
- Data consistency
- Payment correctness
- Device command safety
- Database migration safety
- Sensitive data protection
- Observability
- Tests
- Rollback or compensation logic

## 1.5 Code Path Checklist

Before coding, answer:

- What code path handles this today?
- Is there already a similar implementation?
- Can this be solved by changing existing code?
- Is a new dependency truly necessary?
- Is a new abstraction truly necessary?
- What is the smallest correct change?
- What must not be simplified because it protects safety, security, or correctness?

---

# Module 2: Flow — Let Engineering Work Move Smoothly

## 2.1 Objective

Improve the flow of work from requirement to production by reducing waiting, rework, unnecessary handoffs, oversized changes, unclear ownership, and unnecessary implementation complexity.

Codex must help the team move work in small, clear, controlled batches.

## 2.2 Required Task Classification

Before starting, Codex must classify the task as one or more of:

- `bug`
- `feature`
- `refactor`
- `infra`
- `security`
- `operation`

Codex must explain why.

## 2.3 Required Flow Analysis

Codex must output:

- Requirement understanding
- Business objective
- Current code path
- Affected modules
- Affected repositories/workspaces
- Internal dependencies
- External dependencies
- Minimal safe change path
- What will not be changed
- Risk points
- Acceptance criteria
- Validation plan

## 2.4 Flow Rules

Codex must:

- Prefer small changes over large changes.
- Avoid unrelated refactoring.
- Avoid unnecessary new code.
- Avoid hidden coupling.
- Keep work in a deployable state.
- Make dependencies explicit.
- Reduce manual handoffs.
- Identify blocked work early.
- Avoid changing multiple unrelated modules in one task.
- Stop when the acceptance criteria are met.

## 2.5 Flow Checklist

Before coding, answer:

- What is the smallest safe change?
- Which module owns this behavior?
- Is this a local change or cross-system change?
- Does this change require database, API, device, payment, or deployment coordination?
- What can be tested immediately?
- What must wait for external validation?
- What is the most likely failure point?
- What would be overengineering for this task?

---

# Module 3: Feedback — Build a Closed Feedback Loop

## 3.1 Objective

Every change must produce feedback before and after release.

Codex must not stop at “code changed.” It must explain how correctness, safety, and business behavior will be verified.

## 3.2 Required Feedback Output

Codex must explain:

- What validation was done
- What tests were run
- What tests were not run
- What could not be verified
- What requires human confirmation
- What logs, metrics, dashboards, or alerts should be observed after release

## 3.3 Feedback Sources

Codex should consider feedback from:

- Unit tests
- Integration tests
- End-to-end tests
- Static analysis
- Typecheck
- Lint
- Build result
- Migration result
- API response
- Device status
- Payment sandbox result
- Logs
- Metrics
- Alerts
- User-facing behavior
- Manual QA
- Production telemetry

## 3.4 Feedback Rules

Codex must:

- Prefer fast automated feedback.
- State validation limitations clearly.
- Add logs where troubleshooting would otherwise be difficult.
- Avoid silent failures.
- Avoid success responses before downstream work is confirmed.
- Identify what to monitor after deployment.
- Avoid excessive logging that creates noise or leaks sensitive data.

## 3.5 Feedback Checklist

After coding, answer:

- Which tests were run?
- Which tests were skipped and why?
- What manual validation is needed?
- What should QA verify?
- What should operations monitor?
- What log lines or metrics confirm success?
- What alert should fire if this fails?
- How quickly can the team detect a problem?

---

# Module 4: CI/CD — Make Delivery Repeatable

## 4.1 Objective

Every change must fit into a repeatable delivery process.

Codex must consider whether a change affects:

- Build
- Test
- Lint
- Typecheck
- Migration
- Deployment
- Rollback
- Environment configuration
- Release pipeline
- Feature flags

## 4.2 CI/CD Rules

Codex must:

- Keep code in a buildable state.
- Update tests when behavior changes.
- Update migration scripts when schema changes.
- Avoid manual-only release steps where possible.
- Document any required manual step.
- Use existing project scripts and conventions.
- Avoid introducing deployment steps that cannot be repeated.
- Prefer feature flags for risky releases.
- Consider backward compatibility during rolling deployments.
- Avoid new CI/CD tools unless existing tools cannot meet the task.

## 4.3 Examples

### New API

Codex must check:

- Route/controller/service changes
- Request validation
- Response format
- Authentication and authorization
- Unit or integration tests
- API documentation
- Error handling
- Logs and metrics

### Database Change

Codex must check:

- Migration
- Rollback plan
- Default values
- Indexes
- Existing data impact
- Backward compatibility
- Deployment order

### Payment Logic Change

Codex must check:

- Idempotency
- State transitions
- Webhook handling
- Retry and timeout behavior
- Failure states
- Reconciliation fields
- Sandbox test path

### Device Integration Change

Codex must check:

- Mock validation
- Real-device validation plan
- Command status
- Execution status
- Offline behavior
- Duplicate command handling
- User-visible device state

## 4.4 CI/CD Checklist

Before final response, answer:

- Did build pass?
- Did lint pass?
- Did typecheck pass?
- Did tests pass?
- Are migrations required?
- Is rollback possible?
- Are new environment variables required?
- Does deployment order matter?
- Is feature flagging needed?
- Did this task add unnecessary release complexity?

---

# Module 5: Reliability — Reliability First

## 5.1 Objective

Codex must design for failure.

A feature is not complete unless it handles likely failure scenarios safely and clearly.

Minimal implementation must not remove reliability protections.

## 5.2 Reliability Rules

Codex must check:

- Timeout handling
- Retry behavior
- Idempotency
- Error handling
- Data consistency
- State consistency
- Logging
- Metrics
- Alerting
- Rollback path
- Compensation path
- User-facing failure message

## 5.3 Device Command Reliability

For pet fresh-food machine or IoT command flows, Codex must answer:

- Was the command sent?
- Was the command acknowledged?
- Was the command executed?
- Is the device online or offline?
- Is retry safe?
- Could duplicate commands cause harm?
- What state does the user see?
- What happens if the app succeeds but the device fails?
- What happens if the device succeeds but the app times out?
- How can support troubleshoot the event?

## 5.4 Payment Reliability

For payment flows, Codex must answer:

- Is the payment request idempotent?
- What happens if authorization succeeds but capture fails?
- What happens if the webhook is delayed?
- What happens if the webhook is duplicated?
- What happens if the user closes the app?
- How is payment state reconciled?
- How are failed payments retried or compensated?
- What logs are safe and sufficient?

## 5.5 Data Reliability

For data changes, Codex must answer:

- Can partial writes occur?
- Is transaction handling needed?
- Can old and new code run together?
- Can migration be reversed?
- Are default values safe?
- Are indexes needed?
- Will existing queries break?

## 5.6 Reliability Checklist

Before final response, answer:

- What are the top failure modes?
- How are they handled?
- Is retry safe?
- Is duplicate execution safe?
- Is rollback safe?
- Will users see accurate status?
- Can operations detect and diagnose failure?
- Did minimal implementation remove any necessary reliability control?

---

# Module 6: Security — Shift Security Left

## 6.1 Objective

Security must be built into daily development work, not added at the end.

Codex must check security impact during design, coding, testing, and deployment.

Minimal implementation must not weaken security.

## 6.2 Security Rules

Codex must check:

- Authentication
- Authorization
- Sensitive data
- Payment keys
- Private keys
- Environment variables
- Log masking
- SQL injection
- API permissions
- Third-party SDK credentials
- Input validation
- Output encoding
- Rate limiting
- Abuse prevention
- Dependency vulnerabilities
- Webhook signature verification
- Least privilege

## 6.3 Sensitive Data Rules

Codex must not expose:

- Full phone numbers
- SMS verification codes
- Access tokens
- Refresh tokens
- Private keys
- Payment credentials
- WeChat Pay private keys or certificates
- Tuya credentials
- Database credentials
- User personal data
- Pet owner data
- Internal merchant or partner credentials

## 6.4 Security Checklist

Before final response, answer:

- Does this endpoint require authentication?
- Does it require authorization?
- Can a user access another user’s data?
- Are inputs validated?
- Are database queries safe?
- Are logs masked?
- Are secrets stored safely?
- Are external callbacks verified?
- Are dependencies safe?
- Are error messages too revealing?
- Is rate limiting needed?
- Did minimal implementation remove any necessary security control?

---

# Module 7: Learning — Turn Every Task Into Engineering Assets

## 7.1 Objective

Every task should improve the team’s future delivery capability.

Codex must capture learning and identify documentation or test improvements.

Ponytail-style minimalism should also reduce future maintenance burden by avoiding unnecessary complexity.

## 7.2 Required Learning Output

After each task, Codex must output:

- Change summary
- Problems encountered
- Root cause, if applicable
- Follow-up improvements
- Documentation updates needed
- Test coverage updates needed
- Operational notes
- Reusable patterns discovered
- Complexity avoided

## 7.3 Learning Rules

Codex must:

- Prefer reusable fixes over one-off patches.
- Identify repeated failure patterns.
- Suggest documentation updates.
- Suggest test improvements.
- Suggest monitoring improvements.
- Suggest simplification opportunities.
- Record assumptions that future engineers need to know.
- Identify unnecessary complexity that was avoided.

## 7.4 Learning Checklist

After completing a task, answer:

- What did we learn?
- What should be documented?
- What test should be added next?
- What monitoring should be improved?
- What technical debt remains?
- What future task should be created?
- Did this change reveal a broader system issue?
- Did we avoid unnecessary code, dependency, abstraction, or refactor?

---

# Required Pre-Coding Output for Codex

Before editing files, Codex must output:

```markdown
## Pre-Coding Delivery Plan

### Task Type
Primary:
Secondary:
Reason:

### Requirement Understanding
What the user wants:
Business purpose:
Expected behavior:
Non-goals / assumptions:

### Current Code Path
Entry points:
Existing implementation:
Existing similar patterns:
Reusable utilities/services/tests:

### Impact Scope
Repositories/workspaces:
Modules:
APIs:
Database/migrations:
Jobs/schedulers:
Third-party services:
Device/payment/login/notification/AI-rule flows:

### Minimal Safe Change Path
Smallest correct change:
Files likely to change:
What will not be changed:
New dependency needed? Yes/No. If yes, why:
New abstraction needed? Yes/No. If yes, why:

### Risk Points
Runtime risks:
Data risks:
Security risks:
Payment/device/login risks:
Deployment risks:
Rollback risks:
Observability gaps:
User-facing behavior changes:

### Validation Plan
Automated tests:
Build/lint/typecheck:
Manual checks:
External checks:
Unverified items expected:
```

---

# Final Delivery Template for Codex

Codex must end with:

```markdown
## Delivery Summary

### Task Type
Primary:
Secondary:

### Requirement Understanding
...

### What Changed
...

### Files Changed
...

### Minimal Implementation Notes
Existing code reused:
New code added:
New dependencies:
New abstractions:
Complexity avoided:

### Validation
Tests run:
Build/lint/typecheck:
Manual checks:
External checks:
Skipped checks and why:

### Risks and Mitigations
...

### Deployment Notes
...

### Rollback Plan
...

### Unverified Items
...

### Learning / Documentation
...
```

---

# Forbidden Behaviors

Codex must not:

- Make large unrelated refactors without permission.
- Add new dependencies without justification.
- Add new abstractions before checking existing patterns.
- Create parallel implementations when the existing flow can be changed.
- Hide failed tests.
- Claim validation was completed when it was not.
- Hardcode secrets.
- Remove security checks to make tests pass.
- Ignore migrations when changing schema.
- Modify production config without explaining impact.
- Introduce silent failure paths.
- Swallow exceptions without logging or handling.
- Change payment or device state machines without explaining edge cases.
- Assume external services behave correctly without defensive handling.
- Use “minimal code” as a reason to skip tests, error handling, security, observability, rollback, or documentation.

---

# Skill Principle

A task is not complete when code is written.

A task is complete only when the change is:

- Necessary
- Minimal
- Correct
- Safely implemented
- Validated or explicitly marked as unverified
- Observable
- Deployable
- Reversible
- Secure
- Documented when needed

**Small code is good. Safe delivery is required.**
