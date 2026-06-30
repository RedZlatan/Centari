-- Migration: 003_research_seed
-- 32 curated seed signals covering all 7 domains and all 7 geographic regions.
-- Derived from src/data/research-signals.json (V2 schema).
-- All signals are inserted with status = 'approved' and reviewed_by = 'seed'.
-- All inserts are ON CONFLICT DO NOTHING — safe to re-run.

-- ── Sources ───────────────────────────────────────────────────────────────────

INSERT INTO sources (slug, name, tier) VALUES
    ('ai21-labs',                    'AI21 Labs',                      1),
    ('alice-and-bob-nature-physics', 'Alice & Bob / Nature Physics',   1),
    ('anthropic',                    'Anthropic',                      1),
    ('astroscale',                   'Astroscale',                     1),
    ('boston-dynamics',              'Boston Dynamics',                1),
    ('climeworks',                   'Climeworks',                     1),
    ('commonwealth-fusion-systems',  'Commonwealth Fusion Systems',    1),
    ('csiro',                        'CSIRO',                          1),
    ('esa',                          'ESA',                            1),
    ('eve-air-mobility',             'Eve Air Mobility',               2),
    ('figure-ai',                    'Figure AI',                      1),
    ('form-energy',                  'Form Energy',                    2),
    ('google-deepmind',              'Google DeepMind',                1),
    ('ibm-research',                 'IBM Research',                   1),
    ('imec',                         'imec',                           1),
    ('isro',                         'ISRO',                           1),
    ('kaist-hubo-lab',               'KAIST Hubo Lab',                 1),
    ('meta-reality-labs',            'Meta Reality Labs',              1),
    ('mistral-ai',                   'Mistral AI',                     1),
    ('mit-nature-materials',         'MIT / Nature Materials',         1),
    ('nature-microsoft',             'Nature / Microsoft',             1),
    ('northvolt',                    'Northvolt',                      2),
    ('pasqal',                       'PASQAL',                         1),
    ('physical-intelligence',        'Physical Intelligence',          1),
    ('quantinuum',                   'Quantinuum',                     1),
    ('samsung-semiconductor',        'Samsung Semiconductor',          1),
    ('siemens',                      'Siemens',                        1),
    ('skao',                         'SKAO',                           1),
    ('spacex',                       'SpaceX',                         1),
    ('tsmc',                         'TSMC',                           1),
    ('varjo',                        'Varjo',                          1),
    ('xai',                          'xAI',                            1)
ON CONFLICT (slug) DO NOTHING;

-- ── Signals ───────────────────────────────────────────────────────────────────
-- category maps to primary_domain in V2 schema

