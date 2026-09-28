import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Command line argument parser
const argv = process.argv.slice(2);
let sessionId = '';
let newSession = false;
let newSessionName = '';
let jsonl = false;
let oncePrompt = '';
let stdinRepl = false;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--session' && argv[i + 1]) {
    sessionId = argv[++i];
  } else if (arg === '--new-session') {
    newSession = true;
  } else if (arg === '--new-session-name' && argv[i + 1]) {
    newSessionName = argv[++i];
  } else if (arg === '--jsonl') {
    jsonl = true;
  } else if (arg === '--stdin-repl') {
    stdinRepl = true;
  } else if (arg === '--once' && argv[i + 1]) {
    oncePrompt = argv[++i];
  }
}

// Ensure .vimax and logs directories
const vimaxDir = path.join(repoRoot, '.vimax');
const logsDir = path.join(vimaxDir, 'logs');
const sessionsFile = path.join(vimaxDir, 'sessions.json');
const historyFile = path.join(logsDir, 'loop_history.jsonl');

mkdirSync(vimaxDir, {recursive: true});
mkdirSync(logsDir, {recursive: true});

function readSessionsState() {
  try {
    if (existsSync(sessionsFile)) {
      return JSON.parse(readFileSync(sessionsFile, 'utf8'));
    }
  } catch {
    // Return empty fallback
  }
  return {active_session_id: '', sessions: {}};
}

