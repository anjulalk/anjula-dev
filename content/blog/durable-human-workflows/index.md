+++
title = "Durable workflows for human waits"
slug = "durable-human-workflows"
date = 2026-09-17T12:00:00+05:30
description = "A workflow that stops to ask a person a question is hard to keep alive. Durable orchestration records the wait and resumes it without a hand-rolled state machine."
summary = "Durable orchestration records a human wait and resumes it without a hand-rolled state machine."
tags = ["dotnet", "azure", "distributed-systems", "workflow-automation"]
draft = false
images = ["images/durable-human-workflows.png"]
+++

A workflow gets difficult the moment it has to stop, ask a person something, and carry on later. The work is usually simple. The waiting is not, because the person may answer in ten seconds, tomorrow morning, or never.

Durable orchestration exists for that shape. Instead of holding a half finished request in memory, or rebuilding it from a status column, the orchestrator records what has happened, releases the compute while it waits, and replays safely when something new arrives.

## The example I keep coming back to

Document routing, from a service I worked on. A customer uploads a document, the service tries to file it automatically, and when it is not confident enough a reviewer picks a destination or rejects it. If nobody answers before the deadline, the case expires.

None of that is unusual, and the review screen is ordinary application code. The cost is in the resume. The first implementation of this grew a status column, a notification, an endpoint to accept the answer, a queue message, a worker that rebuilt context, and a scheduled job that found the cases nobody had answered. Each piece was reasonable on its own. Together they were the same workflow, spread across six places, and every crash meant asking which of them was now out of step.

What was missing was a place to keep the fact that this workflow is waiting at a particular point, without pretending the whole process is still alive in memory.

## The pieces

Durable Task SDKs give you that boundary. The orchestrator describes the order of decisions. A worker hosts the code that runs. The scheduler stores the state, the history and the timers.

| Part | What it does |
| --- | --- |
| Orchestrator | Decides what happens next: steps, waits, timers, branches. Must be deterministic. |
| Activity | Does one real thing: an API call, a database write, a file, a notification. |
| Client | Starts an instance, raises an event, asks for status. Never executes the workflow. |
| Task hub | Keeps instance state, history, timers and messages. |
| Worker | Hosts the orchestrator and activity code. |

The orchestrator is the brain and activities are the hands. The brain picks the next step; the hands touch the outside world. Put anything with a side effect in an activity.

{{< mermaid >}}
flowchart LR
    C["API or event source"] -->|"start, signal, query"| H[("Durable task hub")]
    H -->|"deliver work"| W["Worker and orchestrator"]
    W -->|"call"| A["Activity with I/O"]
    A -->|"record result"| H
{{< /mermaid >}}

That split is what lets the upload request return immediately after signalling the workflow. The reviewer answers hours later through a normal authenticated endpoint, and the scheduler makes sure the right instance wakes up.

## Why it can sleep without holding a server

Durable orchestration does not keep a suspended .NET stack in memory. It records every durable call. When an activity finishes, a timer fires or an event arrives, the runtime calls the orchestrator method again from the top and feeds the recorded results back from history.

{{< mermaid >}}
sequenceDiagram
    participant O as Orchestrator
    participant H as Task hub history
    participant A as Activity
    O->>H: Read saved inspection result
    H-->>O: Replay recorded result
    O->>H: Read review event
    H-->>O: Replay delivered decision
    O->>A: Route document as the first new step
    A-->>H: Record the outcome
{{< /mermaid >}}

Replay explains both the durability and the constraint. Orchestrator code has to behave the same way on every pass, which rules out a few things people reach for by reflex.

| Not in the orchestrator | Instead |
| --- | --- |
| `DateTime.UtcNow` | The context's current UTC time |
| `Guid.NewGuid()` | A replay safe id from the context |
| Direct HTTP, database or file calls | An activity |
| `Task.Delay` or `Thread.Sleep` | A durable timer |
| Reading mutable configuration inline | An activity that records the value |