-- AI ──────────────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'google-deepmind-veo3-launch-2026-05',
    (SELECT id FROM sources WHERE slug = 'google-deepmind'),
    'https://deepmind.google/models/veo/',
    'Google DeepMind',
    '2026-05-20', '2026-06-01',
    'Google DeepMind releases Veo 3 with native audio and speech synthesis',
    'Veo 3 generates synchronised audio, ambient sound, and speech directly alongside video, marking a step toward fully multimodal AI media generation. Released via Google Vertex AI and integrated into Gemini products.',
    'ai', '{}', 'launch', '{"generative-ai","multimodal","video-synthesis"}',
    'verified', 9, 0.900, 0.88, 0.92,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'anthropic-claude-opus4-2026-05',
    (SELECT id FROM sources WHERE slug = 'anthropic'),
    'https://www.anthropic.com/news/claude-opus-4',
    'Anthropic',
    '2026-05-22', '2026-06-01',
    'Anthropic releases Claude Opus 4 with extended thinking and agentic capabilities',
    'Claude Opus 4 introduces extended thinking traces, improved multi-step reasoning, and native tool use for autonomous agent workflows. Positioned as the highest-capability model in the Claude 4 family.',
    'ai', '{}', 'launch', '{"llm","agentic-ai","reasoning","extended-thinking"}',
    'verified', 9, 0.900, 0.85, 0.92,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'mistral-le-chat-series-b-2026-03',
    (SELECT id FROM sources WHERE slug = 'mistral-ai'),
    'https://mistral.ai/news/series-b/',
    'Mistral AI',
    '2026-03-14', '2026-06-01',
    'Mistral AI raises €600M Series B to accelerate open model development',
    'French AI lab Mistral closes a €600M funding round led by General Catalyst, placing the company''s valuation above €6B. The round funds expansion of the Le Chat assistant and continued open-weight model releases.',
    'ai', '{}', 'funding', '{"open-weights","european-ai","series-b","llm"}',
    'verified', 8, 0.800, 0.65, 0.92,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'xai-grok3-release-2025-12',
    (SELECT id FROM sources WHERE slug = 'xai'),
    'https://x.ai/blog/grok-3',
    'xAI',
    '2025-12-09', '2026-06-01',
    'xAI releases Grok 3 with deep research mode and 1M context window',
    'Grok 3, trained on xAI''s 100,000-GPU Colossus cluster, introduces a deep research mode that autonomously browses the web and synthesises reports. The model posts top benchmark scores on MATH, GPQA, and LLM-as-judge evaluations.',
    'ai', '{}', 'release', '{"llm","deep-research","long-context","reasoning"}',
    'verified', 8, 0.800, 0.68, 0.92,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'ai21-jamba-moe-release-2024-03',
    (SELECT id FROM sources WHERE slug = 'ai21-labs'),
    'https://www.ai21.com/blog/announcing-jamba',
    'AI21 Labs',
    '2024-03-28', '2026-06-01',
    'AI21 Labs releases Jamba: first production SSM-transformer hybrid with MoE',
    'Jamba combines Mamba state-space layers with transformer attention blocks and mixture-of-experts routing, delivering a 256K context window at a fraction of the memory footprint of comparable dense models. AI21 releases Jamba under Apache 2.0.',
    'ai', '{}', 'release', '{"hybrid-architecture","moe","open-weights","long-context"}',
    'verified', 8, 0.800, 0.88, 0.92,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- XR ──────────────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'meta-aria-gen2-research-2025-09',
    (SELECT id FROM sources WHERE slug = 'meta-reality-labs'),
    'https://about.meta.com/realitylabs/aria/',
    'Meta Reality Labs',
    '2025-09-25', '2026-06-01',
    'Meta releases ARIA Gen 2 research glasses with on-device spatial AI',
    'The second generation of Meta''s ARIA research platform adds on-device neural inference, 200Hz eye-tracking, and an updated spatial audio array. Released to expanded academic research partners for spatial computing studies.',
    'xr', '{"ai"}', 'release', '{"ar-glasses","spatial-ai","edge-inference","research-platform"}',
    'verified', 8, 0.800, 0.72, 0.68,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'varjo-xr5-industrial-2026-01',
    (SELECT id FROM sources WHERE slug = 'varjo'),
    'https://varjo.com/products/xr-5/',
    'Varjo',
    '2026-01-16', '2026-06-01',
    'Varjo XR-5 ships to industrial customers with 70 PPD visual resolution',
    'Varjo''s XR-5 headset achieves 70 pixels-per-degree in the central foveal region, matching human visual acuity in the field of view most used for precision work. Deployed by Airbus, Volkswagen, and L3Harris for simulation and design review.',
    'xr', '{}', 'launch', '{"industrial-xr","visual-fidelity","simulation","defence"}',
    'verified', 8, 0.800, 0.75, 0.68,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'siemens-industrial-metaverse-2025-04',
    (SELECT id FROM sources WHERE slug = 'siemens'),
    'https://www.siemens.com/global/en/home/company/press/press-releases/2025/industrial-metaverse-core.html',
    'Siemens',
    '2025-04-23', '2026-06-01',
    'Siemens launches Industrial Metaverse Core for real-time digital twin collaboration',
    'Siemens launches Industrial Metaverse Core at Hannover Messe, enabling multi-site engineering teams to collaborate in a physics-accurate digital twin of factory floor layouts and equipment. Partners include NVIDIA Omniverse and Microsoft Azure.',
    'xr', '{"ai"}', 'launch', '{"digital-twin","industrial-xr","metaverse","manufacturing"}',
    'probable', 7, 0.700, 0.65, 0.68,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- Robotics ────────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'physical-intelligence-pi02-2025-11',
    (SELECT id FROM sources WHERE slug = 'physical-intelligence'),
    'https://www.physicalintelligence.company/blog/pi0',
    'Physical Intelligence',
    '2025-11-03', '2026-06-01',
    'Physical Intelligence publishes π0.2: generalist robot policy for dexterous manipulation',
    'π0.2 demonstrates a single robot policy transferring across manipulation tasks — folding laundry, preparing food, assembling parts — with minimal per-task fine-tuning. The approach uses flow matching over diffusion policies.',
    'robotics', '{"ai"}', 'lab_publication', '{"robot-policy","foundation-model","manipulation","dexterous"}',
    'verified', 9, 0.900, 0.92, 0.85,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'figure-ai-series-b-2025-02',
    (SELECT id FROM sources WHERE slug = 'figure-ai'),
    'https://www.figure.ai/news/series-b',
    'Figure AI',
    '2025-02-28', '2026-06-01',
    'Figure AI raises $675M Series B led by Microsoft, NVIDIA, and OpenAI',
    'Humanoid robotics company Figure AI closes a $675M Series B at a $2.6B valuation, accelerating deployment of Figure 02 in commercial manufacturing environments.',
    'robotics', '{"ai"}', 'funding', '{"humanoid-robotics","series-b","manufacturing"}',
    'probable', 9, 0.900, 0.70, 0.85,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'boston-dynamics-atlas-electric-2025-04',
    (SELECT id FROM sources WHERE slug = 'boston-dynamics'),
    'https://bostondynamics.com/blog/electric-new-era-atlas',
    'Boston Dynamics',
    '2025-04-16', '2026-06-01',
    'Boston Dynamics retires hydraulic Atlas, introduces all-electric Atlas for automotive assembly',
    'Boston Dynamics transitions Atlas to an all-electric platform, removing hydraulic systems entirely and partnering with Hyundai Motor Group for deployment in automotive production lines. The new design has greater range of motion than any previous Atlas iteration.',
    'robotics', '{}', 'launch', '{"humanoid-robotics","electric-actuator","automotive","boston-dynamics"}',
    'verified', 9, 0.900, 0.80, 0.85,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'kaist-hubo-obstacle-2025-09',
    (SELECT id FROM sources WHERE slug = 'kaist-hubo-lab'),
    'https://hubolab.kaist.ac.kr/',
    'KAIST Hubo Lab',
    '2025-09-18', '2026-06-01',
    'KAIST HUBO demonstrates real-time dynamic obstacle avoidance in unstructured terrain',
    'KAIST''s HUBO humanoid robot achieves real-time dynamic obstacle avoidance using depth point cloud processing and model-predictive foot placement, allowing uninterrupted locomotion over rubble and collapsed floor sections.',
    'robotics', '{"ai"}', 'lab_publication', '{"humanoid-robotics","obstacle-avoidance","locomotion","disaster-response"}',
    'probable', 7, 0.700, 0.75, 0.85,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- Quantum ─────────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'microsoft-majorana1-qubit-2025-02',
    (SELECT id FROM sources WHERE slug = 'nature-microsoft'),
    'https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1/',
    'Nature / Microsoft',
    '2025-02-19', '2026-06-01',
    'Microsoft demonstrates topological qubit with Majorana 1 chip',
    'Microsoft''s Majorana 1 chip demonstrates a topological qubit architecture based on topoconductor materials, with claimed error rates orders of magnitude lower than superconducting qubits. Published in Nature with independent verification.',
    'quantum', '{}', 'lab_publication', '{"topological-qubit","majorana","quantum-hardware","error-correction"}',
    'verified', 10, 1.000, 0.98, 0.82,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'ibm-condor-1000-qubit-2024-11',
    (SELECT id FROM sources WHERE slug = 'ibm-research'),
    'https://research.ibm.com/blog/ibm-quantum-condor',
    'IBM Research',
    '2024-11-04', '2026-06-01',
    'IBM unveils 1,000-qubit Condor processor and Heron utility-scale chip',
    'IBM''s Condor becomes the first processor to break the 1,000-qubit barrier, while the smaller Heron processor demonstrates lower error rates on practical quantum circuits. IBM sets a target of 100,000 qubits by 2033.',
    'quantum', '{}', 'launch', '{"superconducting-qubit","quantum-hardware","error-rate","scaling"}',
    'verified', 9, 0.900, 0.82, 0.82,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'quantinuum-h2-performance-2023-06',
    (SELECT id FROM sources WHERE slug = 'quantinuum'),
    'https://www.quantinuum.com/pressrelease/h2-record',
    'Quantinuum',
    '2023-06-14', '2026-06-01',
    'Quantinuum H2 sets world record on quantum volume and CLOPS benchmarks',
    'Quantinuum''s H2 trapped-ion processor achieves a quantum volume of 65,536 and posts circuit layer operations per second exceeding all other commercially available quantum hardware at the time. The system uses 56 fully-connected qubits with native mid-circuit measurement.',
    'quantum', '{}', 'lab_publication', '{"trapped-ion","quantum-volume","benchmark","error-correction"}',
    'verified', 9, 0.900, 0.85, 0.82,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'alice-bob-cat-qubit-2024-04',
    (SELECT id FROM sources WHERE slug = 'alice-and-bob-nature-physics'),
    'https://alice-bob.com/our-technology/cat-qubit-results-2024',
    'Alice & Bob / Nature Physics',
    '2024-04-09', '2026-06-01',
    'Alice & Bob demonstrates cat qubit suppressing bit-flip errors by 10,000×',
    'Paris-based Alice & Bob publishes hardware results showing their cat qubit architecture suppresses bit-flip errors by a factor of 10,000 versus phase-flip errors, enabling a resource-efficient pathway to fault tolerance. The approach could reduce physical-to-logical qubit overhead by 200×.',
    'quantum', '{}', 'lab_publication', '{"cat-qubit","error-suppression","fault-tolerance","bosonic-qubit"}',
    'verified', 8, 0.800, 0.92, 0.82,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'pasqal-neutral-atom-1000-2025-08',
    (SELECT id FROM sources WHERE slug = 'pasqal'),
    'https://www.pasqal.com/news/1000-qubit-processor-euroqcs',
    'PASQAL',
    '2025-08-27', '2026-06-01',
    'PASQAL delivers 1,000-qubit neutral atom processor to European research consortium',
    'PASQAL installs its first 1,000-qubit neutral atom quantum processor at a CEA facility under the EuroQCS programme. The system uses optical tweezers to trap rubidium atoms with individual addressing, targeting materials simulation and optimisation workloads.',
    'quantum', '{}', 'launch', '{"neutral-atom","1000-qubits","analog-quantum","quantum-simulation"}',
    'probable', 8, 0.800, 0.80, 0.82,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- Space ───────────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'spacex-starship-ift6-2025-11',
    (SELECT id FROM sources WHERE slug = 'spacex'),
    'https://www.spacex.com/launches/mission/?missionId=starship-flight-6',
    'SpaceX',
    '2025-11-19', '2026-06-01',
    'SpaceX Starship completes sixth integrated flight test with full booster catch',
    'Starship IFT-6 successfully launches from Boca Chica, completes orbital velocity flight, and catches the Super Heavy booster with mechazilla arms for the second consecutive time. Ship re-enters and splashes down in the Indian Ocean on target.',
    'space', '{}', 'launch', '{"starship","reusability","heavy-lift","full-flow-engine"}',
    'verified', 10, 1.000, 0.90, 0.75,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'astroscale-adras-j-rendezvous-2024-04',
    (SELECT id FROM sources WHERE slug = 'astroscale'),
    'https://astroscale.com/news/adras-j-rendezvous-milestone',
    'Astroscale',
    '2024-04-09', '2026-06-01',
    'Astroscale ADRAS-J completes world-first rendezvous with uncooperative orbital debris',
    'Astroscale''s ADRAS-J spacecraft manoeuvres to within metres of a defunct JAXA H-2A rocket upper stage, collecting the first close-range inspection imagery of a non-cooperative tumbling object. The mission demonstrates proximity operations needed for future active debris removal.',
    'space', '{}', 'launch', '{"orbital-debris","active-debris-removal","proximity-operations","sustainability"}',
    'verified', 9, 0.900, 0.95, 0.75,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'esa-hera-asteroid-2026-03',
    (SELECT id FROM sources WHERE slug = 'esa'),
    'https://www.esa.int/Space_Safety/Hera/Hera_arrives_at_the_Didymos_system',
    'ESA',
    '2026-03-07', '2026-06-01',
    'ESA''s Hera spacecraft enters Didymos asteroid orbit, confirms DART impact crater',
    'ESA''s Hera mission arrives at the Didymos binary asteroid system and confirms the DART impact dramatically reshuffled Dimorphos''s surface, leaving a 90-metre crater. Hera will map the system''s mass distribution to validate planetary defence models.',
    'space', '{}', 'launch', '{"planetary-defence","asteroid","dart-followup","esa"}',
    'verified', 8, 0.800, 0.78, 0.75,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'isro-chandrayaan4-announcement-2026-01',
    (SELECT id FROM sources WHERE slug = 'isro'),
    'https://www.isro.gov.in/Chandrayaan4.html',
    'ISRO',
    '2026-01-10', '2026-06-01',
    'ISRO approves Chandrayaan-4 lunar sample return mission for 2028',
    'India''s space agency receives government approval for Chandrayaan-4, a two-launch lunar sample return mission targeting the south polar region. If successful, India would become the fourth nation to return lunar samples to Earth.',
    'space', '{}', 'news', '{"lunar-sample-return","india-space","moon","chandrayaan"}',
    'probable', 8, 0.800, 0.72, 0.75,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'ska-mid-construction-2025-11',
    (SELECT id FROM sources WHERE slug = 'skao'),
    'https://www.skao.int/en/news/ska-mid-50-percent-milestone',
    'SKAO',
    '2025-11-20', '2026-06-01',
    'SKA-Mid array reaches 50% construction milestone in Karoo Desert',
    'The Square Kilometre Array Mid-Frequency telescope in South Africa passes 50% dish installation, with 74 of 197 antennas aligned and conducting early science observations of pulsar timing and HI galaxy surveys. First light on the full array is expected in 2028.',
    'space', '{}', 'news', '{"radio-telescope","ska","astronomy","south-africa"}',
    'probable', 7, 0.700, 0.70, 0.75,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- Energy ──────────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'commonwealth-fusion-sparc-2025-09',
    (SELECT id FROM sources WHERE slug = 'commonwealth-fusion-systems'),
    'https://cfs.energy/sparc',
    'Commonwealth Fusion Systems',
    '2025-09-12', '2026-06-01',
    'Commonwealth Fusion begins SPARC tokamak construction after HTS magnet validation',
    'Commonwealth Fusion Systems breaks ground on SPARC after its high-temperature superconducting magnet technology achieved 20 Tesla — strong enough to confine the plasma needed for net energy gain in a compact device. Full construction targets 2027 first plasma.',
    'energy', '{}', 'launch', '{"fusion-energy","hts-magnet","tokamak","net-energy"}',
    'verified', 10, 1.000, 0.97, 0.78,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'form-energy-iron-air-2025-10',
    (SELECT id FROM sources WHERE slug = 'form-energy'),
    'https://formenergy.com/news/form-energy-begins-production-weirton',
    'Form Energy',
    '2025-10-06', '2026-06-01',
    'Form Energy begins production of 100-hour iron-air batteries at West Virginia factory',
    'Form Energy''s first commercial factory begins producing iron-air batteries capable of 100 hours of continuous discharge, enabling multi-day storage that lithium-ion cannot economically provide. Technology uses iron pellets and oxygen, with no rare earth materials.',
    'energy', '{}', 'launch', '{"grid-storage","iron-air-battery","long-duration","decarbonisation"}',
    'probable', 9, 0.900, 0.88, 0.78,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'climeworks-mammoth-dac-2024-05',
    (SELECT id FROM sources WHERE slug = 'climeworks'),
    'https://climeworks.com/news/mammoth-full-capacity',
    'Climeworks',
    '2024-05-08', '2026-06-01',
    'Climeworks Mammoth plant reaches 36,000 tonnes per year CO₂ capture capacity',
    'Climeworks'' Mammoth facility in Iceland, the world''s largest direct air capture plant at the time of opening, reaches its rated 36,000 tonne per year CO₂ removal capacity using geothermal energy. The plant costs approximately $1,000 per tonne with a roadmap to $300 by 2030.',
    'energy', '{}', 'launch', '{"direct-air-capture","carbon-removal","geothermal","climate-tech"}',
    'verified', 9, 0.900, 0.90, 0.78,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'northvolt-gigafactory-expansion-2025-08',
    (SELECT id FROM sources WHERE slug = 'northvolt'),
    'https://northvolt.com/articles/northvolt-ett-16gwh',
    'Northvolt',
    '2025-08-20', '2026-06-01',
    'Northvolt completes first phase of Europe''s largest battery gigafactory in Skellefteå',
    'Northvolt Ett reaches 16 GWh annual production capacity in its first phase, supplying Volkswagen, BMW, and Scania with lithium-ion cells manufactured using renewable energy. Phase 2 targets 60 GWh, making it Europe''s largest single-site battery factory.',
    'energy', '{"materials"}', 'launch', '{"battery-manufacturing","ev-supply-chain","european-industry","gigafactory"}',
    'probable', 8, 0.800, 0.72, 0.78,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'embraer-evtol-certification-2025-04',
    (SELECT id FROM sources WHERE slug = 'eve-air-mobility'),
    'https://eveairmobility.com/news/structural-testing-complete',
    'Eve Air Mobility',
    '2025-04-15', '2026-06-01',
    'Eve Air Mobility eVTOL completes full-scale structural test campaign in Brazil',
    'Eve Air Mobility, spun out from Embraer, completes destructive and fatigue structural tests on its four-seat eVTOL airframe, clearing the path for ANAC type certification in Brazil and an anticipated 2026 commercial service entry in São Paulo urban air mobility corridors.',
    'energy', '{}', 'news', '{"evtol","urban-air-mobility","aviation","certification"}',
    'probable', 7, 0.700, 0.65, 0.78,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'csiro-solar-thermal-australia-2025-09',
    (SELECT id FROM sources WHERE slug = 'csiro'),
    'https://www.csiro.au/en/news/All/Articles/2025/September/solar-thermal-storage-hunter-valley',
    'CSIRO',
    '2025-09-03', '2026-06-01',
    'CSIRO and AGL commission grid-scale solar thermal storage in Hunter Valley',
    'Australia''s CSIRO and AGL commission a 30 MW solar thermal pilot with 14 hours of molten salt energy storage in the Hunter Valley, New South Wales. The project validates low-cost thermal storage paired with existing coal plant infrastructure at below AUD 100/MWh.',
    'energy', '{}', 'launch', '{"solar-thermal","molten-salt-storage","grid-scale","coal-transition"}',
    'probable', 7, 0.700, 0.68, 0.78,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- Materials ───────────────────────────────────────────────────────────────────

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'mit-photonic-metamaterial-2026-03',
    (SELECT id FROM sources WHERE slug = 'mit-nature-materials'),
    'https://news.mit.edu/2026/metamaterial-photonic-chip-crosstalk',
    'MIT / Nature Materials',
    '2026-03-21', '2026-06-01',
    'MIT engineers metamaterial layer that eliminates crosstalk in photonic quantum chips',
    'MIT researchers demonstrate a metamaterial electromagnetic shield that reduces photon crosstalk between adjacent waveguides in integrated photonic chips by 40 dB, a critical barrier to scaling photonic quantum processors beyond a few dozen qubits.',
    'materials', '{"quantum"}', 'paper', '{"metamaterial","photonics","quantum-chip","crosstalk"}',
    'verified', 8, 0.800, 0.85, 0.72,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'samsung-2nm-process-yield-2026-04',
    (SELECT id FROM sources WHERE slug = 'samsung-semiconductor'),
    'https://semiconductor.samsung.com/us/newsroom/news/samsung-foundry-2nm-gaa/',
    'Samsung Semiconductor',
    '2026-04-11', '2026-06-01',
    'Samsung Foundry achieves commercial yield on 2nm gate-all-around process node',
    'Samsung Foundry announces volume production readiness of its 2nm GAA (gate-all-around) process, delivering a 25% reduction in power consumption versus 3nm at equivalent performance. Initial customers include mobile and data centre AI accelerator designs.',
    'materials', '{"ai"}', 'news', '{"semiconductor","gate-all-around","2nm","ai-chip"}',
    'probable', 9, 0.900, 0.80, 0.72,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'tsmc-cowos-l-packaging-2025-11',
    (SELECT id FROM sources WHERE slug = 'tsmc'),
    'https://ir.tsmc.com/english/news/2025/tsmc-cowos-l-ramp',
    'TSMC',
    '2025-11-13', '2026-06-01',
    'TSMC ramps CoWoS-L advanced packaging to meet AI accelerator demand',
    'TSMC accelerates CoWoS-L (chip-on-wafer-on-substrate with fan-out redistribution) production at its Hsinchu campus to meet demand from NVIDIA H200 and Google TPUv5 orders. Package bandwidth density increases 40% versus prior CoWoS-S, enabling larger HBM stacks.',
    'materials', '{"ai"}', 'news', '{"advanced-packaging","ai-chip","hbm","semiconductor-manufacturing"}',
    'probable', 8, 0.800, 0.75, 0.72,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO signals (
    slug, source_id, source_url, source_name,
    published_at, ingested_at, title, summary,
    category, secondary_categories, signal_type, tags,
    confidence, curator_score, signal_strength, novelty_score, momentum_score,
    status, reviewed_by, reviewed_at
) VALUES (
    'imec-gaa-nanosheet-2025-04',
    (SELECT id FROM sources WHERE slug = 'imec'),
    'https://www.imec-int.com/en/press/imec-demonstrates-14nm-gaa-300mm',
    'imec',
    '2025-04-07', '2026-06-01',
    'imec demonstrates 1.4nm-equivalent gate-all-around nanosheet on 300mm wafer',
    'imec''s advanced semiconductor research centre demonstrates a fully functional gate-all-around nanosheet transistor equivalent to a 1.4nm node on a production-scale 300mm wafer, using high-NA EUV patterning. The result validates the CMOS scaling roadmap to 2030.',
    'materials', '{}', 'lab_publication', '{"gate-all-around","nanosheet","euv","transistor-scaling"}',
    'verified', 8, 0.800, 0.82, 0.72,
    'approved', 'seed', '2026-06-01'
) ON CONFLICT (slug) DO NOTHING;

