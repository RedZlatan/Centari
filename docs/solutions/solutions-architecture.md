# Solutions Architecture

**Type:** Commercial structure — no implementation  
**Depends on:** `docs/products/`, `docs/products/ecosystem-map.md`

---

## What this document is

A product is a capability. A solution is a combination of capabilities applied to a defined customer situation.

Products are how Centari builds value. Solutions are how Centari delivers it. The distinction matters because customers don't buy products — they buy outcomes. An organisation that needs to train teams for high-hazard scenarios does not need to understand the relationship between Twin, Mission, Lab, and Workstation. They need to know that Centari can solve their training problem and what that looks like in practice.

The five solutions defined here are the structure behind Centari's go-to-market. They define how products are bundled, sequenced, and expanded within a customer engagement. They are not mutually exclusive — customers commonly enter through one solution and expand to others as value is demonstrated.

---

## Solution overview

| # | Solution | Customer archetype | Core outcome |
|---|----------|--------------------|--------------|
| 1 | Training & Readiness | Organisations that train for high-stakes scenarios | Teams that are genuinely ready, with evidence |
| 2 | Operational Understanding | Organisations operating distributed physical estates | Continuous situational awareness, proactive response |
| 3 | Edge Intelligence | Organisations deploying compute in the field or at scale | Reliable, manageable intelligence at the point of action |
| 4 | Digital Operations | Organisations coordinating complex multi-team operations | Operations that are structured, recorded, and improvable |
| 5 | Innovation & Simulation | Organisations that must test before they commit | Validated evidence of system behaviour before production |

---

## Solution 1 — Training & Readiness

### The problem

Training for high-consequence scenarios is constrained by physical access. The environment is too dangerous to use for exercises. The facility hasn't been built yet. The equipment is operational and cannot be removed from service. The geography requires flying a team to a remote site for every training event.

The workaround — classroom instruction, desktop simulation, verbal briefing — produces teams that can describe a procedure, not teams that have been inside the environment and executed under realistic conditions. The gap between knowing a procedure and performing it under pressure is not addressed by existing training approaches.

A secondary problem: even where physical training is possible, it produces no structured data. Debriefs are reconstructions from memory and instructor observation. Improvement across cohorts depends on whether an instructor notices a pattern — it is not systematic, and it is not scalable.

### Customer type

- Defence and military training commands
- Industrial training departments in high-hazard sectors: oil and gas, nuclear, chemical processing, aviation
- Emergency response agencies: fire services, coast guard, civil protection bodies
- Professional certification providers for hazardous occupations
- Infrastructure operators that need to validate their own incident response capability

### Products involved

**Primary:** Twin, Mission, Lab, Centari OS (hardware runtime)  
**Secondary:** Workstation (instructor environment), Insight (cross-cohort analysis)

### Typical delivery

1. **Build the Twin.** The training environment is modelled once. If the physical environment exists, the Twin is built from survey data, CAD drawings, and OS sensor streams. If it is pre-construction, it is built from design documents. This asset is reused for every subsequent cohort — the cost amortises over the training programme.

2. **Design the scenario library.** Each training exercise type becomes a Mission template: defined phases, objectives, tasks, timing assumptions, complication injection points. The template is the reusable exercise structure.

3. **Validate each scenario in Lab.** Every scenario is run with simulated participants before it is used with a real team. Lab confirms timing logic, dependency structure, and each complication variant. A scenario that has not passed Lab does not run with trainees.

4. **Deploy Centari OS on the XR hardware estate.** Centari hardware or compatible customer hardware. Forge manages the device estate and handles firmware updates across the fleet.

5. **Run cohorts.** Each exercise executes as a Mission inside the Twin. Instructors monitor and manage the exercise in Workstation. Complication injection, pausing, and scenario branching are available during execution.

6. **Debrief from data.** Mission generates a complete execution record: task completion times, deviations from the plan, decision point timing. The debrief is an analysis of what actually happened — not a reconstruction from memory.

**Minimum viable entry:** Twin + Mission + Lab + Centari OS hardware.

### Expansion path