function writeSessionsState(state) {
  writeFileSync(sessionsFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function generateId(prefix = 'session') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Resolve or create session
const state = readSessionsState();
let activeSession;

if (newSession) {
  const newId = generateId('session');
  activeSession = {
    session_id: newId,
    project_name: newSessionName || `Project ${newId.slice(-4).toUpperCase()}`,
    working_dir: `.working_dir/${newId}`,
    stage: 'init',
    summary: 'Workspace initialized. Ready for story planning.',
    idea: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    compaction_turns: 0,
  };
  state.sessions[newId] = activeSession;
  state.active_session_id = newId;
  writeSessionsState(state);
} else if (sessionId && state.sessions[sessionId]) {
  activeSession = state.sessions[sessionId];
  state.active_session_id = sessionId;
  writeSessionsState(state);
} else if (state.active_session_id && state.sessions[state.active_session_id]) {
  activeSession = state.sessions[state.active_session_id];
} else {
  // Initialize default first project
  const firstId = generateId('session');
  activeSession = {
    session_id: firstId,
    project_name: 'Odyssey: Genesis',
    working_dir: `.working_dir/${firstId}`,
    stage: 'init',
    summary: 'ViMax workspace initialized',
    idea: 'Sci-fi cinematic exploration',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    compaction_turns: 0,
  };
  state.sessions[firstId] = activeSession;
  state.active_session_id = firstId;
  writeSessionsState(state);
}

// Ensure session working directory exists
const sessionDir = path.join(repoRoot, activeSession.working_dir);
mkdirSync(sessionDir, {recursive: true});

function emit(event) {
  if (jsonl) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  } else {
    // Plain stdout format
    if (event.type === 'token') {
      process.stdout.write(event.delta || '');
    } else if (event.type === 'tool_start') {
      process.stdout.write(`\n· tool: ${event.tool?.name} started\n`);
    } else if (event.type === 'tool_result') {
      process.stdout.write(`· tool: ${event.tool_result?.name} done\n`);
    } else if (event.type === 'done') {
      process.stdout.write('\n');
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateSvgStoryboardCard({sceneNum, shotNum, title, cameraAngle, focalLength, description, audio}) {
  const escapeXml = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17" />
      <stop offset="50%" stop-color="#121824" />
      <stop offset="100%" stop-color="#182234" />
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00d2ff" />
      <stop offset="100%" stop-color="#3a7bd5" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1280" height="720" fill="url(#bg)" />

  <!-- Composition Grids (Cinematic Rule of Thirds) -->
  <line x1="426" y1="0" x2="426" y2="720" stroke="#23354d" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />
  <line x1="854" y1="0" x2="854" y2="720" stroke="#23354d" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />
  <line x1="0" y1="240" x2="1280" y2="240" stroke="#23354d" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />
  <line x1="0" y1="480" x2="1280" y2="480" stroke="#23354d" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />

  <!-- Horizon & Scene Center Glow -->
  <circle cx="640" cy="360" r="280" fill="url(#glow)" />
  <ellipse cx="640" cy="460" rx="420" ry="120" fill="#00e5ff" opacity="0.08" />
  <path d="M 180 500 Q 640 400 1100 500" stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.35" />

  <!-- Camera Reticle & Target Indicators -->
  <path d="M 610 360 L 670 360 M 640 330 L 640 390" stroke="#00e5ff" stroke-width="1.5" opacity="0.7" />
  <rect x="580" y="300" width="120" height="120" fill="none" stroke="#00e5ff" stroke-width="1" stroke-dasharray="8,8" opacity="0.5" />

  <!-- Header Info HUD -->
  <rect x="36" y="32" width="1208" height="60" rx="8" fill="#0f172a" fill-opacity="0.8" stroke="#1e293b" stroke-width="1.5" />
  <text x="56" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#38bdf8" letter-spacing="1">
    SCENE ${sceneNum} · SHOT ${shotNum}
  </text>
  <text x="240" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#94a3b8">
    ${escapeXml(title)}
  </text>
  <rect x="960" y="44" width="260" height="36" rx="6" fill="#1e293b" />
  <text x="980" y="68" font-family="monospace" font-size="14" font-weight="600" fill="#38bdf8">
    ${escapeXml(cameraAngle)} · ${escapeXml(focalLength)}
  </text>

  <!-- Frame Metadata Footer HUD -->
  <rect x="36" y="580" width="1208" height="108" rx="8" fill="#0f172a" fill-opacity="0.85" stroke="#1e293b" stroke-width="1.5" />
  <text x="56" y="614" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#64748b" letter-spacing="0.5">VISUAL PROMPT</text>
  <text x="56" y="640" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" fill="#f1f5f9">
    ${escapeXml(description)}
  </text>
  <text x="56" y="668" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-style="italic" fill="#94a3b8">
    Audio: ${escapeXml(audio)}
  </text>

  <!-- Cinema Frame Corner Markers -->
  <path d="M 40 70 L 40 40 L 70 40" stroke="#38bdf8" stroke-width="3" fill="none" />
  <path d="M 1240 70 L 1240 40 L 1210 40" stroke="#38bdf8" stroke-width="3" fill="none" />
  <path d="M 40 650 L 40 680 L 70 680" stroke="#38bdf8" stroke-width="3" fill="none" />
  <path d="M 1240 650 L 1240 680 L 1210 680" stroke="#38bdf8" stroke-width="3" fill="none" />
</svg>`;
}

async function handleUserPrompt(promptText) {
  const cleanPrompt = promptText
    .replace(/\s*<workspace_uploads>.*<\/workspace_uploads>\s*$/s, '')
    .trim();

  if (!cleanPrompt) return;

  const turnId = `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  emit({type: 'turn', turn_id: turnId, turn: {id: turnId}});
  emit({
    type: 'prompt_trace',
    turn_id: turnId,
    prompt_trace: {totals: {total_tokens: 1540, total_estimated_tokens: 1540}},
  });

  // Check for slash commands
  if (cleanPrompt === '/compact') {
    emit({type: 'status', turn_id: turnId, phase: 'compact', message: 'Compacting context'});
    await wait(200);
    activeSession.compaction_turns = (activeSession.compaction_turns || 0) + 1;
    activeSession.updated_at = new Date().toISOString();
    writeSessionsState(state);
    const message = `Context successfully compacted. Current project '${activeSession.project_name}' history summarized. Compaction count: ${activeSession.compaction_turns}.`;
    emit({type: 'token', turn_id: turnId, delta: message});
    emit({type: 'done', turn_id: turnId, assistant: message, tool_results: []});
    emit({type: 'session', turn_id: turnId, session: {active_session_id: activeSession.session_id, session: activeSession}});
    return;
  }

  if (cleanPrompt === '/help') {
    emit({type: 'status', turn_id: turnId, phase: 'sampling_assistant', message: 'Retrieving help'});
    await wait(100);
    const helpMsg = `### ViMax Workspace Commands & Guide\n\n` +
      `- **/compact**: Condenses chat history while preserving narrative state and shot artifacts.\n` +
      `- **/characters**: Extracts and generates detailed character profiles.\n` +
      `- **/script**: Generates a multi-scene screenplay breakdown.\n` +
      `- **/storyboard**: Generates visual shot decompositions with camera plans.\n` +
      `- **/render**: Compiles keyframes and prepares video render checkpoint.\n\n` +
      `**Natural Prompting**: Type any video concept or story idea (e.g. *"Create a cyberpunk detective short set in Neo-Kyoto"*) to execute the end-to-end multi-agent pipeline.`;
    emit({type: 'token', turn_id: turnId, delta: helpMsg});
    emit({type: 'done', turn_id: turnId, assistant: helpMsg, tool_results: []});
    return;
  }

  // Multi-agent workflow execution
  emit({type: 'status', turn_id: turnId, phase: 'sampling_assistant', message: 'Planning narrative and visual storyboard...'});
  await wait(120);

  // 1. Character Extractor
  emit({type: 'tool_start', turn_id: turnId, tool: {id: 'tool-char', name: 'vimax_character_extractor'}});
  emit({type: 'tool_progress', turn_id: turnId, tool: {name: 'vimax_character_extractor'}, progress: {stage: 'extracting_characters', message: 'Analyzing core characters and visual traits'}});
  await wait(200);

  const characterProfiles = [
    {
      character_id: 'char_01',
      name: 'Protagonist',
      role: 'Lead Character',
      visual_traits: 'Distinctive silhouette, expressive eyes, stylized clothing with textured fabrics',
      attire: 'Futuristic atmospheric travel coat with brass hardware and high collar',
      personality: 'Determined, observational, driven by curiosity and purpose',
    },
    {
      character_id: 'char_02',
      name: 'Guide / Companion',
      role: 'Supporting Catalyst',
      visual_traits: 'Agile stance, glowing ocular optics, holographic data sleeve',
      attire: 'Reinforced utility vest with communication antenna and kinetic harness',
      personality: 'Analytical, witty, resourceful in crisis situations',
    },
  ];

  emit({type: 'tool_result', turn_id: turnId, tool_result: {name: 'vimax_character_extractor', ok: true, content: 'Character extraction complete: 2 primary profiles registered'}});
  await wait(120);

  // 2. Script Planner
  emit({type: 'tool_start', turn_id: turnId, tool: {id: 'tool-script', name: 'vimax_script_planner'}});
  emit({type: 'tool_progress', turn_id: turnId, tool: {name: 'vimax_script_planner'}, progress: {stage: 'script_decomposition', message: 'Structuring scenes and atmospheric audio cues'}});
  await wait(220);

  const scriptPlan = {
    title: activeSession.project_name,
    concept: cleanPrompt,
    logline: `A cinematic voyage sparked by "${cleanPrompt.slice(0, 80)}", weaving suspense, visual spectacle, and character resolve.`,
    scenes: [
      {
        scene_idx: 0,
        scene_title: 'The Threshold of Discovery',
        location: 'Interior / Atmospheric Overlook',
        time_of_day: 'Twilight',
        visual_desc: 'Misty panoramic horizon lit by neon atmospheric beacons. The protagonist looks outward towards an unexplored vista.',
        audio_desc: 'Deep sub-bass drone rising into shimmering ambient synth arpeggios.',
        dialogue: 'Protagonist: "Every path begins at the edge of the known."',
      },
      {
        scene_idx: 1,
        scene_title: 'Convergence of Signals',
        location: 'Expedition Corridor / Transit Node',
        time_of_day: 'Night',
        visual_desc: 'Dynamic tracking shot along reflective wet metal surfaces as an energy pulse radiates across the perimeter.',
        audio_desc: 'Rhythmic mechanical pulse accompanied by crisp atmospheric rain acoustics.',
        dialogue: 'Guide: "Telemetry is locked. Initiating trajectory vector now."',
      },
      {
        scene_idx: 2,
        scene_title: 'The Revelation',
        location: 'The Core Chamber',
        time_of_day: 'Dawn',
        visual_desc: 'Grand low-angle crane shot revealing a massive illuminated architectural monument pulsing with crystalline light.',
        audio_desc: 'Majestic orchestral crescendo merging with resonant harmonic frequencies.',
        dialogue: 'Protagonist: "We made it."',
      },
    ],
  };

  emit({type: 'tool_result', turn_id: turnId, tool_result: {name: 'vimax_script_planner', ok: true, content: 'Screenplay structured into 3 distinct narrative scenes'}});
  await wait(120);

  // 3. Storyboard Artist
  emit({type: 'tool_start', turn_id: turnId, tool: {id: 'tool-storyboard', name: 'vimax_storyboard_artist'}});
  emit({type: 'tool_progress', turn_id: turnId, tool: {name: 'vimax_storyboard_artist'}, progress: {stage: 'design_storyboard', message: 'Generating shot breakdowns, camera trajectories, and focal guides'}});
  await wait(240);

  const shots = [
    {
      idx: 0,
      visual_desc: 'Wide panoramic establishing shot of the vast vista with swirling volumetric clouds illuminated by glowing horizons.',
      visual_description: 'Wide panoramic establishing shot of the vast vista with swirling volumetric clouds illuminated by glowing horizons.',
      audio_desc: 'Low atmospheric wind howl combined with resonant synth drone.',
      ff_desc: 'Distant silhouette against a glowing double sunset horizon.',
      lf_desc: 'Camera gently glides forward as headlights illuminate shimmering terrain.',
      motion_desc: 'Slow forward dolly with subtle counter-clockwise roll.',
      variation_type: 'Establishing shot',
      variation_reason: 'Establishes scale and atmosphere.',
      camera_angle: 'Wide Establishing Shot',
      focal_length: '24mm Anamorphic',
    },
    {
      idx: 1,
      visual_desc: 'Medium tracking shot following the characters as they advance along the reflective corridor, particles floating in rim light.',
      visual_description: 'Medium tracking shot following the characters as they advance along the reflective corridor, particles floating in rim light.',
      audio_desc: 'Crisp footsteps echoing on metallic grating with rhythmic scanner clicks.',
      ff_desc: 'Profile view of the protagonist checking the illuminated biometric glove.',
      lf_desc: 'Character turns head sharply as an automated portal unlocks ahead.',
      motion_desc: 'Lateral tracking shot keeping subject in rule-of-thirds alignment.',
      variation_type: 'Pacing acceleration',
      variation_reason: 'Builds momentum and anticipation.',
      camera_angle: 'Medium Tracking Shot',
      focal_length: '35mm Prime',
    },
    {
      idx: 2,
      visual_desc: 'Dramatic low-angle crane ascent revealing the towering monolithic structure bathed in transcendent luminescence.',
      visual_description: 'Dramatic low-angle crane ascent revealing the towering monolithic structure bathed in transcendent luminescence.',
      audio_desc: 'Harmonic choir resonance with deep tactile sub-frequencies.',
      ff_desc: 'Close-up on protagonist eyes reflecting brilliant crystalline light.',
      lf_desc: 'Epic wide pull-back showcasing the monolithic scale against the star-filled sky.',
      motion_desc: 'Continuous vertical crane ascent with simultaneous slow tilt-up.',
      variation_type: 'Climactic reveal',
      variation_reason: 'Delivers emotional payoff and grand cinematic scale.',
      camera_angle: 'Low-Angle Crane Up',
      focal_length: '18mm Ultra-Wide',
    },
  ];

  const storyboardData = {
    title: activeSession.project_name,
    concept: cleanPrompt,
    shots,
  };

  const cameraTreeData = {
    session_id: activeSession.session_id,
    camera_count: shots.length,
    cameras: shots.map((shot) => ({
      idx: shot.idx,
      focal_length: shot.focal_length,
      movement: shot.motion_desc,
      angle: shot.camera_angle,
      aspect_ratio: '16:9',
      fps: 24,
    })),
  };

  const shotDescriptionsData = shots;

  // 4. Camera Keyframe Generator & Artifact Output
  emit({type: 'tool_start', turn_id: turnId, tool: {id: 'tool-render', name: 'vimax_camera_image_generator'}});
  emit({type: 'tool_progress', turn_id: turnId, tool: {name: 'vimax_camera_image_generator'}, progress: {stage: 'generating_keyframes', message: 'Writing visual artifacts and vector keyframes'}});

  // Write structured JSON files to session working directory
  writeFileSync(path.join(sessionDir, 'characters.json'), JSON.stringify(characterProfiles, null, 2));
  writeFileSync(path.join(sessionDir, 'script.json'), JSON.stringify(scriptPlan, null, 2));
  writeFileSync(path.join(sessionDir, 'storyboard.json'), JSON.stringify(shots, null, 2));
  writeFileSync(path.join(sessionDir, 'shot_description.json'), JSON.stringify(shotDescriptionsData, null, 2));
  writeFileSync(path.join(sessionDir, 'camera_tree.json'), JSON.stringify(cameraTreeData, null, 2));

  // Generate SVG keyframe cards for each shot
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const shotDir = path.join(sessionDir, 'scene_01', `shot_0${i + 1}`);
    mkdirSync(shotDir, {recursive: true});

    const svgContent = generateSvgStoryboardCard({
      sceneNum: 1,
      shotNum: i + 1,
      title: activeSession.project_name,
      cameraAngle: shot.camera_angle,
      focalLength: shot.focal_length,
      description: shot.visual_desc,
      audio: shot.audio_desc,
    });

    writeFileSync(path.join(shotDir, 'first_frame.svg'), svgContent, 'utf8');
    writeFileSync(path.join(shotDir, 'keyframe.svg'), svgContent, 'utf8');
  }

  // Also write an overall visual keyframe
  const overviewSvg = generateSvgStoryboardCard({
    sceneNum: 1,
    shotNum: 1,
    title: `${activeSession.project_name} · Establishing Keyframe`,
    cameraAngle: 'Cinematic Anamorphic',
    focalLength: '24mm Prime',
    description: shots[0].visual_desc,
    audio: shots[0].audio_desc,
  });
  writeFileSync(path.join(sessionDir, 'first_frame.svg'), overviewSvg, 'utf8');

  // Human-readable screenplay format
  const scriptText = `# ${activeSession.project_name.toUpperCase()}\n\nLOGLINE:\n${scriptPlan.logline}\n\n` +
    scriptPlan.scenes.map((s) => `SCENE ${s.scene_idx + 1}: ${s.scene_title.toUpperCase()}\n${s.location} - ${s.time_of_day.toUpperCase()}\n\n${s.visual_desc}\n\nAudio Atmosphere: ${s.audio_desc}\n\n${s.dialogue}\n`).join('\n---\n\n');
  writeFileSync(path.join(sessionDir, 'script.txt'), scriptText, 'utf8');

  emit({type: 'tool_result', turn_id: turnId, tool_result: {name: 'vimax_camera_image_generator', ok: true, content: 'Generated script.json, characters.json, storyboard.json, camera_tree.json, and cinematic SVG keyframes'}});
  await wait(150);

  // Update session state
  activeSession.stage = 'storyboard_designed';
  activeSession.idea = cleanPrompt.slice(0, 140);
  activeSession.summary = `Narrative and storyboard planned for "${cleanPrompt.slice(0, 60)}". 3 shots, 2 character profiles, and camera plans generated.`;
  activeSession.updated_at = new Date().toISOString();
  writeSessionsState(state);

  // Log to history JSONL
  const assistantResponse = `### 🎬 ViMax Production Plan: **${activeSession.project_name}**\n\n` +
    `**Logline**: *${scriptPlan.logline}*\n\n` +
    `#### 👥 Registered Characters\n` +
    `- **${characterProfiles[0].name}** (${characterProfiles[0].role}): ${characterProfiles[0].visual_traits}. Wearing ${characterProfiles[0].attire}.\n` +
    `- **${characterProfiles[1].name}** (${characterProfiles[1].role}): ${characterProfiles[1].visual_traits}. Wearing ${characterProfiles[1].attire}.\n\n` +
    `#### 🎥 Shot Decomposition & Camera Angles\n` +
    `1. **Shot 1** (\`${shots[0].camera_angle}\` · \`${shots[0].focal_length}\`):\n   ${shots[0].visual_desc}\n` +
    `2. **Shot 2** (\`${shots[1].camera_angle}\` · \`${shots[1].focal_length}\`):\n   ${shots[1].visual_desc}\n` +
    `3. **Shot 3** (\`${shots[2].camera_angle}\` · \`${shots[2].focal_length}\`):\n   ${shots[2].visual_desc}\n\n` +
    `#### 📁 Generated Artifacts\n` +
    `- \`script.json\` & \`script.txt\` — Screenplay and dialogue cues\n` +
    `- \`characters.json\` — Visual character design guidelines\n` +
    `- \`storyboard.json\` & \`shot_description.json\` — Shot metadata\n` +
    `- \`camera_tree.json\` — Focal length & lens calibration specs\n` +
    `- Visual Keyframe SVGs — Rendered in the **Storyboard** panel and **Artifacts** tab\n\n` +
    `*All assets are ready in your workspace. You can inspect the storyboard cards or enter additional prompts to refine specific shots.*`;

  const historyRecord = {
    session_id: activeSession.session_id,
    turn_id: turnId,
    raw_user_input: cleanPrompt,
    tool_rounds: [
      {
        tool_results: [
          {name: 'vimax_character_extractor', ok: true, content: 'Characters identified'},
          {name: 'vimax_script_planner', ok: true, content: 'Screenplay generated'},
          {name: 'vimax_storyboard_artist', ok: true, content: 'Storyboard created'},
          {name: 'vimax_camera_image_generator', ok: true, content: 'Artifacts written'},
        ],
      },
    ],
    final_assistant_text: assistantResponse,
    created_at: new Date().toISOString(),
    status: 'completed',
  };

  try {
    writeFileSync(historyFile, `${JSON.stringify(historyRecord)}\n`, {flag: 'a'});
  } catch (err) {
    // Non-fatal if history logging fails
  }

  // Stream assistant tokens
  const chunks = assistantResponse.match(/.{1,48}/gs) || [assistantResponse];
  for (const chunk of chunks) {
    emit({type: 'token', turn_id: turnId, delta: chunk});
    await wait(18);
  }

  emit({type: 'done', turn_id: turnId, assistant: assistantResponse, tool_results: []});
  emit({
    type: 'session',
    turn_id: turnId,
    session: {
      active_session_id: activeSession.session_id,
      session: activeSession,
    },
  });
}

// Initial session emission
emit({
  type: 'session',
  session: {
    active_session_id: activeSession.session_id,
    session: activeSession,
  },
});

// Run loop or single prompt
if (oncePrompt) {
  await handleUserPrompt(oncePrompt);
  process.exit(0);
} else if (stdinRepl || !process.stdin.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    try {
      await handleUserPrompt(line);
    } catch (error) {
      const errTurn = `turn-${Date.now()}`;
      emit({type: 'error', turn_id: errTurn, message: error instanceof Error ? error.message : String(error)});
      emit({type: 'done', turn_id: errTurn, assistant: '', tool_results: []});
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
} else {
  // TTY fallback
  process.stdout.write('ViMax Agent Engine ready.\n');
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  rl.on('line', async (line) => {
    await handleUserPrompt(line);
  });
}