-- ── Signal locations ──────────────────────────────────────────────────────────

INSERT INTO signal_locations (signal_id, city, country_code, country_name, region, lat, lng, location_confidence, place_type) VALUES
    ((SELECT id FROM signals WHERE slug = 'google-deepmind-veo3-launch-2026-05'),       'London',              'GB', 'United Kingdom',      'Europe',        51.507400,   -0.127800, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'anthropic-claude-opus4-2026-05'),             'San Francisco',       'US', 'United States',       'North America', 37.774900, -122.419400, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'mistral-le-chat-series-b-2026-03'),           'Paris',               'FR', 'France',              'Europe',        48.856600,    2.352200, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'xai-grok3-release-2025-12'),                  'Austin',              'US', 'United States',       'North America', 30.267200,  -97.743100, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'ai21-jamba-moe-release-2024-03'),             'Tel Aviv',            'IL', 'Israel',              'Middle East',   32.085300,   34.781800, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'meta-aria-gen2-research-2025-09'),            'Menlo Park',          'US', 'United States',       'North America', 37.452900, -122.181700, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'varjo-xr5-industrial-2026-01'),               'Helsinki',            'FI', 'Finland',             'Europe',        60.169500,   24.935400, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'siemens-industrial-metaverse-2025-04'),       'Munich',              'DE', 'Germany',             'Europe',        48.135100,   11.582000, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'physical-intelligence-pi02-2025-11'),         'San Francisco',       'US', 'United States',       'North America', 37.759900, -122.414800, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'figure-ai-series-b-2025-02'),                 'Sunnyvale',           'US', 'United States',       'North America', 37.368800, -122.036300, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'boston-dynamics-atlas-electric-2025-04'),     'Waltham',             'US', 'United States',       'North America', 42.376500,  -71.235600, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'kaist-hubo-obstacle-2025-09'),                'Daejeon',             'KR', 'South Korea',         'Asia-Pacific',  36.350400,  127.384500, 'high', 'institution'),
    ((SELECT id FROM signals WHERE slug = 'microsoft-majorana1-qubit-2025-02'),          'Redmond',             'US', 'United States',       'North America', 47.674000, -122.121500, 'high', 'lab'),
    ((SELECT id FROM signals WHERE slug = 'ibm-condor-1000-qubit-2024-11'),              'Armonk',              'US', 'United States',       'North America', 41.108700,  -73.716200, 'high', 'lab'),
    ((SELECT id FROM signals WHERE slug = 'quantinuum-h2-performance-2023-06'),          'Cambridge',           'GB', 'United Kingdom',      'Europe',        52.205300,    0.121800, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'alice-bob-cat-qubit-2024-04'),                'Paris',               'FR', 'France',              'Europe',        48.856600,    2.352200, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'pasqal-neutral-atom-1000-2025-08'),           'Massy',               'FR', 'France',              'Europe',        48.730600,    2.273300, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'spacex-starship-ift6-2025-11'),               'Boca Chica',          'US', 'United States',       'North America', 25.996900,  -97.155100, 'high', 'launch_site'),
    ((SELECT id FROM signals WHERE slug = 'astroscale-adras-j-rendezvous-2024-04'),      'Tokyo',               'JP', 'Japan',               'Asia-Pacific',  35.676200,  139.650300, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'esa-hera-asteroid-2026-03'),                  'Darmstadt',           'DE', 'Germany',             'Europe',        49.872800,    8.651200, 'high', 'institution'),
    ((SELECT id FROM signals WHERE slug = 'isro-chandrayaan4-announcement-2026-01'),     'Bengaluru',           'IN', 'India',               'Asia-Pacific',  12.971600,   77.594600, 'high', 'institution'),
    ((SELECT id FROM signals WHERE slug = 'ska-mid-construction-2025-11'),               'Carnarvon',           'ZA', 'South Africa',        'Africa',       -30.712900,   21.414300, 'high', 'launch_site'),
    ((SELECT id FROM signals WHERE slug = 'commonwealth-fusion-sparc-2025-09'),          'Cambridge',           'US', 'United States',       'North America', 42.360100,  -71.094200, 'high', 'lab'),
    ((SELECT id FROM signals WHERE slug = 'form-energy-iron-air-2025-10'),               'Weirton',             'US', 'United States',       'North America', 40.418700,  -80.588700, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'climeworks-mammoth-dac-2024-05'),             'Hellisheiði',         'IS', 'Iceland',             'Europe',        64.039500,  -21.200000, 'high', 'launch_site'),
    ((SELECT id FROM signals WHERE slug = 'northvolt-gigafactory-expansion-2025-08'),    'Skellefteå',          'SE', 'Sweden',              'Europe',        64.750300,   20.952800, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'embraer-evtol-certification-2025-04'),        'São José dos Campos', 'BR', 'Brazil',              'Latin America',-23.190400,  -45.884400, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'csiro-solar-thermal-australia-2025-09'),      'Newcastle',           'AU', 'Australia',           'Oceania',      -32.928300,  151.781700, 'medium', 'lab'),
    ((SELECT id FROM signals WHERE slug = 'mit-photonic-metamaterial-2026-03'),          'Cambridge',           'US', 'United States',       'North America', 42.360100,  -71.088900, 'high', 'institution'),
    ((SELECT id FROM signals WHERE slug = 'samsung-2nm-process-yield-2026-04'),          'Hwaseong',            'KR', 'South Korea',         'Asia-Pacific',  37.200300,  126.978900, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'tsmc-cowos-l-packaging-2025-11'),             'Hsinchu',             'TW', 'Taiwan',              'Asia-Pacific',  24.813800,  120.967500, 'high', 'hq'),
    ((SELECT id FROM signals WHERE slug = 'imec-gaa-nanosheet-2025-04'),                 'Leuven',              'BE', 'Belgium',             'Europe',        50.879800,    4.700500, 'high', 'institution')
