# Centari OS

**Role in ecosystem:** Platform foundation  
**Primary verb:** Runs

---

## In one sentence

Centari OS is the device-side operating environment that runs on all Centari hardware — the foundation that makes intelligence at the edge possible.

---

## The problem

General-purpose operating systems were designed for general-purpose computing. They were not designed for a hardened edge device that needs to run ML inference in a degraded network environment, manage spatial peripherals, accept trusted over-the-air updates, and log every state change for operational audit.

When you try to run serious operational software on a general-purpose OS, you spend most of your time fighting the OS rather than solving the problem. Security assumptions are wrong. Update mechanisms are not designed for the field. The runtime is not designed for the latency requirements of XR. Connectivity management is designed for offices, not operational sites.

Centari OS exists because the products that run on Centari hardware deserve a foundation that was designed for them.

---

## Who it's for

Centari OS is not directly used by customers in the way the other products are. It is the environment in which the other products run. But the people who care about it are:

**System operators and integrators** who are deploying Centari hardware at customer sites. They interact with OS through the Forge deployment pipeline — Forge configures the OS, pushes software packages, manages updates, and surfaces device health.

**Centari engineers** building the products that run on top of it. OS defines the contracts — what hardware capabilities are available, what security model is enforced, what the update mechanism looks like.

**Security-conscious enterprise customers** who need to audit the software stack running in their environment. Centari OS is the thing they sign off on.

---

## What it does

**Device lifecycle management.** Centari OS manages the full lifecycle of a Centari hardware device from provisioning to decommissioning. First boot, device registration, software installation, update sequencing, and secure wipe are all managed at the OS layer.

**Over-the-air updates.** OS receives signed update packages from the Centari update infrastructure. Updates are atomic — a failed update rolls back cleanly. Devices in degraded network conditions queue updates and apply them when connectivity is restored. Updates can be staged: rolled out to a subset of devices before fleet-wide deployment.

**Security boundary.** OS enforces the hardware security model — secure boot, signed binaries, encrypted storage, certificate-based identity. A Centari device cannot run unsigned software. Every product running on the device is cryptographically verified before execution.

**Hardware abstraction.** OS provides a stable API for Forge, Mission, Twin, and other products to access hardware capabilities — sensors, XR peripherals, compute units, network interfaces — without coupling those products to specific hardware versions.

**Edge runtime.** OS provides the execution environment for on-device AI inference. Models deployed by Insight or Mission run within a managed runtime that allocates compute resources, manages thermal state, and logs inference events.

**Telemetry and audit log.** Every device state change, software event, network transition, and security event is logged at the OS level. This data flows to Insight and to the customer's Control Room. The log is append-only and cryptographically signed.

---

## What it is not

Centari OS is not a general-purpose Linux distribution. It is not designed to be used as a workstation or development environment. It does not run arbitrary third-party software. It is not meant to be modified by customers.

It is a closed, hardened runtime environment. That is a feature, not a limitation — it is what makes Centari devices trustworthy in operational environments.

---

## In the ecosystem

Centari OS is the substrate for everything else. Every other Centari product that runs on hardware runs on top of Centari OS.

**→ Forge** is the primary tool for configuring and managing devices running Centari OS. A Forge deployment pipeline pushes software packages to Centari OS, manages configuration state, and reads device health back.

**→ Twin** receives real-time sensor data streams originating from hardware running Centari OS. The OS is responsible for ensuring those streams are continuous, timestamped, and authenticated.

**→ Insight** consumes the telemetry and audit log that Centari OS generates. Device-level events are first-class data in Insight.

**→ Lab** includes a Centari OS emulator so that deployment configurations and software packages can be validated before they are pushed to real hardware.

---

## Roadmap

**Phase 1 — Managed device runtime**  
Stable runtime for Centari hardware. Secure boot, signed packages, OTA updates. Device registration and health reporting to Control Room. Forge integration for remote configuration.

**Phase 2 — Fleet management**  
Multi-device coordination. Staged rollouts. Fleet-wide policy enforcement. Differential updates (only changed components). Network-resilient update delivery.

**Phase 3 — Edge intelligence runtime**  
Managed execution environment for on-device AI models. Model deployment pipeline from Insight. Resource allocation between inference workloads and other OS processes. Thermal and power management for sustained inference.

**Phase 4 — Federated mesh**  
Centari OS devices form a trusted mesh. Devices can share sensor data and workloads directly with adjacent devices without routing through a central server. Critical for environments where cloud connectivity cannot be assumed.
