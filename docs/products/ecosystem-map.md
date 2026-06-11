# Centari Ecosystem Map

Seven products. One system. This document is the single-page view of how they connect.

---

## 1. Ecosystem diagram

### Layer architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  5 · INTERFACE                                                          │
│                 ┌───────────────────────────────────────────────────┐   │
│                 │                  WORKSTATION                      │   │
│                 │   Unified operational environment. Brings Twin,   │   │
│                 │   Mission, and Insight into one context.          │   │
│                 └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  4 · UNDERSTAND                                                         │
│                 ┌───────────────────────────────────────────────────┐   │
│                 │                   INSIGHT                         │   │
│                 │   Processes all operational data — OS telemetry,  │   │
│                 │   Twin sensors, Mission events, Forge deployments. │   │
│                 │   Surfaces patterns, anomalies, signals.          │   │
│                 └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  3 · OPERATE                                                            │
│                 ┌───────────────────────────────────────────────────┐   │
│                 │                   MISSION                         │   │
│                 │   Plans and executes multi-phase operations.      │   │
│                 │   Runs inside Twin environments. Generates the    │   │
│                 │   operational record Insight analyses.            │   │
│                 └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  2 · MODEL                                                              │
│                 ┌───────────────────────────────────────────────────┐   │
│                 │                    TWIN                           │   │
│                 │   Live digital replicas of physical systems.      │   │
│                 │   Fed by OS sensor streams and Forge config state. │   │
│                 │   The model of record for the physical world.     │   │
│                 └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  1 · BUILD                                                              │
│      ┌─────────────────────────────────────┐ ┌───────────────────────┐ │
│      │              FORGE                  │ │         LAB           │ │
│      │   Defines, versions, and deploys    │◄│   Validates every     │ │
│      │   system configurations. The source │ │   Forge config and    │ │
│      │   of truth for deployed state.      │ │   Mission scenario    │ │
│      └─────────────────────────────────────┘ │   before production.  │ │
│                                              └───────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  0 · PLATFORM                                                           │
│                 ┌───────────────────────────────────────────────────┐   │
│                 │                 CENTARI OS                        │   │
│                 │   Managed runtime on all Centari hardware.        │   │
│                 │   Secure boot · OTA updates · edge inference ·    │   │
│                 │   sensor telemetry · audit log.                   │   │
│                 └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data flow

```
PRODUCES                      DATA                          CONSUMED BY
────────────────────────────────────────────────────────────────────────
Centari OS        sensor streams ─────────────────────────► Twin
                  device telemetry ────────────────────────► Insight
                  hardware audit log ──────────────────────► Insight

Forge             configuration state ─────────────────────► Twin
                  deployment events ──────────────────────► Insight
                  configs (to validate) ──────────────────► Lab

Twin              live sensor values ────────────────────── ► Insight
                  spatial model + history ─────────────────► Mission
                                                             Workstation
                  model snapshots ────────────────────────► Lab

Mission           operational events ──────────────────────► Insight
                  task timelines ─────────────────────────► Insight
                  live status ────────────────────────────► Workstation
                  scenarios (to validate) ────────────────► Lab

Insight           anomaly findings ──────────────────────── ► Workstation
                  pattern reports ────────────────────────► Workstation
                  alerts ─────────────────────────────────► Mission (awareness)
                  spatial findings ───────────────────────► Twin (overlay)

Lab               validation reports ─────────────────────► Forge pipelines
                  pass/fail verdicts ─────────────────────► Mission designers
```

---

## 2. Product hierarchy

| Layer | Product | Role | Primary verb |
|-------|---------|------|-------------|
| 0 · Platform | **Centari OS** | Runtime on all hardware. Security boundary. Source of sensor telemetry. | Runs |
| 1 · Build | **Forge** | Configuration as code. Version, deploy, and drift-detect operational systems. | Builds |
| 1 · Build | **Lab** | Isolated validation environment. Nothing reaches production without a Lab pass. | Validates |
| 2 · Model | **Twin** | Live digital replicas. Fed by OS sensors and Forge config state. The physical world, digitised. | Models |
| 3 · Operate | **Mission** | Structured operational environment. Plan, simulate, execute, debrief. Runs inside Twin. | Executes |
| 4 · Understand | **Insight** | Intelligence layer. Processes all data. Surfaces what matters without waiting to be asked. | Understands |
| 5 · Interface | **Workstation** | Where operators work. Integrates Twin, Mission, and Insight into one spatial context. | Integrates |

**The direction of dependency runs downward.** Workstation depends on the layers below it. Centari OS depends on nothing above it. This means the platform can be developed and hardened independently of the interface. It also means the ecosystem can be entered at any layer — a customer can start with OS + Forge without Mission or Workstation.

---

## 3. Dependency map

What each product needs to function, and how strictly.

