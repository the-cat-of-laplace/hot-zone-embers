const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const frame = document.querySelector('#canvas-frame');

const ui = {
  runStatus: document.querySelector('#run-status'),
  safeStatus: document.querySelector('#safe-status'),
  pressure: document.querySelector('#pressure-chip'),
  turn: document.querySelector('#turn-value'),
  weather: document.querySelector('#weather-value'),
  location: document.querySelector('#location-value'),
  safeCount: document.querySelector('#safe-count'),
  healthMeter: document.querySelector('#health-meter'),
  thirstMeter: document.querySelector('#thirst-meter'),
  hungerMeter: document.querySelector('#hunger-meter'),
  weightMeter: document.querySelector('#weight-meter'),
  safePowerMeter: document.querySelector('#safe-power-meter'),
  health: document.querySelector('#health-value'),
  thirst: document.querySelector('#thirst-value'),
  hunger: document.querySelector('#hunger-value'),
  weight: document.querySelector('#weight-value'),
  safePower: document.querySelector('#safe-power-value'),
  inventoryCount: document.querySelector('#inventory-count'),
  equipment: document.querySelector('#equipment-grid'),
  inventory: document.querySelector('#inventory-grid'),
  stash: document.querySelector('#stash-summary'),
  stashName: document.querySelector('#stash-name'),
  stashGrid: document.querySelector('#stash-grid'),
  recipes: document.querySelector('#recipe-list'),
  workbenchStatus: document.querySelector('#workbench-status'),
  recipeLock: document.querySelector('#recipe-lock'),
  log: document.querySelector('#event-log'),
  clearLog: document.querySelector('#clear-log'),
  missionStep: document.querySelector('#mission-step'),
  missionText: document.querySelector('#mission-text'),
  safeObjective: document.querySelector('#objective-safe'),
  safeObjectiveText: document.querySelector('#objective-safe-text'),
  sampleObjective: document.querySelector('#objective-sample'),
  sampleObjectiveText: document.querySelector('#objective-sample-text'),
  terminalObjective: document.querySelector('#objective-terminal'),
  tooltip: document.querySelector('#canvas-tooltip'),
  lootReveal: document.querySelector('#loot-reveal'),
  lootTitle: document.querySelector('#loot-reveal-title'),
  lootStatus: document.querySelector('#loot-reveal-status'),
  lootItems: document.querySelector('#loot-reveal-items'),
  lootClose: document.querySelector('#loot-close'),
  modal: document.querySelector('#end-modal'),
  endEyebrow: document.querySelector('#end-eyebrow'),
  endTitle: document.querySelector('#end-title'),
  endCopy: document.querySelector('#end-copy'),
  endStats: document.querySelector('#end-stats'),
  restart: document.querySelector('#restart-button'),
};

const TILE = 52;
const WORLD_W = 40;
const WORLD_H = 28;
const MAX_TURNS = 64;
const HEAT_RESISTANT_TYPE = 'hunter';
const DAY_ZOMBIE_TARGET = 4;
const NIGHT_ZOMBIE_TARGET = 28;
const REQUIRED_FRONTLINE_SAFE_POINTS = 3;
const REQUIRED_SAMPLES = 3;
const MISSION_CRITICAL_ITEMS = new Set(['metal', 'filter', 'battery', 'sample']);
const ENGINEERING_RESERVES = {
  metal: { minimum: 20, sources: ['快递箱', '工具箱', '军用箱', '警械柜', '燃料桶'] },
  filter: { minimum: 5, sources: ['医疗冷藏柜', '工具箱', '电子柜'] },
  battery: { minimum: 5, sources: ['货架箱', '样本柜', '工具箱', '军用箱', '电子柜', '燃料桶'] },
};
const EQUIPMENT_ITEMS = ['backpack', 'armor', 'weapon', 'suppressor'];
const STACK_LIMITS = {
  water: 2,
  food: 3,
  medkit: 2,
  ammo: 12,
  metal: 6,
  cloth: 8,
  chemical: 4,
  rawWater: 2,
  filter: 3,
  battery: 2,
  electronics: 6,
  decoder: 1,
  sample: 2,
  backpack: 1,
  armor: 1,
  weapon: 1,
  suppressor: 1,
  adrenaline: 3,
  sedative: 3,
  coagulant: 3,
};
const INVENTORY_ACTIONS = {
  water: 'drink',
  food: 'eat',
  medkit: 'medkit',
  adrenaline: 'use-adrenaline',
  sedative: 'use-sedative',
  coagulant: 'use-coagulant',
};
const EQUIPMENT_LABELS = { backpack: '背包', armor: '防具', weapon: '近战武器', suppressor: '枪口配件' };
const ITEM_META = {
  water: { label: '净水', glyph: '◌', weight: 1 },
  food: { label: '口粮', glyph: '▤', weight: 0.5 },
  medkit: { label: '绷带', glyph: '＋', weight: 0.4 },
  ammo: { label: '弹药', glyph: '▪', weight: 0.1 },
  metal: { label: '金属', glyph: '◆', weight: 0.8 },
  cloth: { label: '布料', glyph: '▥', weight: 0.2 },
  chemical: { label: '化学品', glyph: '◈', weight: 0.4 },
  rawWater: { label: '原水', glyph: '◍', weight: 1 },
  filter: { label: '滤芯', glyph: '⌁', weight: 0.3 },
  battery: { label: '电池', glyph: '▣', weight: 1.2 },
  electronics: { label: '电子件', glyph: '⌘', weight: 0.2 },
  decoder: { label: '解码器', glyph: '⌘', weight: 0.7 },
  sample: { label: '耐热株核心样本', glyph: '◇', weight: 0.2 },
  backpack: { label: '扩容背包', glyph: '▣', weight: 2.4, effect: '携带格 +4，负重上限 +8kg' },
  armor: { label: '防护背心', glyph: '⬟', weight: 3.4, effect: '每次丧尸接触伤害 -5' },
  weapon: { label: '加固近战武器', glyph: '⚒', weight: 2.1, effect: '近战伤害 +12' },
  suppressor: { label: '枪口抑制器', glyph: '≋', weight: 0.8, effect: '射击噪声由 18 降至 7' },
  adrenaline: { label: '肾上腺素针剂', glyph: '▲', weight: 0.1, effect: '使用后恢复 8 生命，并让下一次行动不产生额外噪声' },
  sedative: { label: '镇静针剂', glyph: '◆', weight: 0.1, effect: '使用后降低下一次行动的声音传播' },
  coagulant: { label: '凝血针剂', glyph: '✚', weight: 0.1, effect: '使用后获得一次接触伤害减免' },
};

const RECIPES = {
  'craft-water': {
    label: '净水', glyph: '◌', output: 'water', amount: 2, power: 8, turns: 2,
    ingredients: { rawWater: 1, filter: 1, chemical: 1 },
    effect: '补充口渴；适合带回野外长线行动。',
  },
  'craft-bandage': {
    label: '无菌绷带', glyph: '＋', output: 'medkit', amount: 1, power: 4, turns: 2,
    ingredients: { cloth: 2, chemical: 1 },
    effect: '使用后恢复 30 生命。',
  },
  'craft-decoder': {
    label: '电子解码器', glyph: '⌘', output: 'decoder', amount: 1, power: 10, turns: 3,
    ingredients: { electronics: 2, battery: 1 },
    effect: '正常破解成功率提高 13%。',
  },
  'craft-ammo': {
    label: '弹药', glyph: '▪', output: 'ammo', amount: 6, power: 5, turns: 2,
    ingredients: { metal: 1, chemical: 1, electronics: 1 },
    effect: '远程射击消耗；枪声会吸引远处丧尸。',
  },
  'craft-backpack': {
    label: '扩容背包', glyph: '▣', output: 'backpack', amount: 1, power: 8, turns: 4,
    ingredients: { cloth: 4, metal: 1, electronics: 1 },
    effect: '装备后携带格 +4，负重上限 +8kg。',
  },
  'craft-armor': {
    label: '防护背心', glyph: '⬟', output: 'armor', amount: 1, power: 12, turns: 4,
    ingredients: { metal: 4, cloth: 3, chemical: 1 },
    effect: '装备后每次丧尸接触伤害减少 5。',
  },
  'craft-weapon': {
    label: '加固近战武器', glyph: '⚒', output: 'weapon', amount: 1, power: 6, turns: 3,
    ingredients: { metal: 3, cloth: 1, electronics: 1 },
    effect: '装备后近战伤害增加 12。',
  },
  'craft-suppressor': {
    label: '枪口抑制器', glyph: '≋', output: 'suppressor', amount: 1, power: 10, turns: 4,
    ingredients: { metal: 3, cloth: 1, chemical: 1 },
    effect: '作为独立枪口配件装备，使射击噪声由 18 降至 7。',
  },
  'craft-adrenaline': {
    label: '肾上腺素针剂', glyph: '▲', output: 'adrenaline', amount: 1, power: 10, turns: 3,
    ingredients: { chemical: 2, battery: 1, water: 1 },
    effect: '使用后恢复 8 生命，并让下一次行动不产生额外噪声。',
  },
  'craft-sedative': {
    label: '镇静针剂', glyph: '◆', output: 'sedative', amount: 1, power: 8, turns: 2,
    ingredients: { chemical: 2, cloth: 1, water: 1 },
    effect: '使用后降低下一次行动的声音传播。',
  },
  'craft-coagulant': {
    label: '凝血针剂', glyph: '✚', output: 'coagulant', amount: 1, power: 8, turns: 2,
    ingredients: { chemical: 2, water: 1, electronics: 1 },
    effect: '使用后获得一次接触伤害减免。',
  },
};

function emptyStash() {
  return Object.fromEntries(Object.keys(ITEM_META).map((item) => [item, 0]));
}

const ZONE_STYLES = {
  residential: { label: '住宅区', floor: '#394641', accent: '#758279', roof: '#44514b', wall: '#778078' },
  commercial: { label: '商业街', floor: '#3d4240', accent: '#a17150', roof: '#6f5a50', wall: '#8b8278' },
  hospital: { label: '医院后勤', floor: '#384746', accent: '#83aaa3', roof: '#4f6763', wall: '#a4aeaa' },
  industrial: { label: '工业区', floor: '#45413b', accent: '#b17249', roof: '#65534a', wall: '#857a68' },
  security: { label: '警局军械', floor: '#3a4141', accent: '#9a835f', roof: '#4a5453', wall: '#6c7976' },
  research: { label: '研究区', floor: '#334347', accent: '#7ea4aa', roof: '#465b61', wall: '#9bb2b3' },
};

const WEATHER = [
  { name: '晴', icon: '☼', sound: 1, visibility: 1 },
  { name: '雨', icon: '雨', sound: 0.72, visibility: 0.86 },
  { name: '雾', icon: '雾', sound: 1.08, visibility: 0.62 },
];

const SAFE_TEMPLATES = [
  { id: 0, name: '初始隔离站', x: 4, y: 14, active: true, radius: 3, power: 100, level: 2 },
  { id: 1, name: '医院热交换站', x: 14, y: 6, active: false, radius: 0, power: 0, level: 0 },
  { id: 2, name: '工业锅炉房', x: 15, y: 22, active: false, radius: 0, power: 0, level: 0 },
  { id: 3, name: '地下交通控制室', x: 26, y: 5, active: false, radius: 0, power: 0, level: 0 },
  { id: 4, name: '防灾仓库', x: 28, y: 21, active: false, radius: 0, power: 0, level: 0 },
  { id: 5, name: '研究隔离舱', x: 36, y: 12, active: false, radius: 0, power: 0, level: 0 },
];

const BUILDING_TEMPLATES = [
  { x: 1, y: 2, w: 8, h: 6, zone: 'residential', name: '褪色住宅楼' },
  { x: 10, y: 2, w: 6, h: 5, zone: 'commercial', name: '停摆便利店' },
  { x: 18, y: 1, w: 8, h: 6, zone: 'hospital', name: '医院后勤楼' },
  { x: 29, y: 1, w: 8, h: 6, zone: 'research', name: '旧研究中心' },
  { x: 1, y: 18, w: 8, h: 7, zone: 'residential', name: '临时安置楼' },
  { x: 10, y: 17, w: 7, h: 7, zone: 'industrial', name: '锅炉维护间' },
  { x: 20, y: 17, w: 8, h: 7, zone: 'security', name: '防灾物资仓' },
  { x: 31, y: 17, w: 7, h: 7, zone: 'industrial', name: '变电站机房' },
  { x: 22, y: 9, w: 8, h: 5, zone: 'commercial', name: '封锁商场' },
  { x: 31, y: 8, w: 7, h: 5, zone: 'security', name: '警局侧翼' },
];

const CONTAINER_TEMPLATES = [
  { x: 4, y: 5, type: '住宅柜' }, { x: 12, y: 4, type: '货架箱' },
  { x: 21, y: 4, type: '医疗冷藏柜' }, { x: 33, y: 4, type: '样本柜' },
  { x: 4, y: 21, type: '快递箱' }, { x: 13, y: 21, type: '工具箱' },
  { x: 23, y: 21, type: '军用箱' }, { x: 34, y: 21, type: '电子柜' },
  { x: 25, y: 11, type: '商场仓储柜' }, { x: 34, y: 10, type: '警械柜' },
  { x: 8, y: 12, type: '街边背包' }, { x: 18, y: 15, type: '燃料桶' },
];