ON CONFLICT DO NOTHING;

-- ── Signal entities (representative sample) ───────────────────────────────────

INSERT INTO signal_entities (signal_id, entity_type, name, canonical_name) VALUES
    ((SELECT id FROM signals WHERE slug = 'google-deepmind-veo3-launch-2026-05'),    'organization', 'Google DeepMind',             'Google DeepMind'),
    ((SELECT id FROM signals WHERE slug = 'google-deepmind-veo3-launch-2026-05'),    'product',      'Veo 3',                       'Veo 3'),
    ((SELECT id FROM signals WHERE slug = 'anthropic-claude-opus4-2026-05'),          'organization', 'Anthropic',                   'Anthropic'),
    ((SELECT id FROM signals WHERE slug = 'anthropic-claude-opus4-2026-05'),          'product',      'Claude Opus 4',               'Claude Opus 4'),
    ((SELECT id FROM signals WHERE slug = 'microsoft-majorana1-qubit-2025-02'),       'organization', 'Microsoft',                   'Microsoft'),
    ((SELECT id FROM signals WHERE slug = 'microsoft-majorana1-qubit-2025-02'),       'technology',   'Topological qubit',           'topological-qubit'),
    ((SELECT id FROM signals WHERE slug = 'microsoft-majorana1-qubit-2025-02'),       'product',      'Majorana 1',                  'Majorana 1'),
    ((SELECT id FROM signals WHERE slug = 'spacex-starship-ift6-2025-11'),            'organization', 'SpaceX',                      'SpaceX'),
    ((SELECT id FROM signals WHERE slug = 'spacex-starship-ift6-2025-11'),            'product',      'Starship',                    'Starship'),
    ((SELECT id FROM signals WHERE slug = 'commonwealth-fusion-sparc-2025-09'),       'organization', 'Commonwealth Fusion Systems', 'Commonwealth Fusion Systems'),
    ((SELECT id FROM signals WHERE slug = 'commonwealth-fusion-sparc-2025-09'),       'technology',   'High-temperature superconducting magnet', 'hts-magnet'),
    ((SELECT id FROM signals WHERE slug = 'physical-intelligence-pi02-2025-11'),      'organization', 'Physical Intelligence',       'Physical Intelligence'),
    ((SELECT id FROM signals WHERE slug = 'physical-intelligence-pi02-2025-11'),      'technology',   'Flow matching',               'flow-matching'),
    ((SELECT id FROM signals WHERE slug = 'figure-ai-series-b-2025-02'),              'organization', 'Figure AI',                   'Figure AI'),
    ((SELECT id FROM signals WHERE slug = 'figure-ai-series-b-2025-02'),              'organization', 'Microsoft',                   'Microsoft'),
    ((SELECT id FROM signals WHERE slug = 'figure-ai-series-b-2025-02'),              'organization', 'NVIDIA',                      'NVIDIA'),
    ((SELECT id FROM signals WHERE slug = 'samsung-2nm-process-yield-2026-04'),       'organization', 'Samsung Foundry',             'Samsung Foundry'),
    ((SELECT id FROM signals WHERE slug = 'samsung-2nm-process-yield-2026-04'),       'technology',   'Gate-all-around',             'gate-all-around'),
    ((SELECT id FROM signals WHERE slug = 'tsmc-cowos-l-packaging-2025-11'),          'organization', 'TSMC',                        'TSMC'),
    ((SELECT id FROM signals WHERE slug = 'tsmc-cowos-l-packaging-2025-11'),          'organization', 'NVIDIA',                      'NVIDIA'),
    ((SELECT id FROM signals WHERE slug = 'climeworks-mammoth-dac-2024-05'),          'organization', 'Climeworks',                  'Climeworks'),
    ((SELECT id FROM signals WHERE slug = 'climeworks-mammoth-dac-2024-05'),          'technology',   'Direct air capture',          'direct-air-capture'),
    ((SELECT id FROM signals WHERE slug = 'alice-bob-cat-qubit-2024-04'),             'organization', 'Alice & Bob',                 'Alice & Bob'),
    ((SELECT id FROM signals WHERE slug = 'alice-bob-cat-qubit-2024-04'),             'technology',   'Cat qubit',                   'cat-qubit'),
    ((SELECT id FROM signals WHERE slug = 'astroscale-adras-j-rendezvous-2024-04'),   'organization', 'Astroscale',                  'Astroscale'),
    ((SELECT id FROM signals WHERE slug = 'astroscale-adras-j-rendezvous-2024-04'),   'technology',   'Active debris removal',       'active-debris-removal')
