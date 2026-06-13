# Source Registry v1

Approved real-world sources for the Centari Research Map ingestion pipeline.  
All sources in this registry have been evaluated for reliability, access model, and domain fit before any worker is built.

**Schema version:** 1  
**Last updated:** 2026-06-13  
**Total sources:** 30

---

## Field definitions

| Field | Values | Notes |
|---|---|---|
| `type` | `API` / `RSS` / `manual` / `dataset` | Primary access method |
| `domain` | AI, Spatial/XR, Robotics, Quantum, Space, Energy, Materials, Nano, Security, Infrastructure | Primary domain tag; a source may cover multiple |
| `priority` | P1 / P2 / P3 | P1 = build first; P3 = later or optional |
| `cost` | Free / Freemium / Paid | Cost to access at expected volume |
| `rate_limit` | requests/window or "unknown" | Documented or observed limit |
| `reliability` | 1–5 | 5 = peer-reviewed, stable API; 1 = scrape-only, unstable |
| `signal_type` | `lab_publication` / `funding` / `launch` / `patent` / `news` / `paper` / `release` | Maps to `signal_type` in the DB schema |

---

## P1 Sources — Build first

These are stable APIs or structured datasets with high signal quality and low maintenance cost.

---

### 1. arXiv

| Field | Value |
|---|---|
| **Name** | arXiv |
| **Organization** | Cornell University / arXiv.org |
| **Type** | API |
| **Primary URL** | https://arxiv.org/help/api |
| **Domain** | AI, Quantum, Space, Materials, Energy |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | 3 req/s, recommended 1 req/s with delay |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `paper` |
| **Implementation notes** | Use the arXiv API (Atom/XML). Query by category: `cs.AI`, `cs.RO`, `quant-ph`, `astro-ph`, `cond-mat.mtrl-sci`. Results include title, abstract, authors, submitted date, DOI link. No authentication required. Export new submissions via `search_query=submittedDate:[YYYYMMDD TO YYYYMMDD]`. Prefer RSS feeds per category for near-realtime updates. |

---

### 2. NASA Technical Reports Server (NTRS)

| Field | Value |
|---|---|
| **Name** | NASA NTRS |
| **Organization** | NASA |
| **Type** | API |
| **Primary URL** | https://ntrs.nasa.gov/api/citations/search |
| **Domain** | Space, Energy, Materials |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Unknown; conservative 1 req/s recommended |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `paper` |
| **Implementation notes** | REST JSON API. No authentication required. Query by `keywords`, `dateFrom`, `dateTo`. Fields: title, abstract, authors, publication date, report number, document URL. Good for space tech, propulsion, materials, and energy research. Paginate via `from` + `size` parameters. |

---

### 3. NASA APIs (Open Data)

| Field | Value |
|---|---|
| **Name** | NASA Open APIs |
| **Organization** | NASA |
| **Type** | API |
| **Primary URL** | https://api.nasa.gov |
| **Domain** | Space |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | 1,000 req/hour (demo key); higher with registered key |
| **Reliability** | 5 |
| **Expected signal type** | `launch`, `news` |
| **Implementation notes** | NASA API suite includes: EONET (Earth events), Exoplanet Archive, Mars Rover Photos, Mission coverage. For Research Map, focus on EONET and mission announcements via `https://api.nasa.gov/planetary/`. Requires free API key registration at api.nasa.gov. |

---

### 4. OpenAlex

| Field | Value |
|---|---|
| **Name** | OpenAlex |
| **Organization** | OurResearch |
| **Type** | API |
| **Primary URL** | https://docs.openalex.org |
| **Domain** | AI, Quantum, Robotics, Materials, Energy, Space |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | 10 req/s unauthenticated; 100 req/s with `mailto=` polite pool |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `paper` |
| **Implementation notes** | Comprehensive open scholarly graph. Query `/works` by `concepts.id`, `publication_year`, `type`. Concepts cover all Centari domains. Include `mailto=` param for polite pool to raise rate limits. Full metadata: title, abstract, DOI, venue, citations, author institutions, open access status. Use `cursor` pagination for large result sets. Best wide-coverage source for cross-domain publications. |