const canvasState = { width: 0, height: 0, dpr: 1, pointer: null, dragging: false, dragMoved: false, longPressed: false, pressTimer: null, lastX: 0, lastY: 0 };
let state = null;

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function key(x, y) { return `${x},${y}`; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function adjacent(a, b) { return manhattan(a, b) === 1; }
function hash2(x, y) { return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1; }
function phaseName() {
  if (state.turn <= 44) return '白天';
  if (state.turn <= 52) return '黄昏';
  return '夜晚';
}
function isNight() { return state.turn > 52; }
function currentWeather() { return WEATHER[state.weatherIndex]; }

function cloneSafe(template) { return { ...template, active: template.active, stash: {}, maintenance: 0 }; }

function resetGame() {
  const random = rng(Math.floor(Date.now() / 1000) % 1000000000);
  state = {
    random,
    day: 1,
    turn: 1,
    overtime: 0,
    weatherIndex: 0,
    pressure: 1,
    mode: 'field',
    currentSafeId: 0,
    cameraPan: { x: 0, y: 0 },
    health: 100,
    thirst: 86,
    hunger: 90,
    buffs: { noiseScale: null, contactShield: 0 },
    kills: 0,
    lootOpened: 0,
    openedSafeCount: 0,
    terminalActivated: false,
    selectedTarget: null,
    selectedInventory: null,
    lootReveal: null,
    groundLoot: [],
    nextGroundLootId: 1,
    activation: null,
    inventory: { water: 2, food: 1, medkit: 1, ammo: 4 },
    equipment: { backpack: null, armor: null, weapon: null, suppressor: null },
    visited: new Set(),
    logs: [],
    noiseEvents: [],
    safePoints: SAFE_TEMPLATES.map(cloneSafe),
    buildings: BUILDING_TEMPLATES.map((building, index) => ({ ...building, id: index })),
    containers: [],
    zombies: [],
    terminal: { x: 35, y: 11 },
    terrain: [],
    player: { x: 5, y: 15, facing: 's' },
  };
  state.safePoints[0].stash = emptyStash();
  state.stashes = { 0: state.safePoints[0].stash };
  addItem(state.safePoints[0].stash, 'metal', 4);
  buildWorld();
  visitAroundPlayer();
  logEvent('你在初始隔离站醒来。白天的城市很安静，但安静不等于安全。', 'good');
  logEvent('主线：额外修复三个热灭活节点，取得三份耐热株核心样本。', 'warn');
  closeModal();
  updateUI();
}

function buildWorld() {
  state.terrain = [];
  for (let y = 0; y < WORLD_H; y += 1) {
    const row = [];
    for (let x = 0; x < WORLD_W; x += 1) {
      let terrain = 'grass';
      if ((y >= 13 && y <= 15) || (x >= 18 && x <= 20)) terrain = 'asphalt';
      if ((x >= 8 && x <= 10 && y > 3 && y < 25) || (y >= 8 && y <= 10 && x > 3 && x < 37)) terrain = 'concrete';
      if ((x + y) % 17 === 0 && terrain === 'grass') terrain = 'dry';
      row.push(terrain);
    }
    state.terrain.push(row);
  }

  state.containers = CONTAINER_TEMPLATES.map((item, index) => ({
    ...item,
    id: index,
    status: 'closed',
    lockTurns: 0,
    loot: rollLoot(item.type),
  }));
  guaranteeEngineeringResources();
  guaranteeMissionSamples();
  spawnZombies(true);
}

function guaranteeEngineeringResources() {
  Object.entries(ENGINEERING_RESERVES).forEach(([item, reserve]) => {
    const sources = state.containers.filter((container) => reserve.sources.includes(container.type));
    if (!sources.length) return;
    let available = state.containers.reduce((total, container) => total + itemCount(container.loot, item), 0);
    while (available < reserve.minimum) {
      const lowestStock = Math.min(...sources.map((container) => itemCount(container.loot, item)));
      const leastStocked = sources.filter((container) => itemCount(container.loot, item) === lowestStock);
      const source = leastStocked[Math.floor(state.random() * leastStocked.length)];
      addItem(source.loot, item, 1);
      available += 1;
    }
  });
}

function guaranteeMissionSamples() {
  const sampleSources = state.containers.filter((container) => ['医疗冷藏柜', '样本柜'].includes(container.type));
  if (!sampleSources.length) return;
  let available = sampleSources.reduce((total, container) => total + itemCount(container.loot, 'sample'), 0);
  while (available < REQUIRED_SAMPLES) {
    const source = sampleSources[Math.floor(state.random() * sampleSources.length)];
    addItem(source.loot, 'sample', 1);
    available += 1;
  }
}

function rollLoot(type) {
  const commonPools = {
    住宅柜: ['water', 'food', 'cloth', 'medkit', 'rawWater'],
    快递箱: ['cloth', 'metal', 'water', 'electronics', 'rawWater'],
    货架箱: ['food', 'water', 'chemical', 'battery', 'adrenaline', 'rawWater'],
    医疗冷藏柜: ['medkit', 'chemical', 'filter', 'sample', 'coagulant'],
    样本柜: ['electronics', 'battery', 'chemical', 'sample', 'sedative'],
    工具箱: ['metal', 'electronics', 'battery', 'filter'],
    军用箱: ['ammo', 'metal', 'medkit', 'battery'],
    电子柜: ['battery', 'electronics', 'filter', 'ammo'],
    商场仓储柜: ['food', 'cloth', 'chemical', 'water'],
    警械柜: ['ammo', 'metal', 'medkit', 'electronics'],
    街边背包: ['water', 'food', 'cloth', 'medkit', 'adrenaline'],
    燃料桶: ['chemical', 'metal', 'battery', 'ammo'],
  };
  const rarePools = {
    住宅柜: ['backpack'],
    快递箱: ['backpack'],
    工具箱: ['decoder', 'weapon'],
    军用箱: ['decoder', 'armor', 'weapon', 'suppressor'],
    电子柜: ['decoder'],
    商场仓储柜: ['backpack'],
    警械柜: ['decoder', 'armor', 'weapon', 'suppressor'],
  };
  const rareChances = {
    住宅柜: 0.04,
    快递箱: 0.05,
    工具箱: 0.09,
    军用箱: 0.15,
    电子柜: 0.1,
    商场仓储柜: 0.06,
    警械柜: 0.15,
  };
  const quantityFor = (item) => {
    if (item === 'water') return 2 + Math.floor(state.random() * 2);
    if (item === 'food') return 2 + Math.floor(state.random() * 3);
    if (item === 'ammo') return 2 + Math.floor(state.random() * 3);
    return 1 + (state.random() > 0.72 ? 1 : 0);
  };
  const pool = commonPools[type] || ['metal', 'cloth', 'water'];
  const loot = {};
  const commonRolls = 3;
  for (let index = 0; index < commonRolls; index += 1) {
    const item = pool[Math.floor(state.random() * pool.length)];
    loot[item] = (loot[item] || 0) + quantityFor(item);
  }
  const rarePool = rarePools[type];
  if (rarePool?.length && state.random() < rareChances[type]) {
    const rareItem = rarePool[Math.floor(state.random() * rarePool.length)];
    loot[rareItem] = 1;
  }
  return loot;
}

function spawnZombies(initial = false) {
  if (!isNight()) hibernateZombiesForDaylight();
  const target = isNight() ? nightZombieTarget() : dayZombieTarget();
  let attempts = 0;
  // Corpses remain as persistent world history. Daylight only replenishes the
  // small heat-resistant population; night replenishes the larger horde.
  while (activeZombieCount() < target && attempts < target * 24) {
    attempts += 1;
    if (spawnOne({ night: isNight(), minDistance: initial ? 8 : isNight() ? 3 : 7, allowVisible: isNight() })) continue;
  }
}

function isHeatResistantZombie(zombie) { return zombie.type === HEAT_RESISTANT_TYPE; }
function isActiveZombie(zombie) { return zombie.hp > 0 && !zombie.dead && !zombie.dormant; }
function activeZombieCount() { return state.zombies.filter(isActiveZombie).length; }
function dayZombieTarget() { return Math.min(8, DAY_ZOMBIE_TARGET + Math.max(0, state.pressure - 1) + Math.floor((state.day - 1) / 10)); }
function nightZombieTarget() { return Math.min(46, NIGHT_ZOMBIE_TARGET + state.pressure * 4 + Math.floor((state.day - 1) / 3)); }

function hibernateZombiesForDaylight() {
  let activeHeatResistant = dayZombieTarget();
  state.zombies.forEach((zombie) => {
    if (!zombie.hp || zombie.dead) return;
    const staysAwake = isHeatResistantZombie(zombie) && activeHeatResistant > 0;
    zombie.dormant = !staysAwake;
    if (staysAwake) activeHeatResistant -= 1;
  });
  if (state.selectedTarget?.kind === 'zombie' && !state.zombies.some((zombie) => zombie.id === state.selectedTarget.id && isActiveZombie(zombie))) {
    state.selectedTarget = null;
  }
}

function wakeNightZombies() {
  state.zombies.forEach((zombie) => {
    if (zombie.hp > 0 && !zombie.dead) zombie.dormant = false;
  });
}

function distanceToAnyPoweredSafe(point) {
  const distances = state.safePoints.filter((safe) => safe.active && safe.power > 0).map((safe) => squareDistance(point, safe));
  return distances.length ? Math.min(...distances) : Infinity;
}

function buildingAt(x, y) { return state.buildings.find((building) => x >= building.x && x < building.x + building.w && y >= building.y && y < building.y + building.h); }
function insideBuilding(point) { return Boolean(buildingAt(point.x, point.y)); }
function squareDistance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function safeFacilityAt(point) { return state.safePoints.find((safe) => safe.active && squareDistance(point, safe) <= safe.radius); }
function poweredSafeAt(point) { return state.safePoints.find((safe) => safe.active && safe.power > 0 && squareDistance(point, safe) <= safe.radius); }
function candidateSafeAt(point) { return state.safePoints.find((safe) => !safe.active && dist(point, safe) <= 1.5); }
function activeSafeCount() { return state.safePoints.filter((safe) => safe.active).length; }
function sleepPowerCost() { return 6 + activeSafeCount(); }
function containerHasLoot(container) { return Object.values(container.loot || {}).some((amount) => amount > 0); }
function groundLootAt(x, y) { return state.groundLoot.find((drop) => drop.x === x && drop.y === y && drop.amount > 0); }
function groundLootById(id) { return state.groundLoot.find((drop) => drop.id === id && drop.amount > 0); }
function groundLootLabel(drop) { return `${ITEM_META[drop.item]?.label || drop.item}×${drop.amount}`; }
function dropGroundItem(item, amount = 1, x = state.player.x, y = state.player.y) {
  if (amount <= 0) return;
  const existing = state.groundLoot.find((drop) => drop.x === x && drop.y === y && drop.item === item);
  if (existing) existing.amount += amount;
  else state.groundLoot.push({ id: state.nextGroundLootId++, x, y, item, amount });
}
function nearestContainer() {
  return state.containers
    .filter((container) => (container.status === 'closed' || containerHasLoot(container)) && dist(container, state.player) <= 1.55)
    .sort((a, b) => dist(a, state.player) - dist(b, state.player))[0];
}
function nearestZombie(max = 2) { return state.zombies.filter((zombie) => isActiveZombie(zombie) && dist(zombie, state.player) <= max).sort((a, b) => dist(a, state.player) - dist(b, state.player))[0]; }
function visibleZombie(max = 8) { return state.zombies.filter((zombie) => isActiveZombie(zombie) && dist(zombie, state.player) <= max && visibleAt(zombie.x, zombie.y)).sort((a, b) => dist(a, state.player) - dist(b, state.player))[0]; }
function terminalNearby() { return dist(state.terminal, state.player) <= 1.5; }
function selectedZombie() {
  if (state.selectedTarget?.kind !== 'zombie') return null;
  return state.zombies.find((zombie) => zombie.id === state.selectedTarget.id && isActiveZombie(zombie)) || null;
}
function selectedContainer() {
  if (state.selectedTarget?.kind !== 'container') return null;
  return state.containers.find((container) => container.id === state.selectedTarget.id && (container.status === 'closed' || containerHasLoot(container))) || null;
}
function selectedGroundLoot() {
  if (state.selectedTarget?.kind !== 'groundLoot') return null;
  return groundLootById(state.selectedTarget.id) || null;
}
function selectTarget(kind, target) {
  state.selectedTarget = target ? { kind, id: target.id } : null;
  if (kind !== 'container' && kind !== 'groundLoot') state.lootReveal = null;
  if (!target) return;
  if (kind === 'zombie') logEvent(`已选中${zombieLabel(target)}。靠近后可以近战，视野内也可以射击。`, 'warn');
  if (kind === 'container') logEvent(target.status === 'open'
    ? `已选中${target.type}。靠近后可以拾取剩余物资。`
    : `已选中${target.type}。靠近后可以破解或暴力拆解。`);
  if (kind === 'container' && target.status === 'open') showLootReveal('container', target.id);
  if (kind === 'groundLoot') {
    logEvent(`已选中地面物资：${groundLootLabel(target)}。`, 'good');
    showLootReveal('groundLoot', target.id);
  }
  updateUI();
}

function itemCount(bag, item) { return bag[item] || 0; }
function addItem(bag, item, amount = 1) { bag[item] = (bag[item] || 0) + amount; }
function takeItem(bag, item, amount = 1) {
  if (itemCount(bag, item) < amount) return false;
  bag[item] -= amount;
  if (bag[item] <= 0) delete bag[item];
  return true;
}
function totalWeight(bag) { return Object.entries(bag).reduce((total, [item, amount]) => total + (ITEM_META[item]?.weight || 0.5) * amount, 0); }
function stackLimit(item) { return STACK_LIMITS[item] || 1; }
function totalSlots(bag) {
  return Object.entries(bag).reduce((total, [item, amount]) => total + Math.ceil(amount / stackLimit(item)), 0);
}
function inventoryStacks(bag) {
  return Object.entries(bag).flatMap(([item, amount]) => {
    const limit = stackLimit(item);
    const slots = [];
    let remaining = amount;
    while (remaining > 0) {
      const stack = Math.min(limit, remaining);
      slots.push({ item, amount: stack, limit });
      remaining -= stack;
    }
    return slots;
  });
}
function equipmentWeight() {
  return EQUIPMENT_ITEMS.reduce((total, item) => total + (equipped(item) ? (ITEM_META[item]?.weight || 0) : 0), 0);
}
function carriedWeight(bag = state.inventory) { return totalWeight(bag) + equipmentWeight(); }
function equipped(item) { return state.equipment?.[item] === item; }
function carrySlotCapacity() { return 12 + (equipped('backpack') ? 4 : 0); }
function carryWeightCapacity() { return 30 + (equipped('backpack') ? 8 : 0); }
function currentStash() { return state.stashes[state.currentSafeId] || {}; }
function totalSampleCount() {
  return itemCount(state.inventory, 'sample')
    + Object.values(state.stashes).reduce((total, stash) => total + itemCount(stash, 'sample'), 0);
}

function canCarryItem(item) {
  const projected = { ...state.inventory };
  addItem(projected, item, 1);
  return totalSlots(projected) <= carrySlotCapacity()
    && carriedWeight(projected) <= carryWeightCapacity();
}

function addCarriedItem(item, amount = 1) {
  let accepted = 0;
  while (accepted < amount && canCarryItem(item)) {
    addItem(state.inventory, item, 1);
    accepted += 1;
  }
  return accepted;
}

function logEvent(text, tone = '') {
  const timestamp = `${String(state.day).padStart(2, '0')}/${String(Math.min(state.turn, MAX_TURNS)).padStart(2, '0')}`;
  state.logs.unshift({ text, tone, timestamp });
  state.logs = state.logs.slice(0, 16);
  updateLog();
}

function updateLog() {
  ui.log.innerHTML = state.logs.map((entry) => `<div class="event ${entry.tone}"><time>${entry.timestamp}</time>${entry.text}</div>`).join('');
}

function lootSource(kind, id) {
  if (kind === 'container') {
    const container = state.containers.find((item) => item.id === id);
    return container && container.status === 'open' ? { kind, id, title: container.type, loot: container.loot, point: container } : null;
  }
  if (kind === 'groundLoot') {
    const drop = groundLootById(id);
    return drop ? { kind, id, title: '地面物资', loot: { [drop.item]: drop.amount }, point: drop, drop } : null;
  }
  return null;
}

function showLootReveal(kind, id, phase = 'ready') {
  state.lootReveal = { kind, id, phase };
  renderLootReveal();
}

function renderLootReveal() {
  const reveal = state.lootReveal;
  const source = reveal && lootSource(reveal.kind, reveal.id);
  if (!ui.lootReveal || !source || state.mode !== 'field' || manhattan(source.point, state.player) > 1 || !Object.values(source.loot).some((amount) => amount > 0)) {
    if (ui.lootReveal) ui.lootReveal.hidden = true;
    return;
  }
  ui.lootReveal.hidden = false;
  ui.lootReveal.classList.remove('opening', 'ready');
  ui.lootReveal.classList.add(reveal.phase === 'opening' ? 'opening' : 'ready');
  ui.lootTitle.textContent = source.title;
  ui.lootStatus.textContent = reveal.phase === 'opening' ? '锁扣正在解除，物资暂不可取。' : '点击一件物资，每次只取 1 件。';
  if (reveal.phase === 'opening') {
    ui.lootItems.innerHTML = '';
    return;
  }
  ui.lootItems.innerHTML = Object.entries(source.loot).filter(([, amount]) => amount > 0).map(([item, amount]) => {
    const meta = ITEM_META[item] || { label: item, glyph: '·' };
    const canTake = canCarryItem(item);
    return `<button class="loot-item" data-loot-kind="${source.kind}" data-loot-source="${source.id}" data-loot-item="${item}" ${canTake ? '' : 'disabled'} title="拾取${meta.label}×1">
      <span class="loot-item-icon" aria-hidden="true">${meta.glyph}</span>
      <span class="loot-item-copy"><strong>${meta.label}</strong><small>剩余 ×${amount} · 单件拾取</small></span>
      <span class="loot-item-take">＋1</span>
    </button>`;
  }).join('');
}

function lootOne(kind, id, item) {
  const source = lootSource(kind, id);
  if (!source || state.mode !== 'field' || state.lootReveal?.phase === 'opening') return;
  if (manhattan(source.point, state.player) > 1) { logEvent('靠近物资后才能拾取。', 'warn'); return; }
  if (itemCount(source.loot, item) <= 0) return;
  if (!canCarryItem(item)) { logEvent('背包格数或负重不足，物资仍留在原处。', 'warn'); return; }
  addItem(state.inventory, item, 1);
  if (source.kind === 'container') takeItem(source.loot, item, 1);
  if (source.kind === 'groundLoot') source.drop.amount -= 1;
  logEvent(`你拾取${ITEM_META[item]?.label || item}×1。`, 'good');
  const emptied = source.kind === 'groundLoot' ? source.drop.amount <= 0 : !Object.values(source.loot).some((amount) => amount > 0);
  if (emptied) {
    if (source.kind === 'groundLoot') state.groundLoot = state.groundLoot.filter((drop) => drop.id !== source.id);
    state.lootReveal = null;
    state.selectedTarget = null;
  }
  updateUI();
}

function addNoise(intensity, label = '声响') {
  if (intensity <= 0) return;
  if (state.buffs?.noiseScale != null) {
    intensity = Math.max(0, Math.round(intensity * state.buffs.noiseScale));
    state.buffs.noiseScale = null;
  }
  if (intensity <= 0) return;
  state.noiseEvents.push({ x: state.player.x, y: state.player.y, intensity, ttl: 3 });
  if (intensity >= 10) logEvent(`${label}扩散开来，远处的玻璃开始震动。`, 'warn');
}

function noisePropagationRadius(event) {
  return Math.max(0, event.intensity * currentWeather().sound);
}

function interruptActivationIfDisplaced() {
  if (!state.activation) return false;
  const candidate = state.safePoints.find((safe) => safe.id === state.activation.id && !safe.active);
  if (candidate && dist(candidate, state.player) <= 1.5) return false;
  state.activation = null;
  logEvent('你离开了控制室，启动流程中断，进度已清零。', 'danger');
  return true;
}

function setPlayerPosition(x, y) {
  if (state.player.x === x && state.player.y === y) return;
  state.player.x = x;
  state.player.y = y;
  interruptActivationIfDisplaced();
}

function movePlayer(dx, dy) {
  if (state.mode !== 'field') return;
  const previousSafe = poweredSafeAt(state.player);
  const previousFacility = safeFacilityAt(state.player);
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  if (!isPlayerWalkable(nx, ny)) {
    logEvent('前方被废墟、积水或感染体挡住了。');
    return;
  }
  setPlayerPosition(nx, ny);
  state.lootReveal = null;
  state.player.facing = dy < 0 ? 'n' : dy > 0 ? 's' : dx < 0 ? 'w' : 'e';
  visitAroundPlayer();
  advanceTurns(1, Math.max(0, state.inventory.heavy ? 2 : 0));
  if (state.mode !== 'field') return;
  const safe = poweredSafeAt(state.player);
  const facility = safeFacilityAt(state.player);
  if (previousSafe && !safe) {
    logEvent(`你离开${previousSafe.name}的热屏障范围，背包与装备保持当前状态。`, 'warn');
  }
  if (facility && (!previousFacility || state.currentSafeId !== facility.id)) {
    enterSafeZone(facility);
  }
  updateUI();
}

function enterSafeZone(safe) {
  if (!safe?.active || state.mode !== 'field') return false;
  state.currentSafeId = safe.id;
  state.selectedTarget = null;
  state.lootReveal = null;
  if (safe.power > 0) {
    logEvent(`你进入${safe.name}的热屏障范围。仓库和稳定电力已接通，可以整理物资、制作、修复或睡到下一天。`, 'good');
  } else {
    logEvent(`你进入${safe.name}的设施范围。热屏障已经断电，仓库仍可使用；维修后才能制作或睡觉。`, 'warn');
  }
  updateUI();
  return true;
}

function isWalkable(x, y) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return false;
  return state.terrain[y][x] !== 'water';
}

