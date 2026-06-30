# Mission

**Role in ecosystem:** Plan and execute multi-phase operations  
**Primary verb:** Executes

---

## In one sentence

Mission is the operational environment where teams plan, simulate, rehearse, and execute complex multi-phase operations — replacing fragmented coordination tools with a single shared environment designed for the work.

---

## The problem

A complex operation — a military exercise, an emergency response, an industrial shutdown, a large-scale training event — involves many people, many assets, many dependencies, and a sequence of phases that must be coordinated precisely.

Today, that coordination lives across: WhatsApp groups, email threads, Microsoft Teams calls, printed maps, verbal briefings, and individual memory. The people responsible for the operation have no shared representation of it. The plan exists in separate places for separate people. When something changes, there is no reliable way to ensure everyone has the updated picture.

The consequence is predictable: coordination failures at the moment of execution. The team that was briefed yesterday didn't hear about the change made this morning. The asset that was supposed to be at position A is at position B. The phase that was supposed to start at 0800 started at 0900 because no one confirmed readiness.

The deeper problem is that planning and execution are treated as separate activities. The plan — created in a briefing room — exists separately from the execution. When execution diverges from the plan, there is no mechanism for capturing that divergence and learning from it.

Mission exists because operations of consequence deserve an environment that was designed for them.

---

## Who it's for

**Mission commanders and operation managers** who own the outcome. They design the operation, define the phases, assign assets and personnel, and monitor execution. They need to see the full picture at all times.

**Field operators and team leads** who execute. They need to know what they are responsible for, what comes before and after their role, and what the current status of the operation is — in real time.

**Training coordinators and exercise designers** who create scenarios for teams to train against. They need to build realistic mission scenarios, insert complications, and capture team performance for debrief.

**Analysts and planners** who work in the preparation phase — running simulations, stress-testing the plan, identifying dependencies and failure points before execution begins.

---

## What it does

**Mission structure.** A mission in Mission is a structured artefact — not a document, not a presentation. It has phases, objectives, assets, personnel assignments, timelines, and dependencies. Every element is explicit and connected to the others.

**Simulation.** Before a team executes a mission, they can run it. Mission plays the operation forward in time against a Twin environment, exposing timing conflicts, resource contention, and sequencing problems before they happen in the field. Simulation is not optional — it is the mechanism by which Mission pays for itself.

**Shared situational awareness.** During execution, every participant in a mission sees the same operational picture — current phase, task statuses, asset positions, timeline. Updates made by one participant are visible to all others in real time. There is one version of the truth.

**Task management and handoffs.** Each phase of a mission contains tasks. Tasks have owners, dependencies, and status. When a task is complete, the next task's owner is notified. The mission advances through its phases as task completion is confirmed — not assumed.

**Debrief and learning.** After execution, Mission generates a complete record of what happened: timeline of events, deviations from the plan, task completion times, decision points. This record is the input to the post-operation debrief and to future planning.

**Template library.** Missions that have been executed can be templated. Common operation types — site inspection, emergency response protocol, training exercise — become reusable starting points for new missions.

---

## What it is not

Mission is not a project management tool. It is not Jira, Asana, or Monday.com adapted for field operations. Project management assumes stable, predictable work sequences. Mission assumes dynamic, time-critical operations where the situation changes and the team must adapt.

Mission is not a communication tool. It does not replace radio, phone, or chat. It provides shared operational context; communication happens through existing channels.

Mission is not only for military use. The same coordination problem exists in emergency response, large industrial operations, infrastructure maintenance, and high-stakes training environments. The language of "mission" is intentional — it describes any operation with a defined objective, a team, assets, and a timeline.

---

## In the ecosystem

Mission is the operational layer. It sits above infrastructure (Forge) and models (Twin), and produces the data that Insight analyses.

**→ Twin** provides the environment Mission operates within. A mission is planned and simulated against a Twin model of the operational area. During execution, the Twin reflects the real-time state of the physical environment — and Mission updates when the environment changes.

**→ Workstation** is where mission commanders and operators work during execution. Workstation brings the Mission interface, the Twin view, and the Insight data into a single spatial environment.

**→ Insight** receives the operational data generated during mission execution — task timelines, deviations, decision points, sensor triggers. This data feeds post-mission analysis and informs future mission planning.

**→ Lab** is where mission scenarios are tested before they are used with real teams. Exercise designers build the scenario in Lab, run it with simulated participants, and validate the timing and logic before a live exercise.

**→ Forge** provides the infrastructure state that Mission depends on. A mission plan references specific assets and systems — those assets are managed by Forge, and their configuration state is available to Mission.

---

## Roadmap

**Phase 1 — Mission planning and execution log**  
Structured mission model: phases, objectives, tasks, assignments, timeline. Real-time task status during execution. Post-mission log and debrief export.

**Phase 2 — Simulation and shared situational awareness**  
Mission simulation against Twin environments. Real-time shared operational picture for all participants. Live status updates and phase transitions.

**Phase 3 — Debrief intelligence**  
Structured post-mission analysis. Deviation detection — what deviated from the plan, when, and by how much. Timeline comparison: planned vs. executed. Integration with Insight for cross-mission pattern analysis.

**Phase 4 — AI co-planner**  
Mission suggests optimisations during planning — identifying bottlenecks, flagging dependencies that create risk, recommending sequencing based on past mission data. During execution, Mission surfaces anomalies that suggest the operation is deviating from expectations.
