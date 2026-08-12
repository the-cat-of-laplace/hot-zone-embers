import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

function createElement(selector = '') {
  return {
    selector,
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    querySelector() { return createElement(); },
    closest() { return null; },
    setAttribute() {},
    scrollTo() {},
    focus() {},
    getBoundingClientRect() { return { width: 960, height: 640, left: 0, top: 0 }; },
    getContext() { return createCanvasContext(); },
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() { return false; },
    hidden: false,
    disabled: false,
    innerHTML: '',
    textContent: '',
    width: 960,
    height: 640,
  };
}

function createCanvasContext() {
  return new Proxy({}, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function createGame() {
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) elements.set(selector, createElement(selector));
    return elements.get(selector);
  };
  const document = {
    querySelector: getElement,
    querySelectorAll() { return []; },
  };
  const window = {
    devicePixelRatio: 1,
    addEventListener() {},
    setTimeout(callback) { callback(); return 1; },
  };
  const sandbox = {
    console,
    document,
    window,
    performance: { now: () => 0 },
    requestAnimationFrame() {},
    setTimeout: window.setTimeout,
    clearTimeout() {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${source}\n;globalThis.__game = {
    getState: () => state,
    setState: (next) => { state = next; },
    rng, resetGame, buildWorld, totalSampleCount, isPlayerWalkable, noisePropagationRadius,
    guaranteeEngineeringResources,
    safeFacilityAt, poweredSafeAt, repairSafePoint, actionRest, setPlayerPosition, addNoise, activateSafePoint,
    activateTerminal, melee, shoot, advanceTurns, updateZombies, emptyStash, startNextDay,
    constants: { REQUIRED_FRONTLINE_SAFE_POINTS, REQUIRED_SAMPLES, ENGINEERING_RESERVES, WEATHER, SAFE_TEMPLATES, WORLD_W, WORLD_H },
  };`, sandbox);
  return sandbox.__game;
}

function makeTerrain(width = 40, height = 28) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 'grass'));
}

function makeState(overrides = {}) {
  return {
    random: () => 0,
    day: 1,
    turn: 1,
    overtime: 0,
    weatherIndex: 0,
    pressure: 1,
    mode: 'field',
    currentSafeId: 0,
    cameraPan: { x: 0, y: 0 },
    health: 100,
    thirst: 100,
    hunger: 100,
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
    inventory: {},
    equipment: { backpack: null, armor: null, weapon: null, suppressor: null },
    visited: new Set(),
    logs: [],
    noiseEvents: [],
    safePoints: [],
    stashes: {},
    buildings: [],
    containers: [],
    zombies: [],
    terminal: { x: 35, y: 11 },
    terrain: makeTerrain(),
    player: { x: 5, y: 5, facing: 's' },
    ...overrides,
  };
}

test('every generated world contains at least three mission samples', () => {
  const game = createGame();
  for (let seed = 1; seed <= 250; seed += 1) {
    game.resetGame();
    const state = game.getState();
    state.random = game.rng(seed);
    game.buildWorld();
    const samples = state.containers.reduce((total, container) => total + (container.loot.sample || 0), 0);
    assert.ok(samples >= game.constants.REQUIRED_SAMPLES, `seed ${seed} only generated ${samples} samples`);
  }
});

test('every generated world can fund the main objective plus an engineering reserve', () => {
  const game = createGame();
  for (let seed = 1; seed <= 1000; seed += 1) {
    game.resetGame();
    const state = game.getState();
    state.random = game.rng(seed);
    game.buildWorld();
    const total = (item) => state.containers.reduce((sum, container) => sum + (container.loot[item] || 0), 0);
    assert.ok(total('metal') >= 20, `seed ${seed} only generated ${total('metal')} metal`);
    assert.ok(total('filter') >= 5, `seed ${seed} only generated ${total('filter')} filters`);
    assert.ok(total('battery') >= 5, `seed ${seed} only generated ${total('battery')} batteries`);
    assert.ok(total('metal') + (state.safePoints[0].stash.metal || 0) >= 24, `seed ${seed} cannot cover three activations and a repair reserve`);
    assert.ok(state.containers.every((container) => Object.values(container.loot).reduce((sum, amount) => sum + amount, 0) >= 3), `seed ${seed} generated a container with fewer than three item units`);
  }
});

test('player walkability rejects active zombies but allows corpses and dormant zombies', () => {
  const game = createGame();
  const state = makeState({
    zombies: [
      { id: 'active', x: 6, y: 5, hp: 52, dead: false, dormant: false },
      { id: 'corpse', x: 7, y: 5, hp: 0, dead: true, dormant: false },
      { id: 'dormant', x: 8, y: 5, hp: 52, dead: false, dormant: true },
    ],
  });
  game.setState(state);
  assert.equal(game.isPlayerWalkable(6, 5), false);
  assert.equal(game.isPlayerWalkable(7, 5), true);
  assert.equal(game.isPlayerWalkable(8, 5), true);
});

test('noise radius reflects intensity and weather', () => {
  const game = createGame();
  const state = makeState();
  game.setState(state);
  const radius = (intensity, weatherIndex) => {
    state.weatherIndex = weatherIndex;
    return game.noisePropagationRadius({ intensity });
  };
  assert.deepEqual([18, 10, 7, 3, 1].map((value) => radius(value, 0)), [18, 10, 7, 3, 1]);
  assert.ok(radius(10, 1) < radius(10, 0));
  assert.ok(radius(10, 2) > radius(10, 0));
});

test('zombie AI hears only noises whose effective radius reaches it', () => {
  const game = createGame();
  const state = makeState({ player: { x: 2, y: 2, facing: 's' } });
  game.setState(state);
  const investigate = (intensity, weatherIndex, distance) => {
    state.weatherIndex = weatherIndex;
    state.noiseEvents = [{ x: 2, y: 2, intensity, ttl: 3 }];
    state.zombies = [{ id: 'listener', x: 2 + distance, y: 2, type: 'hunter', hp: 74, dead: false, dormant: false, state: 'wander', cooldown: 0 }];
    game.updateZombies(new Set());
    return state.zombies[0].x;
  };
  assert.equal(investigate(18, 0, 12), 13);
  assert.equal(investigate(10, 0, 12), 14);
  assert.equal(investigate(7, 0, 8), 10);
  assert.equal(investigate(10, 1, 8), 10);
  assert.equal(investigate(10, 2, 8), 9);
});

test('noise buffs scale or suppress the next actual noise event', () => {
  const game = createGame();
  const state = makeState({ buffs: { noiseScale: 0.45, contactShield: 0 } });
  game.setState(state);
  game.addNoise(18);
  assert.equal(state.noiseEvents[0].intensity, 8);
  assert.equal(state.buffs.noiseScale, null);
  state.buffs.noiseScale = 0;
  game.addNoise(18);
  assert.equal(state.noiseEvents.length, 1);
  assert.equal(state.buffs.noiseScale, null);
});

test('zero-power safe point is a usable facility but not a protective barrier', () => {
  const game = createGame();
  const stash = game.emptyStash();
  Object.assign(stash, { metal: 4, filter: 1, battery: 1 });
  const safe = { id: 0, name: '断电站', x: 5, y: 5, active: true, radius: 2, power: 0, level: 1, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash } });
  game.setState(state);
  assert.equal(game.safeFacilityAt(state.player), safe);
  assert.equal(game.poweredSafeAt(state.player), undefined);
  game.actionRest();
  assert.equal(state.day, 1);
  game.repairSafePoint();
  assert.equal(safe.power, 36);
  assert.equal(game.poweredSafeAt(state.player), safe);
});

test('sleep requires enough power for the full overnight cost', () => {
  const game = createGame();
  const safe = { id: 0, name: '低电站', x: 5, y: 5, active: true, radius: 2, power: 6, level: 1, stash: {} };
  const state = makeState({ safePoints: [safe], stashes: { 0: safe.stash } });
  game.setState(state);
  game.actionRest();
  assert.equal(state.day, 1);
  assert.equal(safe.power, 6);
});

test('leaving an activation facility immediately clears its progress', () => {
  const game = createGame();
  const safe = { id: 1, name: '待启动站', x: 5, y: 5, active: false, radius: 0, power: 0, level: 0 };
  const state = makeState({ safePoints: [safe], activation: { id: 1, progress: 1 } });
  game.setState(state);
  game.setPlayerPosition(7, 5);
  assert.equal(state.activation, null);
  assert.match(state.logs[0].text, /进度已清零/);
});

test('day rollover clears any unfinished safe-point activation', () => {
  const game = createGame();
  const state = makeState({ activation: { id: 1, progress: 2 } });
  game.setState(state);
  game.startNextDay();
  assert.equal(state.activation, null);
});

test('safe-point activation cannot continue across the day boundary', () => {
  const game = createGame();
  const safe = { id: 1, name: '待启动站', x: 5, y: 5, active: false, radius: 0, power: 0, level: 0 };
  const state = makeState({
    turn: 63,
    safePoints: [safe],
    inventory: { metal: 6, filter: 1, battery: 1 },
  });
  game.setState(state);
  game.activateSafePoint();
  assert.equal(state.day, 2);
  assert.equal(state.activation, null);
  assert.equal(safe.active, false);
});

test('terminal requires three additional safe points, not the starting station', () => {
  const game = createGame();
  const state = makeState({
    openedSafeCount: 2,
    inventory: { sample: 3 },
    player: { x: 35, y: 11, facing: 's' },
  });
  game.setState(state);
  game.activateTerminal();
  assert.equal(state.mode, 'field');
  assert.equal(state.terminalActivated, false);
  state.openedSafeCount = 3;
  game.activateTerminal();
  assert.equal(state.mode, 'won');
  assert.equal(state.terminalActivated, true);
});

test('a lethal response after a killing shot does not move the dead player or add victory logs', () => {
  const game = createGame();
  const target = { id: 'target', x: 6, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'track', cooldown: 0 };
  const attacker = { id: 'attacker', x: 5, y: 4, type: 'brute', hp: 130, dead: false, dormant: false, state: 'track', cooldown: 0 };
  const state = makeState({
    health: 1,
    inventory: { ammo: 1 },
    zombies: [target, attacker],
    selectedTarget: { kind: 'zombie', id: target.id },
  });
  game.setState(state);
  game.shoot();
  assert.equal(state.mode, 'dead');
  assert.equal(target.dead, true);
  assert.equal(state.kills, 1);
  assert.deepEqual({ x: state.player.x, y: state.player.y }, { x: 5, y: 5 });
  assert.equal(state.selectedTarget, null);
  assert.equal(state.logs.some((entry) => entry.text.includes('倒在脚边')), false);
});

test('a dormant zombie sharing the player cell deals contact damage after waking', () => {
  const game = createGame();
  const zombie = { id: 'dormant', x: 5, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({ zombies: [zombie] });
  game.setState(state);
  game.updateZombies(new Set());
  assert.equal(state.health, 92);
});

test('one multi-turn action lets each existing zombie respond at most once', () => {
  const game = createGame();
  const zombie = { id: 'zombie', x: 7, y: 5, type: 'hunter', hp: 74, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({ zombies: [zombie] });
  game.setState(state);
  game.advanceTurns(2, 0);
  assert.deepEqual({ x: zombie.x, y: zombie.y }, { x: 6, y: 5 });
  assert.equal(state.health, 100);
});