Activities, on the other hand, can still be called twice. A failure can leave an external operation uncertain, so they need idempotency keys or a unique constraint behind them. What you get in return is a checkpoint: a completed activity replays from its stored result rather than calling the outside world again. A crash between durable steps is therefore unremarkable. A crash in the middle of an activity is the ordinary distributed systems problem, and it needs the ordinary distributed systems answers.

## The shape of the code

The routing flow below uses the case id as the instance id. It tries to categorise the document first. When the result is uncertain it notifies a reviewer and waits for whichever happens first: a decision, a cancellation, or the deadline.

{{< mermaid >}}
flowchart LR
    N["Needs review"] --> M["Notify reviewer"]
    M --> W{"Task.WhenAny"}
    T["Durable timer expires"] --> W
    R["Review event arrives"] --> W
    C["Cancellation event arrives"] --> W
    W -->|"timer wins"| E["Expire case"]
    W -->|"review wins"| D["Route document"]
    W -->|"cancel wins"| X["Close case"]
{{< /mermaid >}}

The activity implementations are left out on purpose. They are where the database access, the notification and the routing belong.

```csharp
using Microsoft.DurableTask;

public sealed class DocumentReviewOrchestrator
    : TaskOrchestrator<DocumentInput, WorkflowOutcome>
{
    public override async Task<WorkflowOutcome> RunAsync(
        TaskOrchestrationContext context,
        DocumentInput input)
    {
        var proposal = await context.CallActivityAsync<CategoryProposal>(
            nameof(InspectDocumentActivity), input);

        if (proposal.IsConfident)
            return await RouteAsync(context, input, proposal.Category);

        await context.CallActivityAsync(
            nameof(NotifyReviewerActivity),
            new ReviewRequest(context.InstanceId, input.Title, proposal.Candidates));

        context.SetCustomStatus("WaitingForReview");

        using var cts = new CancellationTokenSource();
        Task deadline = context.CreateTimer(TimeSpan.FromHours(24), cts.Token);
        Task<ReviewDecision> review = context.WaitForExternalEvent<ReviewDecision>(
            "review-submitted", cts.Token);
        Task<CancelRequest> cancel = context.WaitForExternalEvent<CancelRequest>(
            "review-cancelled", cts.Token);

        Task winner = await Task.WhenAny(deadline, review, cancel);
        cts.Cancel();

        if (winner == deadline)
            return await EndAsync(context, input.Id, "Expired");

        if (winner == cancel)
            return await EndAsync(context, input.Id, "Cancelled");

        ReviewDecision decision = await review;
        if (!decision.Approved)
            return await EndAsync(context, input.Id, "Rejected");

        return await RouteAsync(context, input, decision.Category);
    }

    private static async Task<WorkflowOutcome> RouteAsync(
        TaskOrchestrationContext context,
        DocumentInput input,
        string category)
    {
        await context.CallActivityAsync(
            nameof(RouteDocumentActivity), new RouteRequest(input.Id, category));
        await context.CallActivityAsync(
            nameof(SetCaseStatusActivity), new StatusChange(input.Id, "Routed"));
        return new WorkflowOutcome("Routed");
    }

    private static async Task<WorkflowOutcome> EndAsync(
        TaskOrchestrationContext context,
        string caseId,
        string status)
    {
        await context.CallActivityAsync(
            nameof(SetCaseStatusActivity), new StatusChange(caseId, status));
        return new WorkflowOutcome(status);
    }
}
```

The `cts.Cancel()` line is easy to skip and worth keeping. Once one wait wins, the others are cancelled with it, including the timer. An outstanding durable timer can stop an otherwise finished instance from ever reaching a completed state.

## The API stays ordinary

The reviewer endpoint has no workflow logic in it. It authorises the request, validates the payload, and signals the instance that is already waiting.

```csharp
using Microsoft.DurableTask.Client;

public static async Task<IResult> SubmitReview(
    string caseId,
    ReviewDecision decision,
    DurableTaskClient client)
{
    await client.RaiseEventAsync(caseId, "review-submitted", decision);
    return Results.Accepted();
}
```