- **Insight** — once multiple cohorts have completed, cross-cohort analysis identifies patterns that are not visible in individual debrief sessions: which phase consistently runs over time, which decision point has the highest hesitation rate, which team configurations produce different outcomes under the same conditions.
- **Scenario library growth** — each validated Mission template is a reusable asset. Organisations accumulate a library of tested scenarios across operation types, reducing the time to design and deploy new training programmes.
- **Atlas** (future) — geospatial training scenarios: multi-site coordination, convoy operations, area search and response.
- **Sim** (future) — physics-level simulation for scenarios that require realistic environmental dynamics: fire propagation, structural failure, atmospheric hazard.

---

## Solution 2 — Operational Understanding

### The problem

Operational environments generate data continuously. Almost none of it is ever looked at. The organisation's understanding of what is happening across its estate is shaped by the events that cross an alarm threshold — problems that have already developed, not problems in formation.

Threshold-based alarms have a specific failure mode: they are calibrated to avoid false positives, so they are necessarily set above the level at which early-stage anomalies would trigger them. The sensor reading that has been drifting upward for three weeks does not fire an alarm until it crosses the threshold. The correlation between a maintenance event two weeks ago and the sensor behaviour today is not visible unless someone is specifically looking for it.

Remote assets compound the problem. Assets that cannot be visited frequently are monitored on a schedule rather than continuously. The state of those assets between visits is unknown unless a failure occurs.

### Customer type

- Energy infrastructure operators: substations, generation facilities, pipelines, transmission networks
- Large industrial facilities: refineries, chemical plants, water treatment, manufacturing
- Building and facility operators for complex or critical estates
- Transportation and logistics infrastructure operators
- Any organisation with distributed remote assets where physical visits are the current monitoring strategy

### Products involved

**Primary:** Centari OS, Twin, Insight  
**Secondary:** Workstation (operations centre interface), Forge (hardware estate management)

### Typical delivery

1. **Deploy Centari OS on the hardware estate.** Sensor nodes, edge compute units, control system interfaces. This is the data origin — without OS generating structured telemetry from the estate, Insight has no input.

2. **Build Twin of primary facilities.** Start with the highest-value or highest-risk sites. The Twin provides spatial context for Insight findings: an anomaly is located in the model at the physical location of the affected asset.

3. **Configure Insight.** Define the asset categories and data streams to monitor. Configure alert routing: which findings go to which roles, at which severity. Set initial baseline windows for Insight's learning period.

4. **Deploy Workstation for operations centre staff.** Insight findings surface in Workstation in the context of the current operational view — they don't require the operator to switch to a separate monitoring tool.

5. **Live period.** Insight learns baselines over the first weeks of operation. Initial anomaly detection begins immediately; baseline models mature over 4–8 weeks as Insight accumulates normal operating data across different conditions (shift patterns, seasonal variation, load variation).

6. **Expand coverage.** Additional sites, additional asset types, deeper sensor integration as value is demonstrated at initial sites.

**Minimum viable entry:** Centari OS on hardware + Insight. Twin is added once OS is generating data and Insight has identified the assets where spatial context adds the most value.

### Expansion path

- **Mission** — when Insight surfaces a significant finding, the response can be structured as a Mission: coordinated, task-assigned, with a completion record that serves as compliance evidence.
- **Additional Twin coverage** — as the value of spatial context is demonstrated at initial sites, expand the Twin to cover more of the estate.
- **Atlas** (future) — estate-level geospatial view for organisations operating across many sites: the full network visible as a live spatial model, not just as a data table.
- **Bridge** (future) — connect Insight findings and alerts to existing alarm management systems, CMMS, and field dispatch infrastructure.

---

## Solution 3 — Edge Intelligence

### The problem

Two distinct problems that frequently co-occur:

**Disconnected or degraded environments.** The operational context cannot guarantee a reliable network connection to central systems. ML inference, decision support, sensor processing, and operational logging must happen locally on the device — the data cannot wait for a round-trip to a central server. The platform running those workloads needs to be hardened, auditable, and capable of operating without persistent connectivity.

**Fleet management at scale.** Managing hundreds or thousands of edge devices through manual processes is not viable. A security vulnerability requires a fleet-wide firmware update: it needs to happen reliably, in a staged rollout, with validation before deployment and rollback if something fails — and it needs to produce audit evidence that every device was updated. This process cannot be sustained by a team manually maintaining individual devices.

### Customer type

