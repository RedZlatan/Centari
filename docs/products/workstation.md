# Workstation

**Role in ecosystem:** Unified environment for serious operational work  
**Primary verb:** Integrates

---

## In one sentence

Workstation is the environment where Centari professionals do their work — a unified, spatially-aware interface that brings together Twin, Mission, and Insight into a single context designed for time-critical, information-dense operational tasks.

---

## The problem

Professionals in high-stakes operational environments are forced to work in environments designed for office work. Three monitors. Twelve browser tabs. A Teams call on one screen, a sensor dashboard on another, a mission log in a third window, the relevant Twin model somewhere in between.

Switching between these contexts is not just inefficient — it is cognitively expensive. Every switch costs situational awareness. In an environment where situational awareness is the primary requirement, that cost is not acceptable.

The deeper problem is that the tools don't know about each other. The dashboard doesn't know which mission is active. The mission log doesn't show the sensor anomaly that Insight surfaced twenty minutes ago. The Twin doesn't show the current task status. Everything is siloed at the moment when integration matters most.

The Workstation exists because serious work deserves a serious environment — one that is designed around the work itself, not adapted from tools designed for something else.

---

## Who it's for

**Mission commanders and operations managers** during active operations. They need the full operational picture — mission status, Twin state, Insight findings, team positions — in a single environment they can navigate without switching context.

**Senior operators and team leads** who work across multiple Centari products as part of their regular role. The Workstation is their daily environment — the place they live when they are working.

**Analysts and planners** in the preparation and debrief phases. Before a mission: reviewing Twin models, examining Insight data, validating plans. After a mission: walking through the operational record, correlating decisions with outcomes.

**XR-equipped specialists** who work within Twin environments spatially. For these users, the Workstation is not a screen — it is the space around them.

---

## What it does

**Unified context.** The Workstation knows what you are working on. When you open the Mission view, the Twin automatically shows the relevant environment. When Insight surfaces an anomaly on an asset that is part of the active mission, it appears in context — not as a separate notification that requires you to find the right application to investigate it.

**Adaptive layout.** The Workstation surface is configurable. An operations commander during execution has a different layout requirement than a planner in preparation or an analyst in debrief. Layout presets match common roles and task types; users can modify and save their own.

**Spatial XR mode.** When running on XR hardware, the Workstation becomes a spatial environment. Information panels are placed in three-dimensional space. The Twin surrounds the user. Task statuses appear at the physical locations of the assets they reference. The full operational picture is visible without a screen.

**Real-time collaboration.** Multiple users can share a Workstation context. What one user is looking at can be shared instantly — "here is what I am seeing" — with annotations. Collaborative review of a Twin, a mission plan, or an Insight finding happens inside the same environment rather than through a screen share on a separate call.

**Notification routing.** Insight findings, mission phase transitions, Forge deployment events, and team communications are routed into the Workstation in a unified notification layer. Priority determines visibility — critical findings surface immediately; low-priority events are available but do not interrupt.

**State persistence.** The Workstation remembers where you were. When you return to a session, the context is restored — which mission is active, which Twin is open, which Insight view was visible. In an environment where interruption is frequent, returning to context quickly matters.

---

## What it is not

Workstation is not a general-purpose operating environment. It is not designed to replace a laptop or workstation for non-Centari work. It is not a productivity suite.

Workstation is also not a standalone product in the same sense as the others — it has no value without the products it integrates. It is the interface layer that makes the ecosystem coherent. Its quality is measured entirely by how well it serves the people who use Forge, Mission, Twin, and Insight together.

---

## In the ecosystem

Workstation is the surface of the ecosystem. Every other product contributes to what a user experiences in Workstation. It is the product users have an opinion about — because it is the product they see.

**→ Twin** is the primary spatial context in Workstation. The Twin is not a separate application a user switches to — it is always present, a live model of the operational environment that underlies everything else.

**→ Mission** drives the operational context in Workstation. When a mission is active, the Workstation organises its interface around that mission — phase, tasks, team, timeline. The mission is the frame through which everything else is viewed.

**→ Insight** feeds the situational awareness layer in Workstation. Anomalies, pattern findings, and alerts are surfaced contextually — linked to the relevant asset in the Twin, the relevant task in the Mission, the relevant actor in the team.

**→ Forge** contributes to Workstation through the configuration layer visible on the Twin. Operators can see the deployed configuration of any asset they are inspecting — without leaving the Workstation context.

**→ Centari OS** delivers the hardware experience that makes spatial Workstation possible. XR peripherals, high-bandwidth sensor streams, and low-latency rendering are managed by the OS layer beneath.

---

## Roadmap

**Phase 1 — Web-based integrated interface**  
Unified web application that combines Twin model view, Mission status, and Insight alerts in a single interface. Configurable panel layout. Context-aware navigation — switching mission or Twin updates all panels.

**Phase 2 — Real-time collaboration**  
Shared sessions. "Show me what you're seeing" — instant context sharing with annotations. Collaborative mission review and debrief. Presence awareness — who else is in this context right now.

**Phase 3 — XR spatial interface**  
Full spatial computing interface on Centari XR hardware. Twin as the ambient environment. Information panels in three-dimensional space. Interaction through gesture, gaze, and voice in addition to traditional input.

**Phase 4 — AI-enhanced workspace**  
Workstation learns from usage patterns — which information a specific user needs at which phase of which type of mission — and surfaces it proactively. The interface recedes; the relevant information is simply present.