| Product | Hard dependency | Soft dependency | Standalone value |
|---------|----------------|----------------|-----------------|
| **Centari OS** | — | — | Full — runs independently |
| **Forge** | Centari OS (deploy target) | Lab (validation) | High — config management works without other products |
| **Lab** | Centari OS emulator (built in) | Twin snapshots, Mission plans | Moderate — more valuable when Forge and Mission are in use |
| **Twin** | Centari OS (sensor streams) | Forge (config state enrichment) | High — spatial model works; less accurate without OS sync |
| **Mission** | Twin (environment) | Forge (asset state), Insight (live anomalies), Lab (scenario validation) | Low — Mission without Twin has no operational context |
| **Insight** | ≥1 data source (OS, Twin, or Mission) | Forge (deployment correlation), all sources | Moderate — degrades gracefully but improves with each additional source |
| **Workstation** | Twin, Mission, Insight | Forge (config layer in Twin) | None — Workstation is pure integration; it has no standalone capability |

**Minimum viable ecosystem:** Centari OS + Forge + Twin. This gives an organisation a managed hardware estate, versioned configurations, and a live spatial model of their systems. Every other product adds to this foundation.

---

## 4. Product relationship map

### What each product produces and where it flows

**Centari OS → Twin, Insight**  
The OS is the origin of physical-world data. Sensor streams flow into Twin to keep models synchronised. All device events — state changes, updates, security events — flow into Insight as the raw material for anomaly detection. Neither Twin nor Insight is live without OS feeding them.

**Forge → Twin, Insight, Lab**  
Forge knows the intended state of every deployed system. This configuration state flows into Twin as a data layer — operators can see the deployed configuration of any asset in the spatial model. Deployment events flow into Insight, enabling correlation between configuration changes and subsequent sensor behaviour. Forge submits configurations to Lab for validation before production deployment.

**Lab → Forge, Mission**  
Lab produces validation verdicts. A Forge deployment pipeline cannot proceed to production without a passing Lab report. Mission scenario designers validate timing, dependencies, and failure modes in Lab before using scenarios with real teams. Lab is not a source of operational data — it is a gate.

**Twin → Mission, Insight, Workstation**  
Twin is the connective tissue. It provides the environment Mission operates within — missions are planned and executed inside Twin models. It provides the spatial index Insight uses to locate findings — an anomaly is shown at its physical location on the Twin. It provides the spatial experience Workstation presents — the Twin is always present as the ambient layer.

**Mission → Insight, Workstation**  
Every phase transition, task completion, deviation, and decision point during a Mission is an event that flows into Insight. In real time, this data enriches situational awareness. Historically, it is the record of how operations actually unfold versus how they were planned. Workstation displays Mission status live — the current phase, task owners, team positions.

**Insight → Workstation, Twin, Mission**  
Insight findings flow upstream: they are surfaced in Workstation in the context of what the operator is currently working on. They are overlaid on the Twin at the spatial location of the affected asset. They reach Mission as risk awareness — a live anomaly on an asset relevant to an active mission surfaces inside that mission's context.

---

## 5. Customer journeys

### Journey A — Manufacturing company

**Context:** Large industrial manufacturer. 400+ connected devices across a factory floor. Complex machinery, shift operations, planned and unplanned maintenance.

| Phase | Products | What happens |
|-------|----------|-------------|
| **Infrastructure** | Centari OS, Forge | Engineers configure and deploy all connected devices through Forge. Centari OS runs on edge nodes and sensor hardware. Configuration history is the audit trail for the device estate. |
| **Visibility** | Twin | The factory floor exists as a live digital model, synchronised via OS sensor streams. Operations managers can see machine status, line throughput, and environmental conditions without walking the floor. |
| **Intelligence** | Insight | Continuous equipment health monitoring. Insight establishes baseline behaviour per machine and surfaces deviations — a press running hot, a motor drawing more current than expected — before they become failures. |
| **Maintenance** | Mission, Workstation | Planned maintenance windows are structured as Missions. Technicians know their tasks and dependencies. Workstation gives the operations manager a live view. After execution, Mission provides the debrief record. |
| **Safety net** | Lab | Every Forge configuration change is validated in Lab before it touches a production machine. Every new maintenance procedure is dry-run before it involves a real technician. |

**The moment that justifies the system:** Insight detects an anomaly on a press line. The finding appears on the Twin at the exact machine location. The operations manager opens Workstation, sees the finding in context, and creates a Mission to coordinate the maintenance response — without switching applications or making a phone call to find out which technician is available.

---

### Journey B — Training organisation

**Context:** Professional training provider for high-hazard industries. Runs cohorts through scenario-based exercises in environments that are too dangerous, expensive, or inaccessible to use directly.

| Phase | Products | What happens |
|-------|----------|-------------|
| **Environment** | Twin, Centari OS | A high-fidelity digital replica of the training environment — an offshore platform, an industrial facility, an emergency response zone — is built once and used for every cohort. Centari OS powers the XR hardware trainees wear. |
| **Scenario design** | Mission, Lab | Exercise designers build scenarios as structured Missions — phases, objectives, complication injection. Each scenario is validated in Lab before it is used with a real team: timing confirmed, dependencies checked, failure modes tested. |
| **Execution** | Mission, Workstation | The training exercise runs as a Mission inside the Twin. Trainees execute. Every decision, hesitation, and action is recorded. Instructors observe in Workstation and can inject complications or pause the exercise. |
| **Analysis** | Insight | After each cohort, Mission event data flows into Insight. Patterns emerge across cohorts: the decision point where teams consistently hesitate, the phase that overruns, the equipment interaction where errors cluster. |