---

### 5. Semantic Scholar

| Field | Value |
|---|---|
| **Name** | Semantic Scholar Academic Graph |
| **Organization** | Allen Institute for AI |
| **Type** | API |
| **Primary URL** | https://api.semanticscholar.org/graph/v1 |
| **Domain** | AI, Robotics, Quantum, Materials |
| **Priority** | P1 |
| **Cost** | Free (bulk: free with partnership) |
| **Rate limit** | 100 req/5 min unauthenticated; 1 req/s with API key |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `paper` |
| **Implementation notes** | Query `/paper/search` with `query`, `fields`, `year`. Returns title, abstract, authors, venue, citation count, influence scores, tldr (AI-generated summary). API key from semanticscholar.org/product/api. Particularly strong on AI/ML coverage and citation influence metrics. Use `influentialCitationCount` as a proxy signal for importance. |

---

### 6. Crossref

| Field | Value |
|---|---|
| **Name** | Crossref |
| **Organization** | Crossref |
| **Type** | API |
| **Primary URL** | https://api.crossref.org |
| **Domain** | AI, Quantum, Materials, Energy, Space |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Polite pool: higher limits with `mailto=`; ~50 req/s |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `paper` |
| **Implementation notes** | DOI metadata registry. Query `/works` by `filter=from-pub-date:{date},until-pub-date:{date}&query.subject={field}`. Good for resolving DOIs and pulling structured citation metadata. Use as a complement to OpenAlex for DOI resolution and publisher metadata. Add `mailto=` param to the `User-Agent` header for polite pool access. |

---

### 7. NSF Award Search

| Field | Value |
|---|---|
| **Name** | NSF Awards |
| **Organization** | National Science Foundation |
| **Type** | API |
| **Primary URL** | https://www.research.gov/common/webapi/awardapisearch-v1.htm |
| **Domain** | AI, Quantum, Materials, Energy, Robotics |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Not publicly documented; 1 req/s safe |
| **Reliability** | 5 |
| **Expected signal type** | `funding` |
| **Implementation notes** | REST API, JSON or XML output. Query by `keyword`, `dateStart`, `dateEnd`, `agency`. Returns award title, abstract, PI, institution, amount, start/end dates, program area. Excellent signal for early-stage government-funded research across all hard-tech domains. No API key required. |

---

### 8. ESA Publications

| Field | Value |
|---|---|
| **Name** | ESA Publications |
| **Organization** | European Space Agency |
| **Type** | RSS / API |
| **Primary URL** | https://www.esa.int/Newsroom/Press_Releases |
| **Domain** | Space |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `launch`, `news`, `lab_publication` |
| **Implementation notes** | ESA provides RSS feeds for press releases, mission updates, and news. Primary feed: `https://www.esa.int/rssfeed/Our_Activities/Space_Science`. Also accessible via ESAC science data portal for technical reports. Supplement with ESA's Open Data Portal for structured mission data at `https://data.esa.int`. |

---

### 9. DARPA News and Programmes

| Field | Value |
|---|---|
| **Name** | DARPA |
| **Organization** | Defense Advanced Research Projects Agency |
| **Type** | RSS |
| **Primary URL** | https://www.darpa.mil/news-events/announcements |
| **Domain** | AI, Robotics, Quantum, Space, Materials, Security |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 4 |
| **Expected signal type** | `funding`, `launch`, `news` |
| **Implementation notes** | RSS feed at `https://www.darpa.mil/rss-feeds.xml`. Covers programme announcements, BAAs (Broad Agency Announcements), and programme completion news. DARPA announcements are leading indicators — they typically signal investment direction 3–5 years ahead of commercial products. Filter by programme office: I2O (Information), MTO (Microsystems), DSO (Defense Sciences), TTO (Tactical Technology). |