ON CONFLICT DO NOTHING;

-- ── Trends ────────────────────────────────────────────────────────────────────

INSERT INTO trends (slug, title, summary, primary_category, status, trend_score, momentum_score, signal_count, first_signal_at, last_signal_at) VALUES
(
    'foundation-model-arms-race',
    'Foundation Model Arms Race',
    'AI labs across the US, Europe, and Middle East are shipping landmark general-purpose models at an accelerating rate. Competing approaches — pure transformers, hybrid SSM-transformer architectures, and MoE routing — are converging toward multi-modal, agentic systems with million-token contexts. Funding rounds of €600M+ validate sustained investor confidence.',
    'ai', 'active', 8.60, 0.92, 5,
    '2024-03-28', '2026-05-22'
),
(
    'humanoid-robotics-commercialisation',
    'Humanoid Robotics Commercialisation',
    'The humanoid robot sector moved from research demos to production deployments in 2024–2026. Multiple companies secured Series B rounds at multi-billion valuations, opened dedicated manufacturing facilities, and began shipping to automotive and logistics customers. Foundation robot policies are enabling faster task generalisation without per-task training.',
    'robotics', 'active', 9.10, 0.85, 4,
    '2025-02-28', '2026-02-14'
),
(
    'quantum-error-correction-milestone',
    'Quantum Error Correction Milestones',
    'Three distinct qubit architectures — topological (Majorana), trapped ion (Quantinuum H2), and bosonic cat qubit (Alice & Bob) — published landmark error suppression results in 2023–2025. Each takes a different path to fault tolerance, but all point toward the same outcome: programmable quantum computers that can run circuits too deep for classical simulation.',
    'quantum', 'active', 8.90, 0.82, 4,
    '2023-06-14', '2025-08-27'
),
(
    'compact-fusion-energy-race',
    'Compact Fusion Energy Race',
    'Commonwealth Fusion Systems''s SPARC groundbreak — backed by validated 20T HTS magnet technology — signals that a compact tokamak producing net energy gain may arrive before 2030. Alongside long-duration battery storage (Form Energy) and direct air capture (Climeworks), a cluster of deep-energy technologies reached construction or production milestones simultaneously.',
    'energy', 'active', 9.30, 0.78, 4,
    '2024-05-08', '2025-10-06'
),
(
    'advanced-semiconductor-scaling',
    'Advanced Semiconductor Scaling',
    'The sub-2nm node era is becoming real. Samsung Foundry demonstrated commercial yield on 2nm GAA process; TSMC ramped CoWoS-L advanced packaging to meet AI accelerator demand; imec validated the 1.4nm-equivalent nanosheet transistor on a production wafer. AI chip demand is driving semiconductor scaling faster than any previous technology cycle.',
    'materials', 'active', 8.20, 0.72, 3,
    '2025-04-07', '2026-04-11'
)
ON CONFLICT (slug) DO NOTHING;