- Organisations operating in low-connectivity or denied environments: offshore platforms, remote infrastructure, underground facilities, maritime deployments, defence forward positions
- Organisations with large geographically distributed hardware fleets: utility companies, pipeline operators, telecommunications infrastructure, building management at scale
- Enterprises with strict hardware security requirements: classified environments, critical national infrastructure, sectors regulated under NIS2 or equivalent frameworks
- Defence and security contractors deploying compute at the edge of communications infrastructure

### Products involved

**Primary:** Centari OS, Forge, Lab  
**Secondary:** Insight (device health and estate monitoring), Twin (spatial context for the hardware estate)

### Typical delivery

1. **Hardware provisioning.** Centari OS deployed on the device estate. Each device is enrolled and registered through Forge. The fleet is inventoried — every device is a managed entity with a known configuration state.

2. **Fleet configuration in Forge.** The intended state of every device type is defined as a versioned Forge configuration. This is the source of truth for what should be running on every device in the fleet.

3. **Lab pipeline configured.** The update workflow is defined: no firmware or configuration change goes to production hardware without a passing Lab validation. The first validation run confirms the pipeline works end-to-end.

4. **Drift detection active.** Forge monitors every device against its intended configuration. Any device that diverges — through an unauthorised change, a failed update, or hardware-level state corruption — surfaces immediately.

5. **First update cycle.** A firmware update is staged: validated in Lab, rolled out to a defined subset of the fleet, then fleet-wide after the subset confirms success. The full process is documented automatically by Forge. Rollback is available at each stage.

6. **Insight monitoring.** Device health monitoring configured for the estate: connectivity drops, anomalous state changes, security events, thermal and resource metrics. Findings surface in the Control Room.

**Minimum viable entry:** Centari OS + Forge. Lab is part of the deployment pipeline from day one — it is not optional.

### Expansion path

- **Relay** (future) — for genuinely disconnected deployments: full operational capability without network access, with state reconciliation when connectivity is restored. Mission, Twin, and Insight all continue to function locally; Relay reconciles the record with central systems.
- **Fleet** (future) — device lifecycle analytics at scale: failure analysis across device models, replacement planning, decommissioning workflows, cost-per-device-type analytics.
- **Twin** — if the hardware estate is in a facility or site with physical complexity, Twin adds spatial context to the hardware inventory. Device faults and state changes are located in the model, not just in a list.

---

## Solution 4 — Digital Operations

### The problem

Complex multi-team operations are coordinated through tools that were not designed for operations. The plan is in a presentation. Status updates happen in a group chat. Decisions are made on phone calls with no record. The operation produces no structured artefact — only a collection of messages, a few photos, and an after-action report written from memory two days later.

The structural consequence: the organisation cannot improve systematically. Improvement requires data. The current tooling produces communication records that would require manual annotation to be analysed — and almost never is.

The compliance consequence: in regulated industries, the operation must produce an auditable record of what happened, in what sequence, and who authorised what. Building this retrospectively from communication logs is expensive, unreliable, and frequently not accepted by auditors.

The human cost: when the plan and the execution are separate — when the team executing the operation cannot see the current plan state, and the commander planning the operation cannot see the current execution state — coordination failures follow. The team that was briefed yesterday did not hear about the change made this morning.

### Customer type

- Military units and defence contractors moving to structured digital command and control
- Emergency response agencies: fire services, coast guard, civil emergency management
- Industrial operators running complex planned maintenance windows: facility shutdowns, commissioning, turnaround operations
- Infrastructure operators whose incident response requires coordinated multi-team action
- Any organisation running operations with: defined phases, multiple teams, asset dependencies, and consequences if coordination fails

### Products involved

**Primary:** Mission, Twin, Lab  
**Secondary:** Workstation (operations centre environment), Insight (cross-operation analysis)

### Typical delivery

1. **Inventory operation types.** Identify the 3–5 most common or highest-consequence operations the organisation runs. These become the initial scope for templating.

2. **Map each operation type into a Mission template.** Phases, objectives, tasks, assignments, dependencies, timing assumptions, decision points. This is the most intensive phase of delivery — it requires translating informal, partially tacit processes into explicit structure. Expect this to reveal gaps in the existing process.

3. **Validate each template in Lab.** Run the operation with simulated participants. Confirm that the template structure matches operational reality. Identify missing steps, incorrect dependencies, unrealistic timing. Revise and re-run until Lab validation passes.