---

### 10. NREL (National Renewable Energy Laboratory)

| Field | Value |
|---|---|
| **Name** | NREL |
| **Organization** | National Renewable Energy Laboratory (US DOE) |
| **Type** | API / RSS |
| **Primary URL** | https://developer.nrel.gov |
| **Domain** | Energy |
| **Priority** | P1 |
| **Cost** | Free (API key required) |
| **Rate limit** | Varies by endpoint; ~1,000 req/day standard |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news`, `launch` |
| **Implementation notes** | NREL developer portal provides APIs for solar, wind, biomass, and grid data. For signal ingestion, use the publications feed and the NREL News RSS (`https://www.nrel.gov/news/rss/news-releases.xml`). Technical publications available via NREL's Technical Report API. API key registration at developer.nrel.gov. Strong for energy transition signals including cost curves, grid storage, and solar efficiency records. |

---

## P1 Sources — Institutional research feeds

---

### 11. MIT CSAIL

| Field | Value |
|---|---|
| **Name** | MIT CSAIL News |
| **Organization** | MIT Computer Science and Artificial Intelligence Laboratory |
| **Type** | RSS |
| **Primary URL** | https://www.csail.mit.edu/news |
| **Domain** | AI, Robotics |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS feed: `https://www.csail.mit.edu/news/rss.xml`. Covers AI, robotics, computer vision, NLP, and systems research. High signal quality — CSAIL is one of the most influential AI/robotics labs globally. Supplement with MIT News AI category: `https://news.mit.edu/topic/artificial-intelligence2/rss`. |

---

### 12. Stanford HAI

| Field | Value |
|---|---|
| **Name** | Stanford HAI |
| **Organization** | Stanford Institute for Human-Centered Artificial Intelligence |
| **Type** | RSS |
| **Primary URL** | https://hai.stanford.edu/news |
| **Domain** | AI |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS feed at `https://hai.stanford.edu/news/rss.xml`. Strong coverage of AI safety, foundation models, AI policy, and AI/healthcare. Also monitor the HAI AI Index annual report as a dataset-level signal. Complements arXiv by providing interpreted context around research milestones. |

---

### 13. Carnegie Mellon Robotics Institute

| Field | Value |
|---|---|
| **Name** | CMU Robotics Institute |
| **Organization** | Carnegie Mellon University |
| **Type** | RSS |
| **Primary URL** | https://www.ri.cmu.edu/news/ |
| **Domain** | Robotics, AI |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://www.ri.cmu.edu/feed/`. One of the world's top robotics research centres. Covers autonomous vehicles, manipulation, locomotion, human-robot interaction. Cross-reference with CMU's robotics arXiv submissions (`cs.RO`) for earlier signals. |

---

### 14. ETH Zürich AI Center

| Field | Value |
|---|---|
| **Name** | ETH Zürich AI Center |
| **Organization** | ETH Zürich |
| **Type** | RSS |
| **Primary URL** | https://ai.ethz.ch/news.html |
| **Domain** | AI, Robotics, Materials |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://ai.ethz.ch/news.xml`. Covers AI, robotics (ANYbotics spinoff origin), and materials ML. Also monitor ETH's Autonomous Systems Lab and Robotic Systems Lab feeds. Strong European AI signal source — important for geographic diversity in the Research Map. |

---

### 15. MIT Media Lab

| Field | Value |
|---|---|
| **Name** | MIT Media Lab |
| **Organization** | MIT |
| **Type** | RSS |
| **Primary URL** | https://www.media.mit.edu/posts/ |
| **Domain** | AI, Spatial/XR, Robotics |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 4 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://www.media.mit.edu/feed/`. Covers human-computer interaction, wearables, tangible interfaces, AI creativity, spatial computing. Broader scope than CSAIL — more exploratory. Filter by research group (Fluid Interfaces, Responsive Environments, Camera Culture) to target XR and spatial signals. |