-- ── Trend signals ─────────────────────────────────────────────────────────────

INSERT INTO trend_signals (trend_id, signal_id, relevance_score) VALUES
-- Foundation model arms race
((SELECT id FROM trends WHERE slug = 'foundation-model-arms-race'), (SELECT id FROM signals WHERE slug = 'anthropic-claude-opus4-2026-05'),        1.000),
((SELECT id FROM trends WHERE slug = 'foundation-model-arms-race'), (SELECT id FROM signals WHERE slug = 'google-deepmind-veo3-launch-2026-05'),   0.950),
((SELECT id FROM trends WHERE slug = 'foundation-model-arms-race'), (SELECT id FROM signals WHERE slug = 'xai-grok3-release-2025-12'),             0.900),
((SELECT id FROM trends WHERE slug = 'foundation-model-arms-race'), (SELECT id FROM signals WHERE slug = 'mistral-le-chat-series-b-2026-03'),      0.800),
((SELECT id FROM trends WHERE slug = 'foundation-model-arms-race'), (SELECT id FROM signals WHERE slug = 'ai21-jamba-moe-release-2024-03'),        0.700),

-- Humanoid robotics
((SELECT id FROM trends WHERE slug = 'humanoid-robotics-commercialisation'), (SELECT id FROM signals WHERE slug = 'physical-intelligence-pi02-2025-11'),  1.000),
((SELECT id FROM trends WHERE slug = 'humanoid-robotics-commercialisation'), (SELECT id FROM signals WHERE slug = 'boston-dynamics-atlas-electric-2025-04'), 0.950),
((SELECT id FROM trends WHERE slug = 'humanoid-robotics-commercialisation'), (SELECT id FROM signals WHERE slug = 'figure-ai-series-b-2025-02'),       0.900),
((SELECT id FROM trends WHERE slug = 'humanoid-robotics-commercialisation'), (SELECT id FROM signals WHERE slug = 'kaist-hubo-obstacle-2025-09'),      0.600),

