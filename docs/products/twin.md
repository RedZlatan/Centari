# Twin

**Role in ecosystem:** Model physical systems as live digital replicas  
**Primary verb:** Models

---

## In one sentence

Twin creates and maintains high-fidelity digital replicas of physical systems — environments, assets, infrastructure — that stay synchronised with reality and can be experienced, analysed, and acted upon without physical presence.

---

## The problem

Understanding a complex physical system requires being in it. To understand how a facility operates, you need to walk it. To train on a piece of equipment, you need access to that equipment. To understand what is happening at a site right now, someone has to be there.

This is a fundamental constraint on operational organisations. Sites are remote, dangerous, or both. Equipment is unavailable, in use, or not yet built. Expertise is concentrated in people who cannot be everywhere at once. Understanding is bottlenecked by physical presence.

The consequence: decisions are made with incomplete information. Training happens on equipment that doesn't reflect current operational reality. Engineers design for systems they've never experienced at scale. Teams rehearse for scenarios that bear little resemblance to the actual environment.

Twin removes the physical constraint from understanding. When a physical system has a Twin, you can be inside it from anywhere. You can train on it before it's built. You can understand what is happening at it right now without leaving the building.

---

## Who it's for

**Engineers and system designers** who need to understand systems they are building, modifying, or integrating — before physical access is possible, affordable, or safe.

**Training departments and exercise designers** who need a realistic environment for training. A Twin of the facility where a team will operate is the highest-fidelity training environment possible — it is the actual facility, in digital form.

**Operations managers and site leads** who need situational awareness of physical infrastructure they cannot constantly visit. A synchronised Twin tells them the current state of the site.

**Maintenance and technical teams** who need to diagnose, plan, and rehearse interventions before setting foot in the field. Walking through a Twin before a maintenance operation reduces error and preparation time.

---

## What it does

**Model construction.** A Twin starts as a spatial and structural model of a physical system. This may be built from 3D scans, CAD data, engineering drawings, or Centari's own surveying tools. The model captures geometry, component relationships, and system topology.

**Sensor synchronisation.** A static model is a starting point, not a Twin. A Twin is alive — it receives real-time data from sensors running on the physical system and reflects current state. A temperature sensor on a physical asset appears in its exact location in the Twin with its current reading. A component that has gone offline appears as offline in the Twin.

**Spatial interaction.** Twin is designed to be experienced spatially, in XR. Walking through a Twin gives you the spatial understanding that no dashboard or schematic can provide. You can inspect components up close, follow cables and pipelines through a facility, and understand the layout of a system intuitively rather than abstractly.

**Layered data.** The spatial model is a canvas for operational data. Maintenance history, configuration state (from Forge), sensor readings, Insight alerts, and mission status are all overlaid on the physical model. The right information, at the right location, visible in context.

**Temporal replay.** Because a Twin records the history of every sensor value and state change, you can replay the Twin through time. Walk through a facility as it was during an incident. See the sequence of events that led to a failure. Train on what actually happened.

**Simulation.** A Twin can be run in simulation mode — forward-projecting from current state, or exploring hypothetical scenarios. What happens to system temperature if this cooling unit fails? What does this facility look like after the planned modification? Simulation answers questions without touching the physical system.

---

## What it is not

Twin is not a 3D visualisation tool or a CAD viewer. It is not designed for architectural design or engineering drawing review. Its purpose is operational understanding, not design.

Twin is not a standalone product. It derives its value from connection — to the sensors that keep it synchronised, to the missions that run within it, and to the Workstation where it is experienced. A Twin that is not connected to real-world data is a model. A Twin that is connected is a live operational asset.

---

## In the ecosystem

Twin is the connective tissue of the ecosystem. Every other product either feeds into it, runs inside it, or relies on it.

**→ Centari OS** on physical hardware provides the sensor data streams that keep a Twin synchronised. The OS ensures those streams are continuous, authenticated, and timestamped.

**→ Forge** provides the configuration state of the systems a Twin models. When Forge deploys a configuration change to a device, that change is reflected in the Twin. The Twin's layer of configuration data is always derived from Forge's ground truth.

**→ Mission** runs inside Twin environments. A mission plan references specific locations and assets within a Twin. During execution, the Twin reflects real-world state — and Mission updates when the Twin updates.

**→ Insight** uses the Twin as a spatial index for its analytical data. An anomaly detected by Insight is located on the Twin — not just "sensor 47 is reading high", but "the temperature sensor on the east wall of compressor room 3 is reading 12°C above baseline."

**→ Workstation** is the primary interface for experiencing a Twin in XR. Walking through a facility's Twin, with all its data layers, is a Workstation experience.

**→ Lab** hosts static snapshots of Twins for testing. A Lab environment includes a Twin snapshot so that Forge deployments and Mission scenarios can be validated against a realistic model.

---

## Roadmap

**Phase 1 — Static and sensor-synchronised Twins**  
Model construction from 3D data. Real-time sensor synchronisation. Spatial inspection in XR. Basic data layers: sensor values, component status.

**Phase 2 — Temporal replay and layered data**  
Full history replay — walk through the Twin at any point in the past. Forge configuration layers. Insight alert layers. Maintenance history overlay.

**Phase 3 — Predictive Twin**  
Forward simulation from current state. "What if" scenario modelling. Predictive maintenance — the Twin identifies components trending toward failure before they fail.

**Phase 4 — Generative Twin**  
AI constructs a Twin model from sensor data and telemetry alone — no 3D scans or CAD data required. The Twin builds itself from observations of the physical system. Applicable for sites where traditional survey is impractical.