---

### 16. DeepMind Research

| Field | Value |
|---|---|
| **Name** | DeepMind Blog / Research |
| **Organization** | Google DeepMind |
| **Type** | RSS |
| **Primary URL** | https://deepmind.google/research/ |
| **Domain** | AI |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `launch`, `news` |
| **Implementation notes** | RSS at `https://deepmind.google/blog/rss.xml`. Covers flagship model releases (Gemini, AlphaFold, Veo), AI safety, and scientific AI (biology, mathematics). Very high signal density for AI domain. Cross-reference with DeepMind arXiv submissions for earlier signals before blog publication. |

---

### 17. Meta Reality Labs Research

| Field | Value |
|---|---|
| **Name** | Meta AI / Reality Labs Research |
| **Organization** | Meta |
| **Type** | RSS |
| **Primary URL** | https://ai.meta.com/research/ |
| **Domain** | AI, Spatial/XR |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 4 |
| **Expected signal type** | `lab_publication`, `launch`, `news` |
| **Implementation notes** | RSS at `https://ai.meta.com/blog/rss/`. Monitor both Meta AI (LLM, Llama, FAIR) and Meta Reality Labs (Quest, ARIA, holographic displays) feeds separately. `https://www.meta.com/blog/quest/rss/` for XR product signals. Reality Labs publishes infrequently but at very high signal value for XR domain. |

---

### 18. Microsoft Research

| Field | Value |
|---|---|
| **Name** | Microsoft Research Blog |
| **Organization** | Microsoft |
| **Type** | RSS |
| **Primary URL** | https://www.microsoft.com/en-us/research/blog/ |
| **Domain** | AI, Quantum, Materials |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `launch`, `news` |
| **Implementation notes** | RSS at `https://www.microsoft.com/en-us/research/feed/`. Covers AI (Azure AI, Copilot research), quantum computing (Majorana, Azure Quantum), and materials science. Cross-reference with Microsoft's Nature/Science publications via Crossref/OpenAlex for high-impact signals. Monitor Azure Quantum blog separately for quantum hardware signals. |

---

### 19. NVIDIA Research

| Field | Value |
|---|---|
| **Name** | NVIDIA Research |
| **Organization** | NVIDIA |
| **Type** | RSS |
| **Primary URL** | https://research.nvidia.com |
| **Domain** | AI, Robotics, Spatial/XR |
| **Priority** | P1 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 4 |
| **Expected signal type** | `lab_publication`, `launch`, `news` |
| **Implementation notes** | RSS at `https://blogs.nvidia.com/blog/category/research/feed/`. Covers AI hardware, neural rendering (NeRF/Gaussian splatting), robotics simulation (Isaac), and Omniverse (XR/metaverse). Particularly strong for AI infrastructure signals (H100, Blackwell announcements). Also monitor NVIDIA Technical Blog for applied engineering signals. |

---

## P2 Sources — Quantum and deep science

---

### 20. IBM Quantum

| Field | Value |
|---|---|
| **Name** | IBM Quantum Research |
| **Organization** | IBM |
| **Type** | RSS |
| **Primary URL** | https://research.ibm.com/quantum-computing |
| **Domain** | Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `launch` |
| **Implementation notes** | RSS at `https://research.ibm.com/blog/rss`. IBM posts roadmap milestones, qubit count records, and error correction results. Cross-reference with IBM Research arXiv (`quant-ph`, `cond-mat.supr-con`). IBM's 2033 roadmap (100,000+ qubits) makes them a consistent source of milestone signals. Monitor IBM Quantum Network announcements for ecosystem/partnership signals. |

---

### 21. IonQ