**The moment that justifies the system:** Twelve trainees are inside the XR Twin of an offshore platform. A simulated equipment failure occurs. Their response — every decision, every communication delay, every action sequence — is captured by Mission. Insight compares it to the forty prior cohorts and identifies, in the debrief, a team-specific coordination gap the instructor had not noticed.

---

### Journey C — Infrastructure operator

**Context:** National energy transmission company. Operates critical infrastructure across many remote sites. Regulatory requirements for monitoring, response times, and audit evidence.

| Phase | Products | What happens |
|-------|----------|-------------|
| **Remote presence** | Centari OS, Twin | Centari OS on hardware at remote substations generates continuous sensor streams. The Twin gives operations center staff live visibility of every site — without a team stationed at each location. |
| **Fleet management** | Forge, Lab | All 300+ edge devices are managed through Forge. A firmware update is staged in Lab, validated, then rolled out across the fleet with drift detection. The configuration of every device is versioned and auditable. |
| **Early warning** | Insight | 24/7 monitoring across the entire network. Insight detects a transformer at a remote substation trending above its thermal baseline — days before any alarm threshold would trigger. A maintenance ticket is raised before the fault develops. |
| **Field operations** | Mission, Workstation | Field maintenance is structured through Mission. Technicians at the site have their tasks; the operations center sees live progress in Workstation. The Mission record is the compliance evidence for the regulatory audit. |

**The moment that justifies the system:** A planned maintenance window affects 12 substations simultaneously. All 12 Twin models are visible in Workstation. As substation after substation is taken offline and restored, Insight monitors the network for anomalies. An unexpected voltage deviation at one substation appears as a contextual finding in Workstation — located on the correct Twin model, during the correct Mission phase — and the field team is redirected before the window closes.

---

## 6. Future expansion

The ecosystem has defined entry points for products that do not yet exist.

### Fleet

**Gap it fills:** When an organisation runs hundreds or thousands of Centari OS devices, managing them as individual configuration targets in Forge is not enough. Fleet is a dedicated product for understanding and operating the device estate at scale — fleet-wide health dashboards, failure analysis across device models, staged rollout tracking, decommissioning workflows, and device lifecycle analytics.

**Where it fits:** Layer 1 alongside Forge. Fleet manages the device population; Forge manages individual device configurations. The two are complementary.

### Relay

**Gap it fills:** The current ecosystem assumes network connectivity. Many operational environments cannot guarantee it — remote sites, underground facilities, denied communications environments. Relay is the synchronisation and communication layer for disconnected operation. Teams run Mission and Twin locally; Relay reconciles state when connectivity is restored.

**Where it fits:** Layer 0 alongside Centari OS. Relay is a communication protocol and sync engine, not a user-facing product. It enables the rest of the ecosystem to function in connectivity-degraded conditions.

### Atlas

**Gap it fills:** Twin models a facility. Atlas models geography. When operations span large physical areas — wide infrastructure networks, multi-site field operations, area-of-operations coordination — the relevant context is a map, not a building model. Atlas provides geospatial context: terrain, routing, positioning, multi-site coordination.

**Where it fits:** Layer 2 alongside Twin. Atlas is the geospatial Twin — the same live model concept applied to territory instead of facilities. Mission and Insight both gain geospatial context when Atlas is present.

### Sim

**Gap it fills:** Mission's built-in simulation validates coordination — task sequencing, team readiness, timing. Sim is a physics-level simulation engine that models environmental behaviour: how a fire propagates through a facility, how a mechanical failure cascades, how personnel move under stress. Sim gives Lab more realistic scenarios and gives Mission richer training fidelity.

**Where it fits:** Layer 2 alongside Twin, but primarily as a computational backend. Sim does not have its own user interface — it is invoked by Mission during scenario simulation and by Lab during validation. It is infrastructure, not a product operators interact with directly.

### Bridge

**Gap it fills:** No Centari customer operates in isolation. They have existing systems — SCADA, ERP, CMMS, emergency dispatch infrastructure — that predate Centari and will not be replaced by it. Bridge translates between the Centari data model and third-party systems: Insight findings flow into existing alarm systems, Mission task completions update maintenance records, Twin state synchronises with SCADA displays.

**Where it fits:** A horizontal integration layer that touches every other product. Bridge does not sit in the product hierarchy — it is the mechanism that makes the Centari ecosystem additive rather than replacement. Customers adopt Centari alongside their existing infrastructure, not instead of it.

---

## Reading the ecosystem as one sentence

Centari OS runs on hardware and generates the sensor data that keeps **Twin** alive; **Forge** configures what runs on that hardware and what the Twin knows about it; **Lab** ensures neither a configuration nor an operation plan reaches the real world untested; **Mission** runs operations inside Twin environments and produces the event record that **Insight** turns into understanding; **Workstation** is where operators experience all of it — the spatial model, the live operation, the intelligence — without switching context.