4. **Build Twin of the primary operational environment.** Mission operations run inside Twin. The Twin is the spatial context — it is where operators, assets, and phases are located in the operational model.

5. **Deploy Workstation to the operations centre.** The commander's view: mission status, Twin, Insight findings, team positions — all in one environment.

6. **First live operation.** Expect the template to require revision after the first real execution — this is normal. The Mission execution record captures exactly what happened vs. what was planned. Revisions are made in Lab before the next operation runs.

7. **Steady state.** Templates are refined over successive operations. Timing data accumulates. Debrief quality improves because debriefs are analyses of structured data, not reconstructions from memory.

**Minimum viable entry:** Mission + Twin + Lab. Workstation is added once the operations centre is using Mission for live coordination. Insight is added once enough operations have been run to make cross-operation analysis valuable.

### Expansion path

- **Insight** — once 10–20 or more operations have been logged, cross-operation pattern analysis becomes valuable: which phases consistently run over time, which assets are repeatedly unavailable, which team configurations perform differently under specific conditions.
- **Template library growth** — as more operation types are migrated into Mission, the organisation builds a library of validated, reusable templates. New operations start from a validated baseline rather than from scratch.
- **Bridge** (future) — connect Mission task completions and phase transitions to existing CMMS, SCADA, or dispatch systems, enabling the Centari operational record to update external systems automatically.

---

## Solution 5 — Innovation & Simulation

### The problem

The gap between design and deployment. A new configuration, facility design, operational procedure, or technical capability exists as a design artefact. Before it can go live, it needs to be tested. But testing physically is too expensive, too slow, or not possible — the facility isn't built yet, the equipment is not available, the operational environment cannot be shut down for a test.

Existing simulation options have a consistent failure mode: they don't accurately represent the operational environment they are testing against. They are either too generic (no domain specificity), too low-fidelity (the simulation doesn't behave like the real system), or too disconnected from the operational data (the test cases are constructed in isolation from the history of how the real system has behaved).

The secondary problem: testing without structure produces testing without evidence. A test that is conducted informally, documented in a spreadsheet, and reviewed by the team that ran it does not constitute the kind of independent, reproducible, structured validation that sophisticated customers — procurement programmes, regulatory bodies, internal risk governance — require.

### Customer type

- R&D and advanced technology teams in defence, industrial, and infrastructure sectors
- Defence procurement programmes requiring independent capability validation evidence
- Engineering teams designing new facilities, system configurations, or operational procedures before physical commitment
- Organisations with high change-risk environments where testing in production is not acceptable: nuclear, chemical processing, critical infrastructure
- Compliance and safety teams who need documented evidence of system validation for regulatory or insurance purposes

### Products involved

**Primary:** Lab, Twin, Mission  
**Secondary:** Forge (configuration validation), Insight (test data analysis)

### Typical delivery

1. **Define the test scope.** What is being validated? What are the explicit success criteria? What failure modes need to be demonstrated? What does a passing result look like? This scope definition is the contract between the test programme and the decision-maker who will act on the results.

2. **Build the Twin environment.** This is the substrate all tests run against. If the physical system exists, the Twin is derived from it. If it does not yet exist — a new facility, a proposed configuration, a designed capability — the Twin is built from design documents and the best available specification.

3. **Design test scenarios as Mission templates in Lab.** Each test case is explicit: what is being tested, what the expected outcome is, what the pass/fail criterion is, and what failure conditions will be injected. Baseline scenarios establish normal behaviour first. Adversarial scenarios stress failure modes.

4. **Run baseline scenarios.** Establish that the system behaves as expected under normal operating conditions. This is the control condition — it confirms the test environment is valid before adversarial testing begins.

5. **Run adversarial scenarios.** Inject defined failure conditions: network loss, hardware fault, personnel unavailability, environmental stress, cascade failure. Document how the system responds to each. Multiple runs of each scenario with varying parameters.

6. **Insight analysis.** Insight processes all test run data. Findings report: did the system meet stated criteria? Where did it deviate? Are there patterns across test runs that indicate a systemic issue — a failure mode that manifests consistently under a specific class of conditions?