function isPlayerWalkable(x, y) {
  return isWalkable(x, y) && !state.zombies.some((zombie) => isActiveZombie(zombie) && zombie.x === x && zombie.y === y);
}

function advanceTurns(cost = 1, noise = 0) {
  if (state.mode !== 'field') return;
  if (noise) addNoise(noise, noise >= 10 ? '巨大的声音' : '动作');
  // A player action may consume more than one clock turn (for example, a
  // normal hack). Each zombie still gets only one response to that action,
  // so it cannot move on one sub-turn and attack on the next.
  const zombieAction = new Set();
  for (let index = 0; index < cost; index += 1) {
    if (state.mode !== 'field') break;
    state.turn += 1;
    state.thirst = clamp(state.thirst - (insideBuilding(state.player) ? 0.7 : 1), 0, 100);
    state.hunger = clamp(state.hunger - 0.48, 0, 100);
    state.containers.forEach((container) => { if (container.lockTurns > 0) container.lockTurns -= 1; });
    state.noiseEvents.forEach((event) => { event.ttl -= 1; });
    state.noiseEvents = state.noiseEvents.filter((event) => event.ttl > 0);
    const nightBegins = state.turn === 53;
    if (state.turn === 45) logEvent('气温开始下降。高温压制正在减弱，夜行感染体即将复苏。', 'warn');
    if (nightBegins) logEvent('夜幕降临。常规感染体重新涌入街区，新的尸群正在出现。', 'danger');
    updateZombies(zombieAction);
    if (state.mode !== 'field') return;
    if (nightBegins) {
      wakeNightZombies();
      spawnNightSurge();
    }
    spawnForTurn();
    if (state.thirst <= 0 || state.hunger <= 0) {
      state.health -= 3;
      const reason = state.thirst <= 0 && state.hunger <= 0 ? '脱水和饥饿' : state.thirst <= 0 ? '严重脱水' : '饥饿';
      logEvent(`${reason}正在损害你的身体（-3生命）。`, 'danger');
    }
    if (state.health <= 0) {
      endRun('dead', '你在野外失去了行动能力。');
      return;
    }
    if (state.turn >= MAX_TURNS) {
      const safe = poweredSafeAt(state.player);
      startNextDay();
      logEvent(safe
        ? `第${state.day}天白天开始。你在${safe.name}内度过了夜晚，普通夜行尸已进入蛰伏。今日天气：${currentWeather().name}。`
        : `第${state.day}天白天开始。你在野外熬过了夜晚，普通夜行尸已进入蛰伏；位置和携带物资保持不变。今日天气：${currentWeather().name}。`, safe ? 'good' : 'warn');
    }
  }
  visitAroundPlayer();
  updateUI();
}

function spawnForTurn() {
  const night = isNight();
  if (!night && state.turn % 10 !== 0) return;
  const target = night ? nightZombieTarget() : dayZombieTarget();
  const deficit = target - activeZombieCount();
  if (deficit <= 0) return;
  const count = night ? Math.min(deficit, 2 + (state.random() > 0.58 ? 1 : 0)) : 1;
  for (let i = 0; i < count; i += 1) {
    if (!spawnOne({ night, minDistance: night ? 3 : 7, allowVisible: night })) break;
  }
}

function spawnNightSurge() {
  const deficit = nightZombieTarget() - activeZombieCount();
  const count = Math.min(deficit, 6 + state.pressure);
  for (let index = 0; index < count; index += 1) {
    if (!spawnOne({ night: true, minDistance: 3, allowVisible: true })) break;
  }
}

function spawnOne({ night = isNight(), minDistance = night ? 3 : 7, allowVisible = night } = {}) {
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const point = { x: 1 + Math.floor(state.random() * (WORLD_W - 2)), y: 1 + Math.floor(state.random() * (WORLD_H - 2)) };
    // Night arrivals may materialize inside view, but never within two square
    // tiles of the player and never near an active thermal safe point.
    if (squareDistance(point, state.player) < minDistance || distanceToAnyPoweredSafe(point) < 8) continue;
    if (!allowVisible && visibleAt(point.x, point.y)) continue;
    const type = night ? rollNightZombieType() : HEAT_RESISTANT_TYPE;
    state.zombies.push({ id: `${state.day}-${state.turn}-${state.zombies.length}`, ...point, type, hp: type === 'brute' ? 130 : type === 'hunter' ? 74 : 52, state: 'wander', cooldown: 0, seen: false });
    return true;
  }
  return false;
}

function rollNightZombieType() {
  const roll = state.random();
  if (roll < 0.045) return 'brute';
  if (roll < 0.105) return 'screamer';
  if (roll < 0.22) return HEAT_RESISTANT_TYPE;
  return 'common';
}

function updateZombies(zombieAction = null) {
  const playerPoint = state.player;
  const lastNoise = state.noiseEvents[state.noiseEvents.length - 1];
  const playerSafe = poweredSafeAt(playerPoint);
  for (const zombie of state.zombies) {
    if (!isActiveZombie(zombie)) continue;
    if (zombieAction?.has(zombie.id)) continue;
    if (playerSafe && squareDistance(zombie, playerSafe) <= playerSafe.radius + 2) {
      zombie.state = 'perimeter';
      stepZombieAway(zombie, playerSafe);
      zombie.cooldown = Math.max(zombie.cooldown, 1);
      zombieAction?.add(zombie.id);
      continue;
    }
    // Resolve contact from the position at the start of this zombie's action.
    // A zombie that began adjacent attacks in place; it cannot move and attack
    // in the same turn. Zombies that were not adjacent may move, but their
    // newly adjacent position does not deal damage until the next turn.
    const wasAdjacent = manhattan(zombie, playerPoint) <= 1;
    zombie.cooldown = Math.max(0, zombie.cooldown - 1);
    if (wasAdjacent) {
      if (zombie.cooldown === 0) {
        zombie.cooldown = zombie.type === 'brute' ? 3 : 2;
        const baseDamage = zombie.type === 'brute' ? 19 : zombie.type === 'hunter' ? 13 : 8;
        const shieldReduction = state.buffs?.contactShield ? 8 : 0;
        const damage = Math.max(1, baseDamage - (equipped('armor') ? 5 : 0) - shieldReduction);
        if (state.buffs?.contactShield) state.buffs.contactShield = 0;
        state.health -= damage;
        logEvent(`${zombieLabel(zombie)}扑向你，造成${damage}点伤势。`, 'danger');
        if (zombie.type === 'screamer' && state.random() > 0.48) addNoise(9, '尖啸');
        if (state.health <= 0) {
          endRun('dead', '你被尸群拖入了黑暗。');
          return;
        }
      }
      zombieAction?.add(zombie.id);
      continue;
    }
    const zombieDist = dist(zombie, playerPoint);
    const active = zombie.type !== 'common' || isNight() || insideBuilding(zombie) || zombieDist <= 2.2;
    if (!active) {
      if (state.random() > 0.18) continue;
    }
    const noiseDist = lastNoise ? dist(zombie, lastNoise) : 999;
    const noiseRadius = lastNoise ? noisePropagationRadius(lastNoise) : 0;
    if (zombieDist <= 4) {
      zombie.state = 'track';
      stepZombie(zombie, playerPoint);
    } else if (lastNoise && noiseDist <= noiseRadius) {
      zombie.state = 'investigate';
      stepZombie(zombie, lastNoise);
    } else if (isNight() || insideBuilding(zombie)) {
      if (state.random() < 0.6) stepZombie(zombie, { x: zombie.x + Math.round(state.random() * 2 - 1), y: zombie.y + Math.round(state.random() * 2 - 1) });
      zombie.state = 'wander';
    }
    zombieAction?.add(zombie.id);
  }
}