That division is useful operationally as well. The API scales for short request and response work, workers scale for orchestration and activities, and the task hub is the handoff between them.

## Two kinds of state

The scheduler knows about pending, running, completed, failed and terminated. That is the runtime view, and it means very little to the person watching the queue. Support needs the business view: waiting for review, routed, rejected, expired, cancelled.

Write the business state deliberately, through an activity, and set a short custom status for operators. Then a dashboard can answer both questions without mixing them up: is the runtime still working on this, and what does this case mean for the business.

## What production adds

The orchestration above is short, but it does not remove the usual distributed systems work. It moves it to the boundaries where it belongs.

1. Use a stable instance id. A case, order or request id makes events, status queries, support links and retry rules point at the same instance.
2. Make activities idempotent. An idempotency key, a unique constraint or provider side deduplication, so a retry is safe.
3. Assume events arrive at least once. Carry an event id, ignore duplicates, and check that the user is allowed to act on the case before raising anything.
4. Keep the orchestrator deterministic, and read time, randomness and configuration through durable boundaries.
5. Cancel the losing waits as soon as a winner is chosen.
6. Version with in-flight instances in mind. They can replay old code paths, so either keep compatibility or drain them before a breaking change.
7. Treat history as operational data. Inputs, outputs, custom statuses and event payloads are persisted, so do not put anything sensitive in them without deciding how it will be stored, accessed and expired.

Retries belong on activities, usually around network calls, and they need a policy rather than a default: how many attempts, how long to wait, how to back off, and which state to move to when the budget is gone.

## Where it fits

Document routing is one shape. The pattern applies wherever a process pauses and a clear action resumes it.

| Situation | The wait | The event |
| --- | --- | --- |
| AI draft needs an editor | Approval or requested changes | `draft-reviewed` |
| Large order needs an exception | A fulfilment decision | `fulfillment-selected` |
| Data export needs sign off | Compliance approval | `export-approved` |
| Account recovery | Identity verification | `verification-complete` |

## When not to reach for it

A durable workflow is for long-lived coordination, not for everything asynchronous. Sending an email, refreshing a cache or running one background calculation is fine as a queue message and a worker.

It earns its place when several of these are true at once: the wait is measured in minutes, hours or days; a person or another service resumes a specific operation; the deadline has to survive restarts; support needs to see the history; and the steps must coordinate safely through retries and failure.

If the work is short, independent and fire and forget, a job queue is the lighter answer.

## Start with one wait

None of this requires rewriting an application. The first version can be narrow.

1. Pick a workflow that already waits on a person.
2. Give it a stable instance id and one orchestration method.
3. Put existing I/O behind activities instead of replacing the services that do the work.
4. Let the existing API raise an event rather than reissuing the original command.
5. Add the durable timer for the deadline and surface the business status for support.
6. Walk the happy path, a rejection, a cancellation, a timeout, a retry and a worker restart before going further.

Local emulation and a workflow dashboard make that practical. You can open an instance's history, stop a worker, start it again, and watch a pending review resume, which is a much better argument than a diagram.

## The shift

The part worth internalising is small. A human answer is not a detour that starts a fresh job. It is another event in the life of the same process.

Once the workflow owns that life, the code reads like the rule it implements: inspect, wait if needed, take the first valid answer, carry on. History, replay, timers and recovery stay with the scheduler, and the application code stays about the decision.

Links: [Durable Task SDK](https://learn.microsoft.com/azure/durable-task/sdks/durable-task-overview) · [Human interaction](https://learn.microsoft.com/azure/durable-task/common/durable-task-human-interaction) · [Orchestrator constraints](https://learn.microsoft.com/azure/durable-task/common/durable-task-code-constraints) · [Durable Task Scheduler](https://learn.microsoft.com/azure/durable-task/scheduler/durable-task-scheduler)