| Field | Value |
|---|---|
| **Name** | IonQ Research |
| **Organization** | IonQ |
| **Type** | RSS |
| **Primary URL** | https://ionq.com/news |
| **Domain** | Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 4 |
| **Expected signal type** | `launch`, `news`, `lab_publication` |
| **Implementation notes** | RSS at `https://ionq.com/news/rss`. Covers trapped-ion quantum hardware milestones (#AQ benchmarks), cloud access expansions, and government contracts. As a public company (NYSE: IONQ), also monitor SEC filings and earnings releases for commercially-relevant signals. Cross-reference with arXiv `quant-ph` for accompanying papers. |

---

### 22. Rigetti Computing

| Field | Value |
|---|---|
| **Name** | Rigetti Research |
| **Organization** | Rigetti Computing |
| **Type** | RSS |
| **Primary URL** | https://www.rigetti.com/news |
| **Domain** | Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 3 |
| **Expected signal type** | `launch`, `news` |
| **Implementation notes** | RSS at `https://www.rigetti.com/feed`. Covers superconducting qubit systems, Ankaa processors, and hybrid quantum-classical computing. Reliability score reflects that Rigetti has had operational challenges; cross-validate major claims with arXiv papers before ingestion. Public company (NASDAQ: RGTI) — SEC filings supplement news for material milestones. |

---

### 23. QuTech

| Field | Value |
|---|---|
| **Name** | QuTech News |
| **Organization** | QuTech (TU Delft / TNO) |
| **Type** | RSS |
| **Primary URL** | https://qutech.nl/newsroom/ |
| **Domain** | Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://qutech.nl/feed/`. Covers topological qubits, quantum internet, spin qubits, and superconducting qubits. European quantum flagship participant. Strong scientific credibility — Nature/Science papers common. QuTech is affiliated with Microsoft's quantum programme (Station Q collaboration), making it relevant for topological qubit signals alongside Microsoft Research. |

---

### 24. Perimeter Institute

| Field | Value |
|---|---|
| **Name** | Perimeter Institute |
| **Organization** | Perimeter Institute for Theoretical Physics |
| **Type** | RSS |
| **Primary URL** | https://perimeterinstitute.ca/news |
| **Domain** | Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://perimeterinstitute.ca/rss.xml`. Covers fundamental quantum physics, quantum gravity, quantum information theory, and condensed matter. Signals from Perimeter are often foundational rather than applied — high long-term importance. Volume is lower than applied labs; every post is typically high value. |

---

## P2 Sources — National labs

---

### 25. Lawrence Berkeley National Laboratory

| Field | Value |
|---|---|
| **Name** | Lawrence Berkeley Lab (LBNL) |
| **Organization** | US DOE / UC Berkeley |
| **Type** | RSS |
| **Primary URL** | https://newscenter.lbl.gov |
| **Domain** | Energy, Materials, Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://newscenter.lbl.gov/feed/`. Covers batteries, solar, fusion (NIF adjacent), quantum materials, and biosciences. Particularly strong for energy storage and materials signals. Cross-reference technical papers via OSTI.gov (DOE scientific database, free API at https://www.osti.gov/api/v1). |

---

### 26. Oak Ridge National Laboratory

| Field | Value |
|---|---|
| **Name** | Oak Ridge National Laboratory |
| **Organization** | US DOE / UT-Battelle |
| **Type** | RSS |
| **Primary URL** | https://www.ornl.gov/news |
| **Domain** | Energy, Materials, AI |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://www.ornl.gov/rss.xml`. Covers nuclear energy, supercomputing (Frontier — world's first exascale computer), advanced materials, and AI for science. High impact for energy transition and computational science signals. Supplement with OSTI.gov API for technical reports. |

---

### 27. Argonne National Laboratory

| Field | Value |
|---|---|
| **Name** | Argonne National Laboratory |
| **Organization** | US DOE / University of Chicago |
| **Type** | RSS |
| **Primary URL** | https://www.anl.gov/news |
| **Domain** | Energy, Materials, Quantum |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://www.anl.gov/rss`. Covers battery technology (JCESR), quantum information science, advanced photon source, and nuclear energy. Argonne operates one of the US's dedicated quantum computing testbeds. Strong for energy materials and quantum signals. |

---

## P2 Sources — European research organisations

---

### 28. Max Planck Society

| Field | Value |
|---|---|
| **Name** | Max Planck Society |
| **Organization** | Max-Planck-Gesellschaft |
| **Type** | RSS |
| **Primary URL** | https://www.mpg.de/en/news |
| **Domain** | AI, Materials, Quantum, Energy |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://www.mpg.de/en/rss/news`. Covers fundamental and applied physics, chemistry, informatics (Max Planck Institute for Intelligent Systems is a leading AI/robotics lab), and neuroscience. 84 institutes — filter by institute for domain precision. The MPI for Intelligent Systems (Tübingen/Stuttgart) is particularly relevant for AI and robotics signals. |

---

### 29. Fraunhofer Society

| Field | Value |
|---|---|
| **Name** | Fraunhofer Society |
| **Organization** | Fraunhofer-Gesellschaft |
| **Type** | RSS |
| **Primary URL** | https://www.fraunhofer.de/en/press.html |
| **Domain** | AI, Materials, Energy, Robotics |
| **Priority** | P2 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 4 |
| **Expected signal type** | `lab_publication`, `news`, `launch` |
| **Implementation notes** | RSS at `https://www.fraunhofer.de/en/press/rss.html`. Applied research focus — covers industrial AI, manufacturing robotics, photovoltaics (Fraunhofer ISE is the world's largest solar research institute), and advanced materials. Strong for European industrial technology signals. 76 institutes; filtering by institute ID recommended for domain precision. |

---

## P3 Sources — Scientific infrastructure

---

### 30. CERN

| Field | Value |
|---|---|
| **Name** | CERN |
| **Organization** | European Organisation for Nuclear Research |
| **Type** | RSS / API |
| **Primary URL** | https://home.cern/news |
| **Domain** | Materials, Quantum, Energy |
| **Priority** | P3 |
| **Cost** | Free |
| **Rate limit** | Standard web rate limits |
| **Reliability** | 5 |
| **Expected signal type** | `lab_publication`, `news` |
| **Implementation notes** | RSS at `https://home.cern/api/news/news/rss`. CERN's primary research output is high-energy physics, but secondary applications — superconducting magnets (directly relevant to fusion energy), particle detector materials, computing grid infrastructure — are of interest to the Research Map. Also monitor CERN Open Data Portal and INSPIRE-HEP (`https://inspirehep.net/api/literature`) for paper-level signals. Lower frequency of Research Map-relevant signals than P1/P2 sources; monitor quarterly. |

---

## Coverage summary

| Domain | P1 sources | P2 sources | P3 sources |
|---|---|---|---|
| AI | arXiv, OpenAlex, Semantic Scholar, Crossref, MIT CSAIL, Stanford HAI, DeepMind, Meta RL, NVIDIA, Microsoft Research | Max Planck, Fraunhofer, CMU Robotics | — |
| Robotics | arXiv, CMU Robotics, NVIDIA Research | ETH Zürich, Fraunhofer, Max Planck | — |
| Quantum | arXiv, NSF Awards, Microsoft Research | IBM Quantum, IonQ, Rigetti, QuTech, Perimeter, Argonne | CERN |
| Space | arXiv, NASA NTRS, NASA APIs, ESA | — | — |
| Energy | arXiv, NSF Awards, NREL | Lawrence Berkeley, Oak Ridge, Argonne, Fraunhofer | CERN |
| Materials | arXiv, OpenAlex, NSF Awards | Lawrence Berkeley, Argonne, Max Planck, Fraunhofer | CERN |
| Spatial/XR | Meta RL, NVIDIA Research, MIT Media Lab | ETH Zürich | — |
| Security | DARPA | — | — |
| Infrastructure | DARPA, NSF Awards | Oak Ridge | — |
