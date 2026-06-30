# Centari Products

For the complete system view — data flows, dependencies, customer journeys, and future expansion — see **[ecosystem-map.md](ecosystem-map.md)**.

Centari builds seven products. They are not seven separate things. They are one ecosystem designed to help organisations do three things:

> **Understand** complex physical and digital systems.  
> **Train for** scenarios they cannot afford to get wrong.  
> **Shape** the infrastructure and future they are responsible for.

Every product exists in relation to the others. None of them is complete alone.

---

## The ecosystem

```
┌─────────────────────────────────────────────────────┐
│                   CENTARI OS                        │
│         Platform layer — runs on hardware           │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
      FORGE          TWIN         INSIGHT
   Build & deploy   Model the    Understand
     systems        physical      the data
                    world
         │             │             │
         └─────────────┼─────────────┘
                       ▼
                   MISSION
               Plan & execute
                operations
                       │
                       ▼
                 WORKSTATION
              Where the work
                 happens
                       │
                  ┌────┘
                  ▼
                 LAB
          Test before it
            goes live
```

---

## Products

| Product | Role in the ecosystem | Primary verb |
|---------|-----------------------|-------------|
| [Centari OS](centari-os.md) | Platform foundation — runs on all Centari hardware | **Runs** |
| [Forge](forge.md) | Build and deploy system configurations | **Builds** |
| [Mission](mission.md) | Plan and execute multi-phase operations | **Executes** |
| [Twin](twin.md) | Model physical systems as live digital replicas | **Models** |
| [Insight](insight.md) | Surface meaning in operational data | **Understands** |
| [Workstation](workstation.md) | Unified environment for serious operational work | **Integrates** |
| [Lab](lab.md) | Safe environment to test before production | **Validates** |

---

## How they connect

**Forge** builds configurations and deploys them to systems running **Centari OS**. Before deployment, every configuration is validated in **Lab**.

**Twin** creates digital replicas of the physical systems Forge has configured. Twins stay synchronized with reality through sensors running on **Centari OS**.

**Mission** runs inside Twin environments. Teams plan, simulate, and execute operations within the models Twin provides.

**Insight** sits beneath everything — collecting data from Twins, Missions, and hardware — and surfaces the patterns that matter.

**Workstation** is where operators actually work. It brings together Twin, Mission, and Insight into a single environment designed for serious, time-critical tasks.

**Lab** is the safety net for the whole system. Nothing goes to production — no configuration, no mission plan, no model — without being validated in Lab first.

---

## What Centari is not building

- General-purpose analytics platforms
- Consumer-facing applications
- Tools that abstract away the physical world instead of connecting to it
- Products that only work in the cloud

Every product in this ecosystem is designed to work where the problem is — in the field, on the hardware, at the edge.
