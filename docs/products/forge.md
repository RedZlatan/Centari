# Forge

**Role in ecosystem:** Build and deploy system configurations  
**Primary verb:** Builds

---

## In one sentence

Forge is the tool for defining, versioning, and deploying the configuration of complex operational systems — making the state of your infrastructure explicit, reproducible, and controlled.

---

## The problem

Complex operational systems — sensor networks, edge compute deployments, XR installations, mission-critical infrastructure — are configured by people with expertise and institutional knowledge. That knowledge lives in their heads, in email threads, in undocumented manual steps.

The result: configurations drift. What is deployed is not what was designed. When something fails, no one knows what the correct state should have been. Rolling back is manual, slow, and risky. Deploying the same system at a new site means starting from memory.

The deeper problem is not technical — it is organisational. The person who knows how a system was configured may no longer be on the team. The system may have been changed six months ago for a reason no one remembers. The configuration of a critical system is, in most organisations, tacit knowledge — not documented, not versioned, not auditable.

Forge solves this by making configuration explicit. If a system exists, its configuration exists in Forge. If it doesn't exist in Forge, it isn't a managed system.

---

## Who it's for

**System architects and engineers** who design deployments. They define the configuration in Forge — what hardware is present, how it is connected, what software runs where, what the parameters are.

**Deployment engineers and operators** who push configurations to real systems. They use Forge's deployment pipeline to take a versioned configuration and apply it to hardware.

**Technical managers and security auditors** who need to know the state of their infrastructure at any point in time. Forge provides a complete history of what was deployed, when, by whom, and what changed.

The common thread: these are people who are responsible for systems that cannot be wrong.

---

## What it does

**Configuration as code.** Every aspect of a Centari system deployment is defined in Forge as a structured, versionable configuration. Hardware inventory, software packages, network topology, device parameters, inter-system dependencies — all of it is explicit, stored, and diffable.

**Version control.** Every configuration has a history. You can see what changed between any two versions, who changed it, and why. You can roll back to any prior state. Configuration history is the audit trail for your infrastructure.

**Deployment pipelines.** Forge manages the process of taking a configuration and applying it to real hardware. A pipeline defines the sequence: validate, stage, apply, verify. If a deployment fails at any stage, the pipeline halts and reports precisely what went wrong.

**Dependency resolution.** Complex deployments have dependencies — this service requires that device to be configured first; this parameter depends on the output of that process. Forge models these dependencies explicitly and enforces correct deployment order.

**Drift detection.** Forge knows what the intended state of every system is. It can compare that against the actual state of deployed systems and report discrepancies. When a system drifts from its intended configuration — deliberately or not — Forge surfaces it.

**Multi-environment management.** The same configuration can be parameterised for different environments: Lab, staging, production. A deployment that has been validated in Lab is the same artefact that gets pushed to production — with environment-specific values substituted.

---

## What it is not

Forge is not a general-purpose infrastructure automation tool. It is not a replacement for Terraform, Ansible, or Kubernetes in general software contexts. It is designed specifically for the kinds of systems Centari builds and deploys — hardware-heavy, field-deployed, operationally critical.

Forge is also not a monitoring tool. It knows what a system's configuration should be; it does not monitor runtime behaviour. That is Insight's job.

---

## In the ecosystem

Forge is the beginning of the operational lifecycle. Before anything else runs, Forge has defined and deployed the system it runs on.

**→ Centari OS** is the execution environment on the hardware Forge deploys to. A Forge pipeline communicates directly with Centari OS to push packages, apply configurations, and verify state.

**→ Lab** is where every Forge configuration is validated before it touches production hardware. Lab includes a Centari OS emulator; a Forge deployment to Lab is structurally identical to a deployment to production.

**→ Twin** receives configuration data from Forge. A Twin model of a physical system should reflect its Forge configuration — what hardware is present, how it is connected, what software version is running. Forge-to-Twin synchronisation means your digital model is always aligned with your physical deployment.

**→ Insight** consumes deployment events as data. When Forge deploys a configuration change, Insight records it and can correlate that change with subsequent changes in sensor or operational data.

---

## Roadmap

**Phase 1 — Configuration and deployment**  
Structured configuration schema for Centari system components. Version history with diff and rollback. Deployment pipelines with validation stages. Drift detection against live systems.

**Phase 2 — Visual pipeline builder**  
A graphical interface for designing deployment pipelines. Dependency graph visualisation. Real-time deployment progress view. Integration with Lab for in-pipeline validation.

**Phase 3 — Policy and compliance**  
Configuration policies that enforce standards across deployments — security baselines, naming conventions, required components. Automated compliance reporting. Alerting when a deployment violates policy.

**Phase 4 — AI-assisted configuration**  
Forge learns from the history of successful deployments. When a new system is being configured, Forge suggests configurations based on similar past deployments. Anomaly detection on configurations — flagging parameters that are statistically unusual relative to the fleet.
