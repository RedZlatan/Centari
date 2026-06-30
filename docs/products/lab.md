# Lab

**Role in ecosystem:** Safe environment to test before production  
**Primary verb:** Validates

---

## In one sentence

Lab is the isolated, faithful replica environment where every Centari configuration, mission plan, and system model is tested and validated before it touches production — the safety net that makes confidence possible.

---

## The problem

In operational environments, testing in production is not a technical debt issue — it is a safety issue.

A Forge configuration that is wrong does not cause a failed CI/CD pipeline. It causes a misconfigured system in the field. A mission plan with a sequencing error does not produce a bug report — it produces a coordination failure during an operation that may not have a second chance. A Twin model that does not accurately reflect the physical system trains the wrong understanding into the people who will depend on that understanding.

The response to this risk, in most organisations, is caution — longer review cycles, more sign-offs, more manual verification. This adds time without fundamentally changing the failure mode. The verification is still done by humans reading artefacts, not by actually running the system and observing its behaviour.

Lab solves this by providing a realistic environment in which artefacts can actually be tested. Not read. Not reviewed. Executed.

---

## Who it's for

**Deployment engineers** who build Forge configurations and need to verify that a configuration behaves as intended before it is pushed to hardware.

**Exercise designers and training coordinators** who build Mission scenarios and need to validate timing, dependencies, and sequencing before running the scenario with a real team.

**Engineers and modellers** who build Twin models and need to verify that a model accurately represents the physical system it is intended to replicate.

**Developers building on Centari** who need an environment that closely mirrors production for development, integration testing, and regression testing.

The common thread: anyone who creates something for the Centari ecosystem before it goes live. Lab is their final check.

---

## What it does

**Isolated execution environment.** A Lab environment is a complete, self-contained instance of the Centari stack — Centari OS emulator, simulated hardware, Twin model snapshots, all Centari products. Actions taken in Lab have no effect on production. You can push a Forge configuration, run a Mission, and trigger Insight alerts without any of it affecting real systems.

**Centari OS emulator.** Lab includes a software emulation of Centari OS that behaves identically to the OS running on physical hardware — for the purposes of Forge configuration and software deployment. A Forge pipeline that succeeds against the Lab emulator will succeed against production hardware, because the execution environment is the same.

**Simulated hardware.** Physical sensors, XR peripherals, and edge compute units are represented in Lab as software simulators. Simulators produce realistic data streams — not random values, but data that follows the statistical patterns of the hardware models they represent. Forge configurations that manage hardware work correctly in Lab because the hardware behaviour is accurately simulated.

**Twin snapshots.** Lab includes static snapshots of production Twins. A mission scenario validated against a Lab Twin has been validated against a model that is structurally identical to the production environment — geometry, component relationships, sensor topology.

**Scenario injection.** Lab allows controlled injection of events into a simulation. A Forge deployment can be tested against the scenario "this device loses network connectivity at step 3." A Mission can be run against the scenario "asset 4 becomes unavailable during phase 2." Deliberate adversarial testing is first-class.

**Validation reporting.** When a Lab run completes, it produces a report — what was tested, what succeeded, what failed, and what deviations from expected behaviour were observed. This report is the artefact that authorises production deployment. Nothing goes to production without a passing Lab report.

---

## What it is not

Lab is not a development environment in the general software sense. It is not designed for writing code. It is designed for validating the operational artefacts — configurations, plans, models — that are produced by other tools.

Lab is not a production mirror. It is a faithful replica for testing purposes, not a hot standby for failover. Production data does not flow into Lab; production configurations are pushed to Lab for testing, not the reverse.

---

## In the ecosystem

Lab wraps the ecosystem. Every other product has a Lab presence — not as a feature of Lab, but because Lab needs to replicate the environment those products run in.

**→ Forge** is the primary production user of Lab. Every Forge configuration is validated in Lab before production deployment. Forge pipelines have a Lab stage built in — the pipeline cannot proceed to production until the Lab stage passes.

**→ Centari OS** is represented in Lab as an emulator. The emulator exposes the same interface to Forge deployments and software packages that the real OS does. Lab is where OS updates are tested before fleet rollout.

**→ Twin** contributes snapshots to Lab. Lab environments are initialised with the Twin snapshot corresponding to the production environment being targeted. Mission scenarios run against realistic models.

**→ Mission** uses Lab for scenario validation. An exercise designer creates a mission scenario and runs it in Lab — with simulated participants, simulated assets, and scenario-injected complications — before running it with a real team.

**→ Insight** can be configured to analyse Lab data. This allows validation of Insight alert configurations — does this alert fire correctly against the scenarios that should trigger it? Does it remain silent against normal operations that should not trigger it?

---

## Roadmap

**Phase 1 — Isolated environment for Forge and Mission**  
Centari OS emulator. Simulated hardware (basic sensor simulators). Static Twin snapshots. Forge pipeline integration — Lab stage before production. Mission scenario dry-run. Validation reports.

**Phase 2 — Scenario injection and adversarial testing**  
Configurable event injection: network failures, hardware faults, sensor degradation, personnel unavailability. Mission scenarios tested against multiple injected failure modes. Regression suite — re-run a set of scenarios automatically when a Forge configuration or Mission template is modified.

**Phase 3 — Shared scenario library**  
Organisation-level library of validated scenarios. Standard test cases for common operation types that can be applied to new configurations and plans. Cross-organisation (anonymised) scenario sharing for organisations that choose to participate.

**Phase 4 — Continuous validation**  
Lab runs against production configurations on a schedule — checking that production state continues to match what was validated. When production drifts from its validated state (detected by Forge's drift detection), Lab automatically re-runs the relevant validation scenarios and surfaces the delta.