function stepZombieAway(zombie, safe) {
  const dx = zombie.x - safe.x;
  const dy = zombie.y - safe.y;
  let nx = zombie.x + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx || 1) : 0);
  let ny = zombie.y + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy || 1) : 0);
  if (!isWalkable(nx, ny)) {
    nx = zombie.x + Math.sign(dx || 1);
    ny = zombie.y + Math.sign(dy || 1);
  }
  if (isWalkable(nx, ny)) { zombie.x = clamp(nx, 0, WORLD_W - 1); zombie.y = clamp(ny, 0, WORLD_H - 1); }
}

function stepZombie(zombie, target) {
  const dx = target.x - zombie.x;
  const dy = target.y - zombie.y;
  let nx = zombie.x;
  let ny = zombie.y;
  if (Math.abs(dx) >= Math.abs(dy)) nx += Math.sign(dx);
  else ny += Math.sign(dy);
  // Zombies never occupy the player's cell. They must spend a later turn
  // attacking from an orthogonally adjacent cell instead.
  if (nx === state.player.x && ny === state.player.y) return;
  if (isWalkable(nx, ny)) { zombie.x = clamp(nx, 0, WORLD_W - 1); zombie.y = clamp(ny, 0, WORLD_H - 1); }
}

function zombieLabel(zombie) {
  return ({ common: '普通夜行尸', hunter: '耐热变异尸', screamer: '尖啸尸', brute: '重甲尸' })[zombie.type] || '丧尸';
}

function performAction(action) {
  if (state.mode === 'dead' || state.mode === 'won') return;
  if (action === 'inspect') return inspectArea();
  if (action === 'quiet') { logEvent('你贴着墙根安静等待。'); return advanceTurns(1, 0); }
  if (action === 'hack') return hackContainer();
  if (action === 'brute') return bruteContainer();
  if (action === 'loot') return lootContainer();
  if (action === 'store-selected') return storeSelectedItem();
  if (action === 'discard-selected') return discardSelectedItem();
  if (action === 'melee') return melee();
  if (action === 'shoot') return shoot();
  if (action === 'drink') return drinkWater();
  if (action === 'eat') return eatFood();
  if (action === 'medkit') return useMedkit();
  if (action === 'use-adrenaline') return useInjection('adrenaline');
  if (action === 'use-sedative') return useInjection('sedative');
  if (action === 'use-coagulant') return useInjection('coagulant');
  if (action === 'activate') return activateSafePoint();
  if (RECIPES[action]) return craftRecipe(action);
  if (action === 'repair') return repairSafePoint();
  if (action === 'rest') return actionRest();
  if (action === 'terminal') return activateTerminal();
  if (action === 'recenter') return recenterView();
}

function recenterView() {
  state.cameraPan.x = 0;
  state.cameraPan.y = 0;
  canvasState.pointer = null;
  hideTooltip();
  updateUI();
}

function inspectArea() {
  const container = selectedContainer() || nearestContainer();
  const zombie = selectedZombie() || nearestZombie(3);
  const candidate = candidateSafeAt(state.player);
  if (container) {
    const contents = Object.entries(container.loot).map(([item, amount]) => `${ITEM_META[item]?.label || item}×${amount}`).join('、');
    logEvent(container.status === 'open'
      ? `${container.type}已经打开，剩余：${contents}。`
      : `${container.type}仍然封闭。可能有：${contents}。`);
  } else if (candidate) {
    logEvent(`${candidate.name}的热交换系统已经失效。需要金属×6、滤芯×1、电池×1，并连续启动3回合。`, 'warn');
  } else if (zombie) {
    logEvent(`近处是${zombieLabel(zombie)}，它的动作还没有完全转向你。`, 'danger');
  } else if (terminalNearby()) {
    logEvent('区域终端仍有电，但需要额外开辟3个前线安全点并取得3份耐热株核心样本。', 'warn');
  } else {
    const building = buildingAt(state.player.x, state.player.y);
    logEvent(building
      ? isNight()
        ? `${building.name}的冷暗角落重新活了过来，夜行尸可能从这里涌出。`
        : `${building.name}内部只剩热风与空壳，高温让普通感染体退出了街区。`
      : '街道上有碎玻璃、拖行痕和一盏仍在闪烁的路灯。');
  }
  advanceTurns(1, 0);
}

function hackContainer() {
  const container = selectedContainer() || nearestContainer();
  if (!container) { logEvent('附近没有可以正常破解的容器。'); return; }
  if (manhattan(container, state.player) > 1) { logEvent('你还没有靠近这个容器。', 'warn'); return; }
  if (container.status === 'open') return lootContainer(container);
  if (container.lockTurns > 0) { logEvent(`锁定还剩${container.lockTurns}回合。`); return; }
  const chance = clamp(0.74 - state.pressure * 0.035 + (itemCount(state.inventory, 'decoder') ? 0.13 : 0), 0.35, 0.92);
  advanceTurns(2, 1);
  if (state.mode !== 'field') return;
  if (state.random() > chance) {
    container.lockTurns = 2;
    logEvent(`${container.type}破解失败，电子锁进入冷却。`, 'warn');
    return;
  }
  openContainer(container, false);
}

function bruteContainer() {
  const container = selectedContainer() || nearestContainer();
  if (!container) { logEvent('附近没有可以暴力拆解的容器。'); return; }
  if (manhattan(container, state.player) > 1) { logEvent('你还没有靠近这个容器。', 'warn'); return; }
  if (container.status === 'open') return lootContainer(container);
  advanceTurns(1, 10);
  if (state.mode !== 'field') return;
  openContainer(container, true);
}

function openContainer(container, violent) {
  container.status = 'open';
  container.openedAt = performance.now();
  state.lootOpened += 1;
  if (violent && state.random() > 0.68) {
    const damaged = Object.keys(container.loot).find((item) => !MISSION_CRITICAL_ITEMS.has(item) && container.loot[item] > 0);
    if (damaged) takeItem(container.loot, damaged, 1);
    logEvent(damaged
      ? `${container.type}被撬开，但有一件物品被损坏。`
      : `${container.type}被撬开，核心样本保护匣承受了冲击。`, 'warn');
  } else {
    logEvent(`${container.type}已经打开。`, 'good');
  }
  if (manhattan(container, state.player) <= 1 && isPlayerWalkable(container.x, container.y)) {
    setPlayerPosition(container.x, container.y);
    visitAroundPlayer();
  }
  state.selectedTarget = containerHasLoot(container) ? { kind: 'container', id: container.id } : null;
  if (containerHasLoot(container)) {
    const contents = Object.entries(container.loot).map(([item, amount]) => `${ITEM_META[item]?.label || item}×${amount}`).join('、');
    showLootReveal('container', container.id, 'opening');
    logEvent(`箱内物资：${contents}。`, 'warn');
    window.setTimeout(() => {
      if (state.mode !== 'field' || state.lootReveal?.kind !== 'container' || state.lootReveal?.id !== container.id) return;
      state.lootReveal.phase = 'ready';
      updateUI();
    }, 640);
  }
  updateUI();
}

function lootContainer(target = selectedContainer() || nearestContainer()) {
  const container = target;
  if (!container || !containerHasLoot(container)) {
    logEvent('这个容器里已经没有可以带走的物资。');
    return;
  }
  if (manhattan(container, state.player) > 1) {
    logEvent('靠近容器后才能拾取剩余物资。', 'warn');
    return;
  }
  state.selectedTarget = { kind: 'container', id: container.id };
  showLootReveal('container', container.id);
  updateUI();
}

function melee() {
  const zombie = selectedZombie() || nearestZombie(2);
  if (!zombie) { logEvent('近战范围内没有目标。'); return; }
  if (!adjacent(zombie, state.player) && manhattan(zombie, state.player) !== 0) { logEvent('你还没有靠近这个丧尸。', 'warn'); return; }
  const attackCell = { x: zombie.x, y: zombie.y };
  const damage = 28 + (itemCount(state.inventory, 'metal') > 4 ? 4 : 0) + (equipped('weapon') ? 12 : 0);
  zombie.hp -= damage;
  const killed = settleZombieDeath(zombie);
  advanceTurns(1, 3);
  if (state.mode !== 'field') return;
  if (killed) {
    if (isPlayerWalkable(attackCell.x, attackCell.y)) { setPlayerPosition(attackCell.x, attackCell.y); visitAroundPlayer(); }
    logEvent(`${zombieLabel(zombie)}倒下，地面留下新鲜血迹。你占据了它原来的格子。`, 'good');
  }
  else logEvent(`你击中${zombieLabel(zombie)}，造成${damage}点伤害。`, 'warn');
  updateUI();
}

function shoot() {
  const zombie = selectedZombie() || visibleZombie(8);
  if (!zombie) { logEvent('视野内没有可射击的目标。'); return; }
  if (!takeItem(state.inventory, 'ammo', 1)) { logEvent('没有弹药。'); return; }
  // Remember the firing distance before the zombie phase. A remote shot must
  // never become a melee-style displacement just because the target moved
  // during the spent turn.
  const firedFromAdjacent = adjacent(zombie, state.player) || manhattan(zombie, state.player) === 0;
  const shotTargetCell = { x: zombie.x, y: zombie.y };
  const damage = zombie.type === 'brute' ? 38 : 58;
  const suppressed = equipped('suppressor');
  zombie.hp -= damage;
  const killed = settleZombieDeath(zombie);
  advanceTurns(1, suppressed ? 7 : 18);
  if (state.mode !== 'field') return;
  if (killed) {
    if (firedFromAdjacent && isPlayerWalkable(shotTargetCell.x, shotTargetCell.y)) {
      setPlayerPosition(shotTargetCell.x, shotTargetCell.y); visitAroundPlayer();
    }
    logEvent(`${suppressed ? '沉闷的枪声' : '枪声'}停下，${zombieLabel(zombie)}倒在${firedFromAdjacent ? '脚边' : '远处'}。`, 'good');
  }
  else logEvent(`子弹击中${zombieLabel(zombie)}，造成${damage}点伤害。`, 'warn');
  updateUI();
}

function settleZombieDeath(zombie) {
  if (zombie.hp > 0 || zombie.dead) return false;
  state.kills += 1;
  zombie.dead = true;
  zombie.corpseTTL = Infinity;
  if (state.selectedTarget?.kind === 'zombie' && state.selectedTarget.id === zombie.id) state.selectedTarget = null;
  return true;
}

function useMedkit() {
  if (!takeItem(state.inventory, 'medkit', 1)) { logEvent('没有可用的绷带。'); return; }
  state.health = clamp(state.health + 30, 0, 100);
  logEvent('你处理了伤口，动作重新稳定下来。', 'good');
  advanceTurns(1, 0);
}

function drinkWater() {
  if (!takeItem(state.inventory, 'water', 1)) { logEvent('没有可饮用的净水。'); return; }
  state.thirst = clamp(state.thirst + 32, 0, 100);
  logEvent('你喝下净水，口渴得到缓解。', 'good');
  advanceTurns(1, 0);
}

function eatFood() {
  if (!takeItem(state.inventory, 'food', 1)) { logEvent('没有可以直接食用的口粮。'); return; }
  state.hunger = clamp(state.hunger + 28, 0, 100);
  logEvent('你吃下口粮，饥饿得到缓解。', 'good');
  advanceTurns(1, 0);
}

function useInjection(item) {
  if (state.mode !== 'field') { logEvent('针剂需要在野外行动阶段使用。'); return; }
  if (!takeItem(state.inventory, item, 1)) { logEvent(`没有可用的${ITEM_META[item]?.label || item}。`); return; }
  if (item === 'adrenaline') {
    state.health = clamp(state.health + 8, 0, 100);
    state.buffs.noiseScale = 0;
    logEvent('肾上腺素起效：恢复8生命，下一次有声行动不会扩散噪声。', 'good');
  } else if (item === 'sedative') {
    state.buffs.noiseScale = 0.45;
    logEvent('镇静针剂起效：下一次有声行动的传播强度降低。', 'good');
  } else if (item === 'coagulant') {
    state.buffs.contactShield = 1;
    logEvent('凝血针剂起效：下一次接触伤害降低8点。', 'good');
  }
  updateUI();
}

