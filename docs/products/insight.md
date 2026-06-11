# Insight

**Role in ecosystem:** Surface meaning in operational data  
**Primary verb:** Understands

---

## In one sentence

Insight processes operational data from across the Centari ecosystem — sensors, missions, hardware, deployments — and surfaces the patterns, anomalies, and signals that matter, before the people who need to act have time to look for them.

---

## The problem

Operational environments generate data continuously. Sensors read values every second. Systems log events constantly. Missions produce decision trails. Hardware changes state thousands of times per day.

Almost none of this data is ever looked at. It is stored, archived, and eventually discarded. The organisation's understanding of what is happening in their operational environment is shaped by the small fraction of events that rise to human attention — alarms that are loud enough to demand a response, anomalies that are obvious enough to be noticed, problems that have already become incidents.

The patterns that would have predicted the incident — the slow drift in sensor readings, the correlation between maintenance events and failures, the mission phase that consistently takes twice as long as planned — exist in the data. But no one looks for them until after something goes wrong. And even then, the investigation is manual, expensive, and dependent on someone with enough domain knowledge to know what questions to ask.

Insight exists because the gap between data and understanding should not be filled by waiting for someone to look at the right dashboard at the right time.

---

## Who it's for

**Operations center staff and analysts** who monitor live environments. They need to know what matters right now — not everything, but the things that require attention or action.

**Engineers and maintenance teams** who need to understand equipment behaviour over time — trending toward failure, deviating from expected parameters, responding to changes in operating conditions.

**Mission planners and commanders** who need to understand the history of similar operations — what patterns of deviation recur, which assets are reliable, where timing consistently slips.

**Safety officers and compliance teams** who need to demonstrate that anomalies are detected and responded to — and provide audit evidence that the monitoring system is functioning.

The common characteristic: these are people who are responsible for understanding what is happening, and are currently under-equipped to do so at the scale the data demands.

---

## What it does

**Real-time anomaly detection.** Insight establishes baseline behaviour for every sensor, asset, and operational process it monitors. When a value deviates from baseline in a way that is statistically significant, Insight surfaces it — not as a raw alert, but as a contextualised finding. Not "sensor 47 is at 78°C" but "compressor room 3 east wall temperature is 12°C above 30-day baseline, following a pattern consistent with heat exchanger fouling."

**Cross-system correlation.** Insight does not treat sensors, mission events, and hardware telemetry as separate data sources. It correlates across them. A maintenance event two weeks ago, a configuration change from Forge, and a gradual sensor drift today are not three separate things — they are one story. Insight finds that story.

**Operational pattern recognition.** Across missions, Insight identifies recurring patterns — phases that consistently overrun, assets that are reliably unavailable, team performance metrics that vary by environmental condition. This is the organisational learning layer: what has this organisation been doing, how well has it been working, and what does that suggest about future operations?

**Configurable alerting.** When Insight identifies something that requires immediate attention, it routes it to the right person through the right channel. Routing is configurable by the organisation — which findings go to which roles, at which severity thresholds, via which notification mechanisms.

**Historical analysis and reporting.** Insight maintains a full history of every event it has ingested. Users can query that history — filtering by time, asset, event type, severity — and export findings as structured reports. Compliance evidence, incident investigation, operational review: all are queries against Insight's historical record.

**Spatial context through Twin.** Insight findings are located on the Twin. An anomaly is not just a number — it is a location in a physical space. The operations center analyst sees an anomaly and can immediately understand where it is, what is adjacent to it, and what context the Twin provides.

---

## What it is not

Insight is not a business intelligence or data warehousing tool. It is not Tableau, PowerBI, or a generic analytics platform. Those tools answer questions you already know to ask. Insight is designed to surface questions you did not know you should be asking.

Insight is not a monitoring dashboard. A dashboard shows you current values. Insight shows you what those values mean. The distinction matters: a monitoring dashboard requires someone watching it to understand what it is showing. Insight works whether or not someone is watching.

Insight is not a replacement for domain expertise. It surfaces anomalies and patterns for human judgement. The decision about what to do with an Insight finding belongs to the person who understands the operational context. Insight gives them the right information; it does not make the decision for them.

---

## In the ecosystem

Insight is the intelligence layer. It sits downstream from everything — consuming data produced by OS, Forge, Twin, and Mission — and upstream from the people who need to act.

**→ Centari OS** generates the device telemetry and hardware audit log that forms a core data stream for Insight. Every device event — state change, software update, connectivity transition, security event — flows into Insight.

**→ Twin** provides two things: real-time sensor data (the raw material Insight analyses) and spatial context (the location layer Insight uses to situate its findings). The relationship is bidirectional — Insight findings are displayed on the Twin.

**→ Mission** generates operational event data during execution — task timelines, phase transitions, deviations, decision points. Insight analyses this data both in real-time during execution and historically across many missions.

**→ Forge** generates deployment events that Insight correlates with subsequent changes in operational data. A configuration change to a system followed by a sensor drift is a pattern Insight is specifically designed to detect.

**→ Workstation** is the primary interface through which Insight findings reach operators. Workstation surfaces the most relevant Insight data for the current context — what the operator is looking at, what mission is active, what assets are in scope.

---

## Roadmap

**Phase 1 — Real-time dashboards and anomaly detection**  
Data ingestion from Twin sensors, OS telemetry, and Mission events. Baseline modelling per asset and sensor. Anomaly detection with contextualised alerts. Configurable alert routing. Historical query interface.

**Phase 2 — Cross-system correlation and pattern recognition**  
Correlation engine across data sources. Recurring operational pattern identification. Mission performance analysis across multiple executions. Integration with Workstation for in-context display.

**Phase 3 — Predictive analytics**  
Maintenance prediction from sensor trends. Mission risk assessment from historical performance data. Intervention recommendations — not just "this is anomalous" but "based on similar cases, the following action has the highest probability of resolving it."

**Phase 4 — Autonomous monitoring**  
Insight proactively compresses its own output. Rather than surfacing everything that deviates from baseline, it learns what the organisation actually responds to — and surfaces only that. The goal is not fewer alerts by raising thresholds; it is fewer alerts by understanding context. An organisation that responds to Insight findings trains Insight to find better ones.