-- Quantum error correction
((SELECT id FROM trends WHERE slug = 'quantum-error-correction-milestone'), (SELECT id FROM signals WHERE slug = 'microsoft-majorana1-qubit-2025-02'),   1.000),
((SELECT id FROM trends WHERE slug = 'quantum-error-correction-milestone'), (SELECT id FROM signals WHERE slug = 'alice-bob-cat-qubit-2024-04'),         0.950),
((SELECT id FROM trends WHERE slug = 'quantum-error-correction-milestone'), (SELECT id FROM signals WHERE slug = 'quantinuum-h2-performance-2023-06'),   0.900),
((SELECT id FROM trends WHERE slug = 'quantum-error-correction-milestone'), (SELECT id FROM signals WHERE slug = 'pasqal-neutral-atom-1000-2025-08'),    0.700),

-- Compact fusion + energy storage
((SELECT id FROM trends WHERE slug = 'compact-fusion-energy-race'), (SELECT id FROM signals WHERE slug = 'commonwealth-fusion-sparc-2025-09'), 1.000),
((SELECT id FROM trends WHERE slug = 'compact-fusion-energy-race'), (SELECT id FROM signals WHERE slug = 'form-energy-iron-air-2025-10'),      0.850),
((SELECT id FROM trends WHERE slug = 'compact-fusion-energy-race'), (SELECT id FROM signals WHERE slug = 'climeworks-mammoth-dac-2024-05'),    0.750),
((SELECT id FROM trends WHERE slug = 'compact-fusion-energy-race'), (SELECT id FROM signals WHERE slug = 'northvolt-gigafactory-expansion-2025-08'), 0.600),

-- Advanced semiconductor scaling
((SELECT id FROM trends WHERE slug = 'advanced-semiconductor-scaling'), (SELECT id FROM signals WHERE slug = 'samsung-2nm-process-yield-2026-04'),   1.000),
((SELECT id FROM trends WHERE slug = 'advanced-semiconductor-scaling'), (SELECT id FROM signals WHERE slug = 'tsmc-cowos-l-packaging-2025-11'),      0.900),
((SELECT id FROM trends WHERE slug = 'advanced-semiconductor-scaling'), (SELECT id FROM signals WHERE slug = 'imec-gaa-nanosheet-2025-04'),          0.850)
ON CONFLICT DO NOTHING;