function activateSafePoint() {
  if (state.mode !== 'field') return;
  const candidate = candidateSafeAt(state.player);
  if (!candidate) { logEvent('附近没有可开辟的隔离设施。'); return; }
  if (state.activation && state.activation.id !== candidate.id) {
    state.activation = null;
    logEvent('你离开了原控制室，之前的启动进度已清零。', 'danger');
  }
  if (!state.activation || state.activation.id !== candidate.id) {
    if (itemCount(state.inventory, 'metal') < 6 || itemCount(state.inventory, 'filter') < 1 || itemCount(state.inventory, 'battery') < 1) {
      logEvent('开辟需要金属×6、滤芯×1、电池×1。', 'warn');
      return;
    }
    takeItem(state.inventory, 'metal', 6);
    takeItem(state.inventory, 'filter', 1);
    takeItem(state.inventory, 'battery', 1);
    state.activation = { id: candidate.id, progress: 0 };
    logEvent(`开始启动${candidate.name}。连续3回合不能离开现场。`, 'warn');
  }
  state.activation.progress += 1;
  advanceTurns(1, 8);
  if (state.mode !== 'field') return;
  if (!state.activation || state.activation.id !== candidate.id) {
    updateUI();
    return;
  }
  if (state.activation.progress >= 3) {
    candidate.active = true;
    candidate.radius = 2;
    candidate.power = 74;
    candidate.level = 1;
    candidate.stash = emptyStash();
    state.stashes[candidate.id] = candidate.stash;
    state.openedSafeCount += 1;
    state.currentSafeId = candidate.id;
    state.activation = null;
    logEvent(`${candidate.name}恢复了热风和正压，前线安全点已开辟。`, 'good');
    enterSafeZone(candidate);
  } else {
    logEvent(`启动进度 ${state.activation.progress} / 3。热风管正在升温。`, 'warn');
  }
  updateUI();
}

function craftRecipe(action) {
  const recipe = RECIPES[action];
  if (!recipe) return;
  const safe = safeFacilityAt(state.player);
  if (!safe) {
    logEvent('野外没有稳定电力。回到安全点内，才能使用工作台制作。', 'warn');
    return;
  }
  state.currentSafeId = safe.id;
  const stash = currentStash();
  const missing = Object.entries(recipe.ingredients)
    .filter(([item, amount]) => itemCount(stash, item) < amount)
    .map(([item, amount]) => `${ITEM_META[item]?.label || item}×${amount - itemCount(stash, item)}`);
  if (missing.length) {
    logEvent(`${recipe.label}材料不足：还需要${missing.join('、')}。`, 'warn');
    return;
  }
  if (safe.power < recipe.power) {
    logEvent(`电力不足：${recipe.label}需要${recipe.power}电力，当前只有${Math.round(safe.power)}。`, 'warn');
    return;
  }
  Object.entries(recipe.ingredients).forEach(([item, amount]) => takeItem(stash, item, amount));
  safe.power -= recipe.power;
  const turns = recipe.turns || 2;
  logEvent(`${safe.name}开始制作${recipe.label}，预计耗时${turns}回合。`, 'warn');
  advanceTurns(turns, 0);
  if (state.mode !== 'field') return;
  addItem(stash, recipe.output, recipe.amount);
  logEvent(`${safe.name}制作完成：${recipe.label}×${recipe.amount}。作用：${recipe.effect}`, 'good');
  updateUI();
}

function craftWater() { return craftRecipe('craft-water'); }
function craftBandage() { return craftRecipe('craft-bandage'); }
function craftDecoder() { return craftRecipe('craft-decoder'); }

function repairSafePoint() {
  const safe = safeFacilityAt(state.player);
  if (!safe) { logEvent('需要站在安全点内修复热屏障。'); return; }
  state.currentSafeId = safe.id;
  const stash = currentStash();
  if (itemCount(stash, 'metal') < 4 || itemCount(stash, 'filter') < 1 || itemCount(stash, 'battery') < 1) { logEvent('修复热屏障需要金属×4、滤芯×1、电池×1。'); return; }
  takeItem(stash, 'metal', 4); takeItem(stash, 'filter'); takeItem(stash, 'battery');
  logEvent(`${safe.name}开始修复热屏障，预计耗时2回合。`, 'warn');
  advanceTurns(2, 0);
  if (state.mode !== 'field') return;
  safe.power = clamp(safe.power + 36, 0, 120);
  safe.radius = Math.max(safe.radius, safe.level >= 2 ? 3 : 2);
  logEvent(`${safe.name}的热屏障恢复了稳定输出。`, 'good'); updateUI();
}

function startNextDay({ slept = false } = {}) {
  state.day += 1;
  state.turn = 1;
  state.overtime = 0;
  state.pressure = Math.min(5, 1 + Math.floor((state.day - 1) / 5));
  state.weatherIndex = Math.floor(state.random() * WEATHER.length);
  if (slept) {
    state.health = clamp(state.health + 12, 0, 100);
    state.thirst = clamp(state.thirst - 12, 0, 100);
    state.hunger = clamp(state.hunger - 8, 0, 100);
    state.selectedTarget = null;
  }
  state.activation = null;
  state.noiseEvents = [];
  // Ordinary night infections hibernate at dawn; every live entity and corpse remains in the world.
  spawnZombies(false);
  visitAroundPlayer();
}

function actionRest() {
  const safe = poweredSafeAt(state.player);
  if (!safe) {
    logEvent('只有在有电的安全点内才能睡觉到下一天。', 'warn');
    return;
  }
  state.currentSafeId = safe.id;
  const sleepCost = sleepPowerCost();
  if (safe.power < sleepCost) {
    logEvent(`电力不足：睡到下一天需要${sleepCost}电力，当前只有${Math.round(safe.power)}。`, 'warn');
    return;
  }
  safe.power -= sleepCost;
  startNextDay({ slept: true });
  logEvent(`第${state.day}天开始。${safe.name}电力剩余${Math.round(safe.power)}%，普通夜行尸已进入蛰伏。今日天气：${currentWeather().name}。`, state.pressure >= 4 ? 'warn' : 'good');
  updateUI();
}

function transferToStash(item, requestedAmount = 1) {
  const safe = safeFacilityAt(state.player);
  if (!safe) { logEvent('只有在安全点内才能存入仓库。', 'warn'); return; }
  state.currentSafeId = safe.id;
  const amount = Math.min(1, requestedAmount, itemCount(state.inventory, item));
  if (amount <= 0) return;
  takeItem(state.inventory, item, amount);
  addItem(currentStash(), item, amount);
  state.selectedInventory = null;
  logEvent(`已存入${safe.name}仓库：${ITEM_META[item]?.label || item}×${amount}。`, 'good');
  updateUI();
}

function takeFromStash(item, requestedAmount = 1) {
  const safe = safeFacilityAt(state.player);
  if (!safe) { logEvent('只有在安全点内才能取用仓库物资。', 'warn'); return; }
  state.currentSafeId = safe.id;
  const stash = currentStash();
  const available = Math.min(1, requestedAmount, itemCount(stash, item));
  let taken = 0;
  while (taken < available && canCarryItem(item)) {
    addItem(state.inventory, item, 1);
    taken += 1;
  }
  if (taken > 0) {
    takeItem(stash, item, taken);
    state.selectedInventory = null;
    logEvent(`已从${safe.name}仓库取出：${ITEM_META[item]?.label || item}×1。`, 'good');
  }
  if (taken < available) logEvent('背包格数或负重不足，剩余物资仍在仓库。', 'warn');
  updateUI();
}

function selectedInventoryEntry() {
  const selected = state.selectedInventory;
  if (!selected || itemCount(state.inventory, selected.item) <= 0) return null;
  return { ...selected, amount: 1 };
}

function selectInventoryItem(item, amount, slotIndex) {
  const sameSlot = state.selectedInventory?.item === item && state.selectedInventory?.slotIndex === slotIndex;
  state.selectedInventory = sameSlot ? null : { item, amount, slotIndex };
  updateUI();
}

function storeSelectedItem() {
  const selected = selectedInventoryEntry();
  if (!selected) return;
  transferToStash(selected.item, 1);
}

function discardSelectedItem() {
  const selected = selectedInventoryEntry();
  if (!selected) return;
  if (!takeItem(state.inventory, selected.item, 1)) return;
  dropGroundItem(selected.item, 1);
  state.selectedInventory = null;
  const dropped = state.groundLoot.find((drop) => drop.x === state.player.x && drop.y === state.player.y && drop.item === selected.item);
  state.selectedTarget = dropped ? { kind: 'groundLoot', id: dropped.id } : null;
  if (dropped) showLootReveal('groundLoot', dropped.id);
  logEvent(`你丢弃了${ITEM_META[selected.item]?.label || selected.item}×1，物资留在脚下。`, 'warn');
  updateUI();
}

function equipItem(item) {
  if (!EQUIPMENT_ITEMS.includes(item)) return;
  if (equipped(item)) {
    logEvent(`${ITEM_META[item].label}已经装备，备用件仍留在背包。`);
    return;
  }
  if (!takeItem(state.inventory, item, 1)) {
    logEvent(`没有可装备的${ITEM_META[item]?.label || item}。`, 'warn');
    return;
  }
  state.equipment[item] = item;
  state.selectedInventory = null;
  logEvent(`${ITEM_META[item].label}已装备。${ITEM_META[item].effect}`, 'good');
  updateUI();
}

function unequipItem(item) {
  if (!equipped(item)) return;
  const equippedValue = state.equipment[item];
  state.equipment[item] = null;
  if (!canCarryItem(item)) {
    state.equipment[item] = equippedValue;
    logEvent(`卸下${ITEM_META[item].label}后，背包容量或负重会超限。`, 'warn');
    updateUI();
    return;
  }
  addItem(state.inventory, item, 1);
  state.selectedInventory = null;
  logEvent(`${ITEM_META[item].label}已卸下。`, 'warn');
  updateUI();
}

function activateTerminal() {
  if (state.mode !== 'field') { logEvent('终端需要在研究区现场启动。'); return; }
  if (!terminalNearby()) { logEvent('你还没有到达区域热灭活终端。'); return; }
  const totalSample = totalSampleCount();
  if (state.openedSafeCount < REQUIRED_FRONTLINE_SAFE_POINTS) { logEvent('终端拒绝启动：需要额外开辟3个前线安全点。', 'warn'); return; }
  if (totalSample < REQUIRED_SAMPLES) { logEvent('终端需要3份耐热株核心样本。', 'warn'); return; }
  state.terminalActivated = true;
  logEvent('终端开始广播热灭活协议。城市的热源网络正在重新点亮。', 'good');
  endRun('won', '你完成了区域热灭活，安全点网络重新覆盖了城市。');
}