7. **Produce the validation package.** Lab run records (per-scenario pass/fail with execution traces) + Insight analysis report. This is the evidence artefact that authorises production deployment, satisfies regulatory review, or justifies procurement.

**Minimum viable entry:** Lab + Twin. Mission test scenarios are defined as part of test design. Insight is added to process test results. Forge is included when the scope includes configuration validation.

### Expansion path

- **Sim** (future) — physics-level simulation for test scenarios requiring realistic environmental dynamics: fire propagation, structural response, fluid behaviour, atmospheric hazards. Sim runs as a computational backend within Lab without requiring a separate user interface.
- **Regression suite** — as the system evolves, Lab maintains the validated test suite and re-runs it automatically when configurations or procedures are modified. The validation package is kept current without a full test programme for each change.
- **Continuous validation** — Lab monitors production configurations on a schedule against their validated baseline. When production state diverges from what was validated, Lab alerts and identifies the delta before it becomes a live risk.

---

## Product-to-solution mapping

Which products appear in which solutions, and at what level of centrality.

| Product | Training & Readiness | Operational Understanding | Edge Intelligence | Digital Operations | Innovation & Simulation |
|---------|---------------------|--------------------------|-------------------|-------------------|------------------------|
| **Centari OS** | Primary (hardware) | Primary (data origin) | Primary (runtime) | — | — |
| **Forge** | Secondary (fleet mgmt) | Secondary (estate mgmt) | Primary | — | Secondary |
| **Lab** | Primary | — | Primary | Primary | Primary |
| **Twin** | Primary (environment) | Primary (spatial context) | Optional | Primary | Primary |
| **Mission** | Primary (scenarios) | Optional (response) | — | Primary | Primary (test scenarios) |
| **Insight** | Phase 2 | Primary | Secondary | Phase 2 | Secondary (test analysis) |
| **Workstation** | Secondary (instructor) | Secondary (ops centre) | — | Primary (ops centre) | — |

**Observations:**
- Lab appears in four of five solutions. It is not a standalone offering — it is the validation layer that makes every other solution trustworthy.
- Twin appears in all five solutions. It is the connective tissue: the spatial model that gives other products context.
- No single product appears in only one solution. This means solutions cannot be assembled from product silos — every solution requires products to work together.

---

## Solution relationships

Solutions are not independent. Customers commonly enter through one solution and expand to adjacent ones. The expansions follow a logic: once a product is deployed and generating data, the adjacent solution that depends on that data becomes accessible.

### Common expansion patterns

**Edge Intelligence → Operational Understanding**  
The foundation is shared: Centari OS deployed on the hardware estate, Forge managing it. Adding Twin and Insight transforms fleet management into operational understanding. The data is already flowing; what changes is what is done with it.

**Training & Readiness → Digital Operations**  
The Twin has been built. Mission templates exist and have been validated in Lab. Extending this infrastructure to live operations means using Mission for real operations instead of only for exercises. The template library transfers — a training scenario for an incident response procedure becomes the Mission template for the real incident response procedure.

**Innovation & Simulation → Digital Operations**  
A procedure validated in Lab is a procedure ready to run live. The test scenarios become Mission templates. The validated Twin environment becomes the operational Twin. The transition from test to production is a change in context, not a change in structure.

**Digital Operations → Operational Understanding**  
Mission generates operational data. Once enough operations have been logged, that data has sufficient depth to be worth analysing at the pattern level. Adding Insight to a Digital Operations deployment activates cross-operation analysis on data that already exists.

### Entry and depth

Each solution has a minimum viable configuration — the entry point that delivers core value without requiring the full product set. The table below shows minimum entry and the typical depth at maturity.

| Solution | Minimum entry | Full depth |
|----------|--------------|------------|
| Training & Readiness | Twin + Mission + Lab + OS hardware | + Workstation + Insight |
| Operational Understanding | OS + Insight | + Twin + Workstation + Forge |
| Edge Intelligence | OS + Forge + Lab | + Insight + Twin |
| Digital Operations | Mission + Twin + Lab | + Workstation + Insight |
| Innovation & Simulation | Lab + Twin | + Mission + Forge + Insight |

---

*This document defines solution structure. It is not a pricing document, a sales playbook, or a product specification. Product capability details are in `docs/products/`. The commercial model (packaging, pricing, licencing) is a future document.*