function endRun(result, copy) {
  if (state.mode === 'dead' || state.mode === 'won') return;
  state.mode = result;
  state.selectedTarget = null;
  state.selectedInventory = null;
  state.lootReveal = null;
  state.activation = null;
  ui.endEyebrow.textContent = result === 'won' ? 'RUN COMPLETE' : 'RUN ENDED';
  ui.endTitle.textContent = result === 'won' ? '区域热灭活完成' : '你倒下了';
  ui.endCopy.textContent = copy;
  ui.endStats.innerHTML = [
    ['存活天数', `${state.day}天`],
    ['开箱数量', `${state.lootOpened}`],
    ['消灭丧尸', `${state.kills}`],
  ].map(([label, value]) => `<div class="end-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  ui.modal.classList.remove('hidden');
  updateUI();
}

function closeModal() { ui.modal.classList.add('hidden'); }

function visitAroundPlayer() {
  const radius = 6;
  for (let y = state.player.y - radius; y <= state.player.y + radius; y += 1) {
    for (let x = state.player.x - radius; x <= state.player.x + radius; x += 1) {
      if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) state.visited.add(key(x, y));
    }
  }
}

function visibleAt(x, y) {
  const radius = Math.max(2, Math.floor(5.2 * currentWeather().visibility));
  return Math.abs(x - state.player.x) <= radius && Math.abs(y - state.player.y) <= radius;
}

function objectAtCell(x, y) {
  const zombie = state.zombies.find((item) => isActiveZombie(item) && item.x === x && item.y === y);
  const corpse = state.zombies.find((item) => item.dead && item.x === x && item.y === y && state.visited.has(key(x, y)));
  const groundLoot = groundLootAt(x, y);
  const container = state.containers.find((item) => item.x === x && item.y === y);
  const safe = state.safePoints.find((item) => item.x === x && item.y === y);
  const building = buildingAt(x, y);
  if (zombie && visibleAt(x, y)) return { kind: 'zombie', value: zombie };
  if (groundLoot) return { kind: 'groundLoot', value: groundLoot };
  if (corpse) return { kind: 'corpse', value: corpse };
  if (container) return { kind: 'container', value: container };
  if (safe) return { kind: 'safe', value: safe };
  if (x === state.terminal.x && y === state.terminal.y) return { kind: 'terminal', value: state.terminal };
  if (building) return { kind: 'building', value: building };
  return null;
}

function showTooltip(cell, pointer) {
  if (!ui.tooltip || !cell) return;
  const visited = state.visited.has(key(cell.x, cell.y));
  const live = visibleAt(cell.x, cell.y);
  if (!visited) {
    ui.tooltip.textContent = '未探索区域 · 长按或移动到已走过的地方查看记忆';
  } else {
    const object = objectAtCell(cell.x, cell.y);
    let text = object ? describeObject(object, live) : live ? '实时视野 · 空旷街格' : '探索记忆 · 静态环境已知，动态丧尸未知';
    if (!live && object?.kind === 'building') text += ' · 当前内部动态未知';
    ui.tooltip.textContent = text;
  }
  ui.tooltip.classList.remove('hidden');
  ui.tooltip.style.left = `${clamp(pointer.x + 12, 8, canvasState.width - 228)}px`;
  ui.tooltip.style.top = `${clamp(pointer.y + 12, 8, canvasState.height - 64)}px`;
}

function describeObject(object, live) {
  if (object.kind === 'zombie') return `${zombieLabel(object.value)} · ${object.value.state === 'track' ? '正在锁定你' : '活动中'}${live ? '' : ' · 当前动态未知'}`;
  if (object.kind === 'corpse') return `${zombieLabel(object.value)} · 已死亡，尸体仍在此处`;
  if (object.kind === 'groundLoot') return `地面物资 · ${groundLootLabel(object.value)} · 点击后单件拾取`;
  if (object.kind === 'container') {
    const remaining = Object.entries(object.value.loot || {}).map(([item, amount]) => `${ITEM_META[item]?.label || item}×${amount}`).join('、');
    if (object.value.status === 'open') return `${object.value.type} · ${remaining ? `已打开，剩余 ${remaining}` : '已搜空'}`;
    return `${object.value.type} · ${object.value.lockTurns > 0 ? `锁定 ${object.value.lockTurns} 回合` : '可破解/可暴力拆解'}`;
  }
  if (object.kind === 'safe') return `${object.value.name} · ${object.value.active ? `已开辟，热屏障${object.value.radius}格，电力${Math.round(object.value.power)}%` : '候选设施，尚未通电'}`;
  if (object.kind === 'terminal') return `区域热灭活终端 · ${state.terminalActivated ? '已启动' : '需要安全点和耐热株核心样本'}`;
  return `${object.value.name} · ${live ? '实时可见' : '已探索记忆'}`;
}

function hideTooltip() { if (ui.tooltip) ui.tooltip.classList.add('hidden'); }

function resizeCanvas() {
  const rect = frame.getBoundingClientRect();
  canvasState.width = rect.width;
  canvasState.height = rect.height;
  canvasState.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * canvasState.dpr);
  canvas.height = Math.floor(rect.height * canvasState.dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}

function camera() {
  const targetX = state.player.x * TILE + TILE / 2;
  const targetY = state.player.y * TILE + TILE / 2;
  const screenX = canvasState.width * 0.5;
  const screenY = canvasState.height * 0.58;
  const rawX = targetX - screenX + state.cameraPan.x;
  const rawY = targetY - screenY + state.cameraPan.y;
  return {
    x: clamp(rawX, 0, WORLD_W * TILE - canvasState.width),
    y: clamp(rawY, 0, WORLD_H * TILE - canvasState.height),
  };
}

function worldToScreen(x, y, cam = camera()) { return { x: x * TILE - cam.x, y: y * TILE - cam.y }; }
function screenToWorld(x, y, cam = camera()) { return { x: Math.floor((x + cam.x) / TILE), y: Math.floor((y + cam.y) / TILE) }; }

function draw() {
  if (!state) return;
  ctx.setTransform(canvasState.dpr, 0, 0, canvasState.dpr, 0, 0);
  ctx.clearRect(0, 0, canvasState.width, canvasState.height);
  const cam = camera();
  ctx.fillStyle = '#090e0e';
  ctx.fillRect(0, 0, canvasState.width, canvasState.height);
  drawTerrain(cam);
  drawZoneLabels(cam);
  state.buildings.forEach((building) => drawBuilding(building, cam));
  state.safePoints.forEach((safe) => drawSafePoint(safe, cam));
  drawContainers(cam);
  drawGroundLoot(cam);
  drawTerminal(cam);
  drawExplorationLayers(cam);
  drawNoise(cam);
  // Live zombies are real-time information; corpses are persistent map memory
  // and remain visible on explored cells even after the player leaves. Draw
  // corpses after the player so a same-cell kill still leaves a visible body.
  const liveZombies = state.zombies.filter((zombie) => isActiveZombie(zombie) && visibleAt(zombie.x, zombie.y));
  const rememberedCorpses = state.zombies.filter((zombie) => zombie.dead && state.visited.has(key(zombie.x, zombie.y)));
  liveZombies.forEach((zombie) => drawZombie(zombie, cam));
  drawPlayer(cam);
  rememberedCorpses.forEach((zombie) => drawZombie(zombie, cam));
  drawLighting(cam);
  drawPointer(cam);
  requestAnimationFrame(draw);
}

function drawTerrain(cam) {
  const xStart = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const yStart = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const xEnd = Math.min(WORLD_W, Math.ceil((cam.x + canvasState.width) / TILE) + 1);
  const yEnd = Math.min(WORLD_H, Math.ceil((cam.y + canvasState.height) / TILE) + 1);
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const point = worldToScreen(x, y, cam);
      const visited = state.visited.has(key(x, y));
      const terrain = state.terrain[y][x];
      const base = terrain === 'asphalt' ? '#39413f' : terrain === 'concrete' ? '#4c514c' : terrain === 'dry' ? '#4b4a3d' : '#35463e';
      ctx.fillStyle = visited ? base : '#101817';
      ctx.fillRect(point.x, point.y, TILE + 1, TILE + 1);
      if (!visited) continue;
      const noise = hash2(x, y);
      if (terrain === 'asphalt') {
        ctx.strokeStyle = 'rgba(22, 27, 26, .4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(point.x + 5, point.y + TILE * (0.35 + noise * 0.35)); ctx.lineTo(point.x + TILE - 7, point.y + TILE * (0.35 + noise * 0.35)); ctx.stroke();
      } else if (noise > 0.6) {
        ctx.fillStyle = 'rgba(188, 167, 119, .13)';
        ctx.fillRect(point.x + 10 + noise * 14, point.y + 13 + noise * 20, 3, 2);
      }
      if (noise < 0.18 && terrain !== 'asphalt') {
        ctx.strokeStyle = 'rgba(15, 24, 22, .33)';
        ctx.beginPath(); ctx.moveTo(point.x + 13, point.y + 12); ctx.lineTo(point.x + 23, point.y + 24); ctx.lineTo(point.x + 18, point.y + 34); ctx.stroke();
      }
    }
  }
}

function drawZoneLabels(cam) {
  const labels = [
    { x: 1, y: 1, text: '住宅区', style: 'residential' },
    { x: 10, y: 1, text: '商业街', style: 'commercial' },
    { x: 18, y: 0, text: '医院 / 研究区', style: 'hospital' },
    { x: 10, y: 16, text: '工业与锅炉房', style: 'industrial' },
    { x: 20, y: 16, text: '警局 / 防灾仓', style: 'security' },
  ];
  labels.forEach((label) => {
    const point = worldToScreen(label.x, label.y, cam);
    if (point.x < -160 || point.x > canvasState.width + 20 || point.y < -40 || point.y > canvasState.height + 20) return;
    ctx.fillStyle = 'rgba(230, 235, 224, .32)';
    ctx.font = '600 10px Segoe UI, Microsoft YaHei, sans-serif';
    ctx.fillText(label.text, point.x + 5, point.y + 16);
  });
}

function drawBuilding(building, cam) {
  const point = worldToScreen(building.x, building.y, cam);
  const w = building.w * TILE;
  const h = building.h * TILE;
  if (point.x > canvasState.width || point.x + w < 0 || point.y > canvasState.height || point.y + h < 0) return;
  const style = ZONE_STYLES[building.zone];
  const seen = state.visited.has(key(building.x, building.y));
  if (!seen) {
    ctx.fillStyle = 'rgba(17, 26, 24, .86)';
    ctx.fillRect(point.x, point.y, w, h);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(point.x + 8, point.y + 11, w, h);
  ctx.fillStyle = style.wall;
  ctx.fillRect(point.x, point.y, w, h);
  const near = insideBuilding(state.player) && buildingAt(state.player.x, state.player.y)?.id === building.id;
  ctx.fillStyle = near ? 'rgba(56, 70, 65, .44)' : style.roof;
  ctx.fillRect(point.x + 4, point.y + 4, w - 8, h - 8);
  ctx.strokeStyle = 'rgba(214, 220, 205, .25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(point.x + 4, point.y + 4, w - 8, h - 8);
  const cols = Math.max(2, Math.floor(building.w / 2));
  const rows = Math.max(1, Math.floor(building.h / 2));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = point.x + 16 + col * (w - 25) / cols;
      const wy = point.y + 18 + row * (h - 30) / rows;
      ctx.fillStyle = near ? 'rgba(224, 194, 131, .35)' : 'rgba(28, 42, 40, .65)';
      ctx.fillRect(wx, wy, 9, 7);
    }
  }
  ctx.fillStyle = style.accent;
  ctx.fillRect(point.x + w * 0.45, point.y + h - 7, 20, 4);
  if (building.zone === 'hospital') {
    ctx.fillStyle = 'rgba(227, 236, 225, .72)';
    ctx.fillRect(point.x + w * 0.2, point.y + 11, 24, 4);
    ctx.fillRect(point.x + w * 0.2 + 10, point.y + 1, 4, 24);
  }
  if (building.zone === 'industrial') {
    ctx.strokeStyle = 'rgba(221, 150, 95, .35)';
    ctx.beginPath(); ctx.moveTo(point.x + 14, point.y + h - 18); ctx.lineTo(point.x + w - 16, point.y + 18); ctx.stroke();
  }
}

function drawSafePoint(safe, cam) {
  const point = worldToScreen(safe.x + 0.5, safe.y + 0.5, cam);
  if (!state.visited.has(key(safe.x, safe.y))) return;
  if (safe.active) {
    ctx.save();
    ctx.strokeStyle = `rgba(230, 182, 104, ${safe.power > 22 ? 0.22 : 0.08})`;
    ctx.lineWidth = 3;
    const topLeft = worldToScreen(safe.x - safe.radius, safe.y - safe.radius, cam);
    const side = (safe.radius * 2 + 1) * TILE;
    ctx.strokeRect(topLeft.x + 2, topLeft.y + 2, side - 4, side - 4);
    ctx.fillStyle = safe.power > 22 ? 'rgba(229, 172, 86, .75)' : 'rgba(219, 117, 87, .65)';
    ctx.fillRect(point.x - 11, point.y - 8, 22, 16);
    ctx.fillStyle = '#e6c58e'; ctx.fillRect(point.x - 2, point.y - 15, 4, 30);
    ctx.fillRect(point.x - 10, point.y - 2, 20, 4);
    ctx.fillStyle = 'rgba(245, 219, 151, .62)';
    ctx.fillRect(point.x - 3, point.y - 24, 6, 6);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(160, 175, 162, .28)';
    ctx.fillRect(point.x - 9, point.y - 9, 18, 18);
    ctx.strokeStyle = 'rgba(209, 220, 205, .42)'; ctx.strokeRect(point.x - 9, point.y - 9, 18, 18);
  }
}

function drawContainers(cam) {
  state.containers.forEach((container) => {
    if (!visibleAt(container.x, container.y) && !state.visited.has(key(container.x, container.y))) return;
    const point = worldToScreen(container.x + 0.5, container.y + 0.58, cam);
    const open = container.status === 'open';
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = 'rgba(0, 0, 0, .34)'; ctx.fillRect(-13, 8, 26, 6);
    ctx.fillStyle = open ? '#56615c' : container.type.includes('医疗') ? '#829b91' : container.type.includes('军') ? '#5f6b59' : '#927458';
    ctx.fillRect(-12, -7, 24, 15);
    ctx.strokeStyle = open ? 'rgba(224, 189, 122, .42)' : 'rgba(224, 210, 174, .34)'; ctx.strokeRect(-12, -7, 24, 15);
    if (open) {
      const openProgress = clamp((performance.now() - (container.openedAt || 0)) / 280, 0, 1);
      ctx.save();
      ctx.translate(0, -14 - openProgress * 4);
      ctx.rotate(-0.16 * openProgress);
      ctx.fillStyle = '#303b37'; ctx.fillRect(-13, -2, 26, 5);
      ctx.restore();
    }
    else { ctx.fillStyle = 'rgba(242, 190, 100, .6)'; ctx.fillRect(-3, -2, 6, 3); }
    if (state.selectedTarget?.kind === 'container' && state.selectedTarget.id === container.id) { ctx.strokeStyle = 'rgba(238, 197, 119, .88)'; ctx.lineWidth = 2; ctx.strokeRect(-17, -12, 34, 26); }
    ctx.restore();
  });
}

function drawGroundLoot(cam) {
  state.groundLoot.forEach((drop) => {
    if (!visibleAt(drop.x, drop.y) && !state.visited.has(key(drop.x, drop.y))) return;
    const point = worldToScreen(drop.x + 0.5, drop.y + 0.58, cam);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .38)';
    ctx.fillRect(point.x - 13, point.y + 8, 26, 6);
    ctx.fillStyle = '#9e7b4d';
    ctx.fillRect(point.x - 11, point.y - 6, 22, 13);
    ctx.fillStyle = '#d2ae68';
    ctx.fillRect(point.x - 3, point.y - 8, 6, 17);
    ctx.strokeStyle = state.selectedTarget?.kind === 'groundLoot' && state.selectedTarget.id === drop.id ? 'rgba(238, 197, 119, .9)' : 'rgba(226, 194, 125, .46)';
    ctx.lineWidth = state.selectedTarget?.kind === 'groundLoot' && state.selectedTarget.id === drop.id ? 2 : 1;
    ctx.strokeRect(-13 + point.x, -8 + point.y, 26, 18);
    ctx.fillStyle = '#f0d28e';
    ctx.font = '600 9px Segoe UI, Microsoft YaHei, sans-serif';
    ctx.fillText(`×${drop.amount}`, point.x + 14, point.y - 7);
    ctx.restore();
  });
}

function drawTerminal(cam) {
  if (!visibleAt(state.terminal.x, state.terminal.y) && !state.visited.has(key(state.terminal.x, state.terminal.y))) return;
  const point = worldToScreen(state.terminal.x + 0.5, state.terminal.y + 0.5, cam);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(point.x - 17, point.y + 8, 34, 7);
  ctx.fillStyle = state.terminalActivated ? '#78bda7' : '#496968'; ctx.fillRect(point.x - 12, point.y - 16, 24, 24);
  ctx.fillStyle = '#101817'; ctx.fillRect(point.x - 7, point.y - 10, 14, 9);
  ctx.fillStyle = state.terminalActivated ? '#d6e7bf' : '#94c6bf'; ctx.fillRect(point.x - 3, point.y - 8, 6, 4);
  ctx.fillStyle = '#c5b06d'; ctx.fillRect(point.x - 15, point.y + 8, 30, 3);
}

function drawExplorationLayers(cam) {
  const xStart = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const yStart = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const xEnd = Math.min(WORLD_W, Math.ceil((cam.x + canvasState.width) / TILE) + 1);
  const yEnd = Math.min(WORLD_H, Math.ceil((cam.y + canvasState.height) / TILE) + 1);
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      if (!state.visited.has(key(x, y)) || visibleAt(x, y)) continue;
      const point = worldToScreen(x, y, cam);
      ctx.fillStyle = 'rgba(7, 13, 13, .24)';
      ctx.fillRect(point.x, point.y, TILE + 1, TILE + 1);
    }
  }
  const radius = Math.max(2, Math.floor(5.2 * currentWeather().visibility));
  const topLeft = worldToScreen(state.player.x - radius, state.player.y - radius, cam);
  ctx.strokeStyle = 'rgba(126, 183, 167, .27)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 6]);
  ctx.strokeRect(topLeft.x + 1, topLeft.y + 1, (radius * 2 + 1) * TILE - 2, (radius * 2 + 1) * TILE - 2);
  ctx.setLineDash([]);
}

function drawNoise(cam) {
  state.noiseEvents.forEach((event) => {
    const point = worldToScreen(event.x + 0.5, event.y + 0.5, cam);
    const radius = noisePropagationRadius(event) * TILE;
    ctx.save();
    ctx.strokeStyle = `rgba(232, 197, 118, ${0.18 * event.ttl / 3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
}

function drawZombie(zombie, cam) {
  const point = worldToScreen(zombie.x + 0.5, zombie.y + 0.63, cam);
  const colors = { common: '#8e9b82', hunter: '#bd8878', screamer: '#b5a17b', brute: '#6d7d77' };
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = 'rgba(0, 0, 0, .42)'; ctx.beginPath(); ctx.ellipse(0, 8, zombie.type === 'brute' ? 18 : 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (zombie.dead) {
    // Keep the body on its own tile, but offset it only when the player is
    // standing on that tile after a melee kill. A head and limbs make the
    // corpse read as a persistent zombie body instead of a disappearing bar.
    const overlapsPlayer = zombie.x === state.player.x && zombie.y === state.player.y;
    ctx.translate(overlapsPlayer ? 12 : 0, overlapsPlayer ? 7 : 0);
    ctx.save();
    ctx.rotate(-0.16);
    ctx.fillStyle = 'rgba(116, 83, 73, .92)';
    ctx.fillRect(-13, -4, 27, 9);
    ctx.fillStyle = 'rgba(164, 128, 108, .9)';
    ctx.beginPath(); ctx.arc(-15, -1, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(102, 75, 69, .95)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(18, -7); ctx.moveTo(8, 3); ctx.lineTo(18, 9); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(198, 106, 84, .58)';
    ctx.beginPath(); ctx.ellipse(9, 7, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const body = colors[zombie.type];
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(11, 4); ctx.lineTo(6, 11); ctx.lineTo(-8, 11); ctx.lineTo(-12, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c8b2a0'; ctx.beginPath(); ctx.arc(0, -18, zombie.type === 'brute' ? 8 : 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = zombie.type === 'hunter' ? '#dfb67f' : '#5f433e'; ctx.fillRect(-5, -20, 3, 3); ctx.fillRect(2, -20, 3, 3);
  if (zombie.type === 'screamer') { ctx.strokeStyle = 'rgba(235, 211, 156, .74)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -18, 12, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.stroke(); }
  if (zombie.type === 'brute') { ctx.strokeStyle = 'rgba(184, 196, 183, .46)'; ctx.lineWidth = 3; ctx.strokeRect(-10, -13, 20, 18); }
  if (zombie.state === 'track') { ctx.strokeStyle = 'rgba(231, 160, 107, .56)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -5, 18, 0, Math.PI * 2); ctx.stroke(); }
  if (state.selectedTarget?.kind === 'zombie' && state.selectedTarget.id === zombie.id) { ctx.strokeStyle = 'rgba(238, 197, 119, .8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -6, 21, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function drawPlayer(cam) {
  const point = worldToScreen(state.player.x + 0.5, state.player.y + 0.65, cam);
  ctx.save(); ctx.translate(point.x, point.y);
  ctx.fillStyle = 'rgba(0, 0, 0, .48)'; ctx.beginPath(); ctx.ellipse(0, 10, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b98758'; ctx.fillRect(-9, -12, 18, 22);
  ctx.fillStyle = '#526f6c'; ctx.fillRect(-11, -7, 22, 13);
  ctx.fillStyle = '#bfae94'; ctx.beginPath(); ctx.arc(0, -17, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#273b3a'; ctx.fillRect(-8, -21, 16, 5);
  ctx.strokeStyle = '#d8ae69'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(state.player.facing === 'w' ? -18 : 18, -2); ctx.stroke();
  ctx.restore();
}

function drawLighting(cam) {
  const phase = phaseName();
  if (phase === '夜晚') {
    ctx.fillStyle = 'rgba(6, 15, 24, .48)'; ctx.fillRect(0, 0, canvasState.width, canvasState.height);
    const player = worldToScreen(state.player.x + 0.5, state.player.y + 0.5, cam);
    const light = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, TILE * 4.5);
    light.addColorStop(0, 'rgba(240, 198, 122, .32)'); light.addColorStop(1, 'rgba(240, 198, 122, 0)');
    ctx.fillStyle = light; ctx.fillRect(player.x - TILE * 5, player.y - TILE * 5, TILE * 10, TILE * 10);
  } else if (phase === '黄昏') {
    ctx.fillStyle = 'rgba(147, 92, 64, .16)'; ctx.fillRect(0, 0, canvasState.width, canvasState.height);
  }
  state.safePoints.filter((safe) => safe.active && state.visited.has(key(safe.x, safe.y))).forEach((safe) => {
    const point = worldToScreen(safe.x + 0.5, safe.y + 0.5, cam);
    const light = ctx.createRadialGradient(point.x, point.y, 5, point.x, point.y, TILE * 2.2);
    light.addColorStop(0, 'rgba(237, 191, 113, .12)'); light.addColorStop(1, 'rgba(237, 191, 113, 0)');
    ctx.fillStyle = light; ctx.fillRect(point.x - TILE * 2.5, point.y - TILE * 2.5, TILE * 5, TILE * 5);
  });
  if (currentWeather().name === '雾') {
    ctx.fillStyle = 'rgba(186, 202, 194, .08)'; ctx.fillRect(0, 0, canvasState.width, canvasState.height);
  }
}

function drawPointer(cam) {
  if (!canvasState.pointer || state.mode !== 'field') return;
  const cell = screenToWorld(canvasState.pointer.x, canvasState.pointer.y, cam);
  if (!visibleAt(cell.x, cell.y)) return;
  const point = worldToScreen(cell.x, cell.y, cam);
  ctx.strokeStyle = Math.abs(cell.x - state.player.x) + Math.abs(cell.y - state.player.y) === 1 ? 'rgba(226, 192, 119, .52)' : 'rgba(182, 202, 193, .2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(point.x + 3, point.y + 3, TILE - 6, TILE - 6);
}

function updateUI() {
  if (!state) return;
  const phase = phaseName();
  const activeSafe = poweredSafeAt(state.player);
  const facilitySafe = safeFacilityAt(state.player);
  const safe = facilitySafe || state.safePoints[state.currentSafeId];
  ui.runStatus.textContent = `第${state.day}天 · ${phase}${activeSafe ? ' · 热屏障内' : facilitySafe ? ' · 安全点设施' : ''}`;
  ui.safeStatus.textContent = activeSafe && activeSafe.power > 22 ? '热屏障稳定 · 安全点内' : activeSafe ? '热屏障低功率 · 安全点内' : facilitySafe ? '热屏障离线 · 可维修' : safe && safe.active && safe.power > 22 ? '热屏障稳定' : safe?.active && safe.power <= 0 ? '热屏障离线' : '外围保护偏弱';
  ui.pressure.textContent = `压力 ${state.pressure}`;
  ui.turn.textContent = `${state.turn} / ${MAX_TURNS}`;
  ui.weather.textContent = `${currentWeather().icon} ${currentWeather().name}`;
  ui.location.textContent = locationName();
  ui.safeCount.textContent = `${activeSafeCount()} / ${state.safePoints.length}`;
  const health = clamp(state.health, 0, 100);
  const thirst = clamp(state.thirst, 0, 100);
  const hunger = clamp(state.hunger, 0, 100);
  setMeter(ui.healthMeter, health, health < 30 ? '#db7967' : '#70b9ab');
  setMeter(ui.thirstMeter, thirst, thirst < 25 ? '#db7967' : '#75b9ad');
  setMeter(ui.hungerMeter, hunger, hunger < 25 ? '#db7967' : '#bda56f');
  ui.health.textContent = `${Math.round(health)} / 100`;
  ui.thirst.textContent = `${Math.round(thirst)} / 100`;
  ui.hunger.textContent = `${Math.round(hunger)} / 100`;
  const maxWeight = carryWeightCapacity();
  const weight = carriedWeight(); setMeter(ui.weightMeter, clamp(weight / maxWeight * 100, 0, 100), weight > maxWeight - 2 ? '#db7967' : '#9aaea5');
  ui.weight.textContent = `${weight.toFixed(1)} / ${maxWeight}kg`;
  const power = safe?.active ? clamp(safe.power, 0, 120) : 0;
  setMeter(ui.safePowerMeter, power / 1.2, power <= 22 ? '#db7967' : '#e6a65a');
  ui.safePower.textContent = safe?.active ? `${Math.round(power)}%` : '未接通';
  const maxSlots = carrySlotCapacity();
  ui.inventoryCount.textContent = `${totalSlots(state.inventory)} / ${maxSlots}格`;
  ui.equipment.innerHTML = EQUIPMENT_ITEMS.map((item) => {
    const meta = ITEM_META[item];
    const worn = equipped(item);
    const available = itemCount(state.inventory, item) > 0;
    const action = worn ? 'unequip' : available ? 'equip' : '';
    const status = worn ? '已装备' : available ? '可装备' : '空位';
    return `<button class="equipment-slot ${worn ? 'equipped' : ''}" data-equipment-item="${item}" data-equipment-action="${action}" title="${meta.effect || meta.label}" ${action ? '' : 'disabled'}><span class="equipment-glyph">${meta.glyph}</span><strong>${EQUIPMENT_LABELS[item]}</strong><small>${status}</small></button>`;
  }).join('');
  const stacks = inventoryStacks(state.inventory);
  if (state.selectedInventory && stacks[state.selectedInventory.slotIndex]?.item !== state.selectedInventory.item) {
    state.selectedInventory = null;
  }
  ui.inventory.innerHTML = Array.from({ length: maxSlots }, (_, index) => {
    const entry = stacks[index];
    if (!entry) return '<div class="inventory-slot"><span class="slot-glyph">·</span><span>空</span></div>';
    const { item, amount, limit } = entry;
    const meta = ITEM_META[item] || { glyph: '·', label: item };
    const selected = state.selectedInventory?.item === item && state.selectedInventory?.slotIndex === index;
    const kind = EQUIPMENT_ITEMS.includes(item) ? 'equipment-item' : INVENTORY_ACTIONS[item] ? 'usable' : '';
    const suffix = limit > 1 ? `×${amount}` : '';
    const content = `<span class="slot-glyph">${meta.glyph}</span><span>${meta.label}${suffix}</span>`;
    return `<button class="inventory-slot ${kind} ${selected ? 'selected' : ''}" data-inventory-item="${item}" data-inventory-index="${index}" data-inventory-amount="${amount}" data-inventory-action="select" title="${meta.effect || meta.label}">${content}</button>`;
  }).join('');
  const stash = currentStash();
  const stashStacks = inventoryStacks(stash);
  const stashUnits = Object.values(stash).reduce((total, amount) => total + amount, 0);
  ui.stashName.textContent = facilitySafe ? `${facilitySafe.name}仓库` : `${safe?.name || '安全点'}仓库`;
  ui.stash.textContent = facilitySafe ? (stashUnits ? `${stashUnits}件 · ${stashStacks.length}组` : '空') : '需在安全点设施';
  ui.stashGrid.classList.toggle('locked', !facilitySafe);
  ui.stashGrid.innerHTML = !facilitySafe
    ? '<div class="stash-empty">需在安全点设施</div>'
    : stashStacks.length
      ? stashStacks.map(({ item, amount, limit }) => {
        const meta = ITEM_META[item] || { glyph: '·', label: item };
        const suffix = limit > 1 ? `×${amount}` : '';
        return `<button class="stash-slot" data-stash-item="${item}" title="取出到背包：${meta.label}×1"><span>${meta.glyph}</span><small>${meta.label}${suffix}</small></button>`;
      }).join('')
      : '<div class="stash-empty">空</div>';
  const sampleCount = totalSampleCount();
  const safeDone = state.openedSafeCount >= REQUIRED_FRONTLINE_SAFE_POINTS; const sampleDone = sampleCount >= REQUIRED_SAMPLES; const terminalDone = state.terminalActivated;
  ui.safeObjective.classList.toggle('done', safeDone); ui.sampleObjective.classList.toggle('done', sampleDone); ui.terminalObjective.classList.toggle('done', terminalDone);
  ui.safeObjectiveText.textContent = `额外开辟前线安全点 ${Math.min(state.openedSafeCount, REQUIRED_FRONTLINE_SAFE_POINTS)} / ${REQUIRED_FRONTLINE_SAFE_POINTS}`;
  ui.sampleObjectiveText.textContent = `取得耐热株核心样本 ${Math.min(sampleCount, REQUIRED_SAMPLES)} / ${REQUIRED_SAMPLES}`;
  ui.missionStep.textContent = `${[safeDone, sampleDone, terminalDone].filter(Boolean).length} / 3`;
  ui.missionText.textContent = terminalDone ? '热灭活协议已经覆盖区域。你完成了这次远征。' : `额外修复三个热灭活节点，取得三份耐热株核心样本。当前压力：${state.pressure}。`;
  renderRecipes();
  updateButtons(); updateLog(); renderLootReveal();
}

function recipeIngredientsText(recipe) {
  return Object.entries(recipe.ingredients)
    .map(([item, amount]) => `${ITEM_META[item]?.label || item}×${amount}`)
    .join(' + ');
}

function renderRecipes() {
  if (!ui.recipes) return;
  const facilitySafe = safeFacilityAt(state.player);
  const inSafe = Boolean(facilitySafe);
  const safe = facilitySafe || state.safePoints[state.currentSafeId];
  ui.workbenchStatus.textContent = inSafe ? `${safe.name} · 电力 ${Math.round(safe.power)}%` : '需回安全点';
  ui.recipeLock.textContent = inSafe
    ? safe.power > 0
      ? '工作台已接入安全点微电网；制作会消耗电力并推进多个回合。'
      : '热屏障已经断电。先用仓库材料修复安全点，再恢复制作。'
    : '野外没有稳定电力。配方可查看，回到安全点内才可制作。';
  ui.recipes.innerHTML = Object.entries(RECIPES).map(([action, recipe]) => {
    const missing = Object.entries(recipe.ingredients)
      .filter(([item, amount]) => itemCount(currentStash(), item) < amount)
      .map(([item, amount]) => `${ITEM_META[item]?.label || item}×${amount - itemCount(currentStash(), item)}`);
    const canCraft = inSafe && !missing.length && safe.power >= recipe.power;
    const status = !inSafe ? '回安全点制作' : missing.length ? `缺少 ${missing.join('、')}` : safe.power < recipe.power ? '电力不足' : `可以制作 · ${recipe.turns || 2}回合`;
    const output = ITEM_META[recipe.output] || { label: recipe.output };
    return `<article class="recipe-item ${inSafe ? '' : 'locked'}">
      <div class="recipe-copy">
        <div class="recipe-head"><strong>${output.label}×${recipe.amount}</strong><span>${recipe.power} 电力 · ${recipe.turns || 2}回合</span></div>
        <div class="recipe-line">配方：${recipeIngredientsText(recipe)}</div>
        <div class="recipe-effect">作用：${recipe.effect}</div>
        <div class="recipe-state">${status}</div>
      </div>
      <button class="recipe-button" data-recipe-action="${action}" ${canCraft ? '' : 'disabled'}><span aria-hidden="true">${recipe.glyph}</span>制作</button>
    </article>`;
  }).join('');
}

function setMeter(element, value, color) { element.style.width = `${clamp(value, 0, 100)}%`; element.style.background = color; }
function locationName() {
  const building = buildingAt(state.player.x, state.player.y);
  if (building) return building.name;
  const safe = safeFacilityAt(state.player);
  if (safe) return safe.name;
  if (state.player.y >= 13 && state.player.y <= 15) return '北南主干道';
  return '街区外沿';
}

function updateButtons() {
  const candidate = candidateSafeAt(state.player);
  const container = selectedContainer();
  const closeZombie = selectedZombie();
  const selectedKind = state.selectedTarget?.kind || null;
  const facilitySafe = safeFacilityAt(state.player);
  const activeSafe = poweredSafeAt(state.player);
  const inSafe = Boolean(facilitySafe);
  const safe = facilitySafe || state.safePoints[state.currentSafeId];
  const selectedItem = selectedInventoryEntry();
  const visibleTarget = closeZombie && visibleAt(closeZombie.x, closeZombie.y) && dist(closeZombie, state.player) <= 8 ? closeZombie : null;
  const hasContainerContext = Boolean(container && selectedKind === 'container' && manhattan(container, state.player) <= 1);
  const hasClosedContainerContext = Boolean(hasContainerContext && container.status === 'closed');
  const hasLootContext = Boolean(hasContainerContext && container.status === 'open' && containerHasLoot(container));
  const hasMeleeContext = Boolean(closeZombie && selectedKind === 'zombie' && adjacent(closeZombie, state.player));
  const hasShootContext = Boolean(visibleTarget && selectedKind === 'zombie');
  const contextual = new Set(['hack', 'brute', 'loot', 'store-selected', 'discard-selected', 'melee', 'shoot', 'drink', 'eat', 'activate', 'repair', 'rest', 'terminal', 'use-adrenaline', 'use-sedative', 'use-coagulant', ...Object.keys(RECIPES)]);
  document.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.dataset.action;
    const recipe = RECIPES[action];
    let enabled = false;
    if (state.mode === 'field') {
      if (['inspect', 'quiet'].includes(action)) enabled = true;
      if (action === 'medkit') enabled = itemCount(state.inventory, 'medkit') > 0;
      if (action === 'hack' || action === 'brute') enabled = hasClosedContainerContext;
      if (action === 'loot') enabled = hasLootContext;
      if (action === 'store-selected') enabled = Boolean(inSafe && selectedItem);
      if (action === 'discard-selected') enabled = Boolean(selectedItem);
      if (action === 'melee') enabled = Boolean(closeZombie && (adjacent(closeZombie, state.player) || manhattan(closeZombie, state.player) === 0));
      if (action === 'shoot') enabled = Boolean(visibleTarget && itemCount(state.inventory, 'ammo') > 0);
      if (action === 'drink') enabled = itemCount(state.inventory, 'water') > 0;
      if (action === 'eat') enabled = itemCount(state.inventory, 'food') > 0;
      if (action === 'use-adrenaline') enabled = itemCount(state.inventory, 'adrenaline') > 0;
      if (action === 'use-sedative') enabled = itemCount(state.inventory, 'sedative') > 0;
      if (action === 'use-coagulant') enabled = itemCount(state.inventory, 'coagulant') > 0;
      if (action === 'activate') enabled = Boolean(candidate);
      if (action === 'terminal') enabled = terminalNearby();
      if (recipe) enabled = inSafe && safe.power >= recipe.power && Object.entries(recipe.ingredients).every(([item, amount]) => itemCount(currentStash(), item) >= amount);
      if (action === 'repair') enabled = inSafe;
      if (action === 'rest') enabled = Boolean(activeSafe && activeSafe.power >= sleepPowerCost());
      if (action === 'recenter') enabled = true;
    }
    button.disabled = !enabled;
    let targetContext = false;
    if (action === 'hack' || action === 'brute') targetContext = hasClosedContainerContext;
    else if (action === 'loot') targetContext = hasLootContext;
    else if (action === 'store-selected') targetContext = Boolean(inSafe && selectedItem);
    else if (action === 'discard-selected') targetContext = Boolean(selectedItem);
    else if (action === 'melee') targetContext = hasMeleeContext;
    else if (action === 'shoot') targetContext = hasShootContext;
    else if (action === 'drink') targetContext = itemCount(state.inventory, 'water') > 0 && state.mode === 'field';
    else if (action === 'eat') targetContext = itemCount(state.inventory, 'food') > 0 && state.mode === 'field';
    else if (recipe || action === 'repair') targetContext = inSafe;
    else if (action === 'rest') targetContext = Boolean(facilitySafe);
    else if (action === 'activate') targetContext = Boolean(candidate) && state.mode === 'field';
    else if (action === 'terminal') targetContext = terminalNearby() && state.mode === 'field';
    else if (action === 'use-adrenaline') targetContext = itemCount(state.inventory, 'adrenaline') > 0 && state.mode === 'field';
    else if (action === 'use-sedative') targetContext = itemCount(state.inventory, 'sedative') > 0 && state.mode === 'field';
    else if (action === 'use-coagulant') targetContext = itemCount(state.inventory, 'coagulant') > 0 && state.mode === 'field';
    button.hidden = contextual.has(action) && !enabled && !targetContext;
    if (recipe) {
      const label = button.querySelector('span:not(.action-glyph)');
      const small = button.querySelector('small');
      if (label) label.textContent = recipe.label;
      if (small) small.textContent = `${recipe.power}电力 · ${recipe.turns || 2}回合`;
      button.title = `配方：${recipeIngredientsText(recipe)}；作用：${recipe.effect}；耗时：${recipe.turns || 2}回合`;
    }
    if (action === 'rest') {
      const label = button.querySelector('span:not(.action-glyph)');
      const small = button.querySelector('small');
      if (label) label.textContent = '睡觉到下一天';
      if (small) small.textContent = activeSafe ? activeSafe.power >= sleepPowerCost() ? `消耗 ${sleepPowerCost()} 电力` : '电力不足' : facilitySafe ? '热屏障离线' : '需在安全点';
    }
  });
}

document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => performAction(button.dataset.action)));
ui.recipes.addEventListener('click', (event) => {
  const button = event.target.closest('[data-recipe-action]');
  if (!button || button.disabled || state.mode !== 'field') return;
  performAction(button.dataset.recipeAction);
});
ui.inventory.addEventListener('click', (event) => {
  const slot = event.target.closest('[data-inventory-item]');
  if (!slot || state.mode !== 'field') return;
  const item = slot.dataset.inventoryItem;
  const action = slot.dataset.inventoryAction;
  if (action === 'select') selectInventoryItem(item, Number(slot.dataset.inventoryAmount) || 1, Number(slot.dataset.inventoryIndex) || 0);
  else if (action) performAction(action);
});
ui.stashGrid.addEventListener('click', (event) => {
  const slot = event.target.closest('[data-stash-item]');
  if (!slot || state.mode !== 'field') return;
  takeFromStash(slot.dataset.stashItem, 1);
});
ui.lootItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-loot-item]');
  if (!button || button.disabled || state.mode !== 'field') return;
  lootOne(button.dataset.lootKind, Number(button.dataset.lootSource), button.dataset.lootItem);
});
ui.lootClose.addEventListener('click', () => {
  state.lootReveal = null;
  state.selectedTarget = null;
  updateUI();
});
ui.equipment.addEventListener('click', (event) => {
  const slot = event.target.closest('[data-equipment-item]');
  if (!slot || state.mode !== 'field') return;
  if (slot.dataset.equipmentAction === 'equip') equipItem(slot.dataset.equipmentItem);
  if (slot.dataset.equipmentAction === 'unequip') unequipItem(slot.dataset.equipmentItem);
});
ui.clearLog.addEventListener('click', () => { state.logs = []; updateLog(); });

const sidebarTabs = [...document.querySelectorAll('[data-sidebar-tab]')];
const sidebarPanels = [...document.querySelectorAll('[data-sidebar-panel]')];
function selectSidebarPanel(name) {
  sidebarTabs.forEach((tab) => {
    const active = tab.dataset.sidebarTab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  sidebarPanels.forEach((panel) => { panel.hidden = panel.dataset.sidebarPanel !== name; });
  document.querySelector('.sidebar-content')?.scrollTo({ top: 0 });
}
sidebarTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSidebarPanel(tab.dataset.sidebarTab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = sidebarTabs[(index + offset + sidebarTabs.length) % sidebarTabs.length];
    selectSidebarPanel(next.dataset.sidebarTab);
    next.focus();
  });
});
ui.restart.addEventListener('click', resetGame);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => {
  if (state.mode !== 'field') return;
  const keyMap = { w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1], a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0] };
  const move = keyMap[event.key];
  if (move) { event.preventDefault(); movePlayer(move[0], move[1]); }
  const actionMap = { '1': 'inspect', '2': 'hack', '3': 'brute', '4': 'melee', '5': 'shoot', '6': 'medkit' };
  if (actionMap[event.key]) performAction(actionMap[event.key]);
});
function clearPressTimer() {
  if (canvasState.pressTimer) {
    clearTimeout(canvasState.pressTimer);
    canvasState.pressTimer = null;
  }
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function handleCanvasTap(pointer) {
  if (state.mode !== 'field') return;
  const point = screenToWorld(pointer.x, pointer.y);
  const object = objectAtCell(point.x, point.y);
  if (object?.kind === 'zombie') {
    selectTarget('zombie', object.value);
    return;
  }
  if (object?.kind === 'container' && (object.value.status === 'closed' || containerHasLoot(object.value))) {
    selectTarget('container', object.value);
    return;
  }
  if (object?.kind === 'groundLoot') {
    selectTarget('groundLoot', object.value);
    return;
  }
  if (object?.kind === 'corpse') {
    state.selectedTarget = null;
    hideTooltip();
    updateUI();
    return;
  }
  state.selectedTarget = null;
  if (Math.abs(point.x - state.player.x) + Math.abs(point.y - state.player.y) === 1) {
    movePlayer(point.x - state.player.x, point.y - state.player.y);
  } else {
    logEvent('点击相邻空格移动；点击箱子或丧尸后再选择对应行动。');
    updateUI();
  }
}

function finishCanvasPointer(event) {
  clearPressTimer();
  const pointer = canvasPointFromEvent(event);
  const wasDrag = canvasState.dragMoved;
  const wasLongPress = canvasState.longPressed;
  canvasState.dragging = false;
  canvasState.pointer = pointer;
  if (!wasDrag && !wasLongPress) handleCanvasTap(pointer);
  canvasState.dragMoved = false;
  canvasState.longPressed = false;
  hideTooltip();
  if (event.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'field') return;
  const pointer = canvasPointFromEvent(event);
  canvasState.pointer = pointer;
  canvasState.dragging = true;
  canvasState.dragMoved = false;
  canvasState.longPressed = false;
  canvasState.lastX = event.clientX;
  canvasState.lastY = event.clientY;
  if (event.pointerId != null) canvas.setPointerCapture?.(event.pointerId);
  clearPressTimer();
  canvasState.pressTimer = setTimeout(() => {
    if (!canvasState.dragging || canvasState.dragMoved) return;
    canvasState.longPressed = true;
    showTooltip(screenToWorld(pointer.x, pointer.y), pointer);
  }, 520);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  const pointer = canvasPointFromEvent(event);
  canvasState.pointer = pointer;
  if (canvasState.dragging) {
    const dx = event.clientX - canvasState.lastX;
    const dy = event.clientY - canvasState.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      canvasState.dragMoved = true;
      clearPressTimer();
      hideTooltip();
      state.cameraPan.x -= dx;
      state.cameraPan.y -= dy;
    }
    canvasState.lastX = event.clientX;
    canvasState.lastY = event.clientY;
    return;
  }
  showTooltip(screenToWorld(pointer.x, pointer.y), pointer);
});

canvas.addEventListener('pointerup', finishCanvasPointer);
canvas.addEventListener('pointercancel', finishCanvasPointer);
canvas.addEventListener('pointerleave', () => {
  if (!canvasState.dragging) {
    canvasState.pointer = null;
    hideTooltip();
  }
});

resizeCanvas();
resetGame();
requestAnimationFrame(draw);
