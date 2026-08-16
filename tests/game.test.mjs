import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function createElement(selector = '') {
  const element = {
    selector,
    dataset: {},
    style: {},
    listeners: {},
    addEventListener(type, handler) { element.listeners[type] = handler; },
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
  // Track the 'hidden' class through the hidden property so tests can assert
  // on modal visibility without a real DOM.
  element.classList = {
    add(...names) { names.forEach((name) => { if (name === 'hidden') element.hidden = true; }); },
    remove(...names) { names.forEach((name) => { if (name === 'hidden') element.hidden = false; }); },
    toggle(name, force) { if (name === 'hidden') element.hidden = force !== undefined ? force : !element.hidden; },
  };
  return element;
}

function createCanvasContext() {
  return new Proxy({}, {
    get(target, property) {
      if (property === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (property === 'createLinearGradient') return () => ({ addColorStop() {} });
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
    document,
    rng, resetGame, buildWorld, totalSampleCount, isPlayerWalkable, noisePropagationRadius,
    guaranteeEngineeringResources,
    safeFacilityAt, poweredSafeAt, repairSafePoint, actionRest, setPlayerPosition, addNoise, activateSafePoint,
    activateTerminal, openContainer, melee, shoot, advanceTurns, updateZombies, emptyStash, startNextDay,
    enterSafeZone, settleZombieDeath, searchCorpse, rollZombieDrops, upgradeSafePoint, tickSafeDefenses, spawnAirdropIfDue, spawnForTurn, draw, visitAroundPlayer, dayZombieTarget, nightZombieTarget, spawnNightSurge, visibleAt, lootOne, stepZombie, spawnOne, drinkWater, carrySlotCapacity, carryWeightCapacity, equipItem, unequipItem, selectInventoryItem, selectWornEquipment, discardSelectedItem, storeSelectedItem, inventoryStacks, performAction, setMenuOpen: (open) => { menuOpen = open; },
    constants: { REQUIRED_FRONTLINE_SAFE_POINTS, REQUIRED_SAMPLES, MISSION_CRITICAL_ITEMS, ENGINEERING_RESERVES, WEATHER, SAFE_TEMPLATES, WORLD_W, WORLD_H },
  };`, sandbox);
  return sandbox.__game;
}

function makeTerrain(width = 64, height = 44) {
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
    mapOpen: false,
    shake: { at: 0, power: 0 },
    hitFlash: 0,
    moonIndex: 1,
    roarLogged: false,
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
    selectedEquipment: null,
    lootReveal: null,
    groundLoot: [],
    nextGroundLootId: 1,
    activation: null,
    expedition: { safeId: 0, kills: 0, opened: 0, lootGained: 0, cells: 0, damage: 0, maxDistance: 0 },
    dayStats: { kills: 0, opened: 0, lootGained: 0, cells: 0, damage: 0 },
    nextAirdropTurn: 0,
    airdropSeq: 0,
    hunterCount: 0,
    hunterCarriers: 0,
    inventory: {},
    equipment: { back: null, armor: null, weapon: null, muzzle: null, head: null, cloak: null, belt: null, canteen: null },
    visited: new Set(),
    trodden: new Set(),
    logs: [],
    noiseEvents: [],
    safePoints: [],
    stashes: {},
    buildings: [],
    containers: [],
    zombies: [],
    terminal: { x: 59, y: 16 },
    terrain: makeTerrain(),
    player: { x: 5, y: 5, facing: 's' },
    ...overrides,
  };
}

test('every generated world contains at least two scattered mission samples', () => {
  const game = createGame();
  for (let seed = 1; seed <= 250; seed += 1) {
    game.resetGame();
    const state = game.getState();
    state.random = game.rng(seed);
    game.buildWorld();
    const sources = state.containers.filter((container) => ['医疗冷藏柜', '样本柜'].includes(container.type));
    const samples = sources.reduce((total, container) => total + (container.loot.sample || 0), 0);
    const holders = sources.filter((container) => (container.loot.sample || 0) > 0);
    assert.ok(samples >= 2, `seed ${seed} only generated ${samples} samples`);
    assert.ok(holders.length >= 2, `seed ${seed} stacked the guaranteed samples in one crate`);
  }
});

test('a quarter of all living hunters carry the strain', () => {
  const game = createGame();
  const state = makeState({});
  game.setState(state);
  state.random = game.rng(42);
  let spawned = 0;
  while (spawned < 40) {
    if (game.spawnOne({ night: false, minDistance: 0, allowVisible: true })) spawned += 1;
  }
  const hunters = state.zombies.filter((zombie) => zombie.type === 'hunter');
  const carriers = hunters.filter((zombie) => zombie.carriesSample);
  assert.equal(hunters.length, 40);
  assert.equal(carriers.length, Math.ceil(hunters.length * 0.25));
});

test('searching a carrier hunter corpse yields its strain sample', () => {
  const game = createGame();
  const carrier = { id: 'c', x: 5, y: 5, type: 'hunter', hp: 0, dead: false, dormant: false, state: 'track', cooldown: 0, carriesSample: true };
  const plain = { id: 'p', x: 6, y: 5, type: 'hunter', hp: 0, dead: false, dormant: false, state: 'track', cooldown: 0, carriesSample: false };
  const state = makeState({ zombies: [carrier, plain], random: () => 1 }); // chemical rolls fail
  game.setState(state);
  game.settleZombieDeath(carrier);
  game.settleZombieDeath(plain);
  game.searchCorpse(); // player stands on the carrier at (5,5)
  assert.ok(state.groundLoot.some((drop) => drop.item === 'sample'));
  game.setPlayerPosition(6, 5);
  game.searchCorpse(); // the plain corpse carries nothing
  assert.equal(state.groundLoot.filter((drop) => drop.item === 'sample').length, 1);
});

test('mission sample uses one player-facing name everywhere', () => {
  const playerFacingCopy = `${source}\n${htmlSource}`;
  assert.match(playerFacingCopy, /耐热株核心样本/);
  assert.doesNotMatch(playerFacingCopy, /耐热株样本/);
});

test('violent container opening cannot destroy mission-critical resources', () => {
  const game = createGame();
  const protectedLoot = Object.fromEntries([...game.constants.MISSION_CRITICAL_ITEMS].map((item) => [item, 1]));
  const container = { id: 1, x: 5, y: 5, type: '样本柜', status: 'closed', loot: { ...protectedLoot, chemical: 1 } };
  const state = makeState({
    random: () => 1,
    containers: [container],
    player: { x: 5, y: 5, facing: 's' },
  });
  game.setState(state);
  game.openContainer(container, true);
  assert.deepEqual(
    Object.fromEntries([...game.constants.MISSION_CRITICAL_ITEMS].map((item) => [item, container.loot[item]])),
    protectedLoot,
  );
  assert.equal(container.loot.chemical, undefined);
});

test('every generated world can fund the main objective plus an engineering reserve', () => {
  const game = createGame();
  for (let seed = 1; seed <= 1000; seed += 1) {
    game.resetGame();
    const state = game.getState();
    state.random = game.rng(seed);
    game.buildWorld();
    const total = (item) => state.containers.reduce((sum, container) => sum + (container.loot[item] || 0), 0);
    assert.ok(total('metal') >= 28, `seed ${seed} only generated ${total('metal')} metal`);
    assert.ok(total('filter') >= 5, `seed ${seed} only generated ${total('filter')} filters`);
    assert.ok(total('battery') >= 5, `seed ${seed} only generated ${total('battery')} batteries`);
    assert.ok(total('metal') + (state.safePoints[0].stash.metal || 0) >= 32, `seed ${seed} cannot cover five activations with a spare`);
    // The scattered-sample guarantee may move one unit out of a three-unit
    // crate, so the per-container floor sits at two item units.
    assert.ok(state.containers.every((container) => Object.values(container.loot).reduce((sum, amount) => sum + amount, 0) >= 2), `seed ${seed} generated a container with fewer than two item units`);
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

test('noise falls off in three bands: rush, single step, and a glance', () => {
  const game = createGame();
  const state = makeState({ player: { x: 30, y: 30, facing: 's' } });
  game.setState(state);
  const respond = (intensity, distance) => {
    state.noiseEvents = [{ x: 2, y: 2, intensity, ttl: 3 }];
    state.zombies = [{ id: 'listener', x: 2 + distance, y: 2, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 }];
    game.updateZombies(new Set());
    return { x: state.zombies[0].x, y: state.zombies[0].y };
  };
  // intensity 20 → radius 20 on a clear day: rush ≤ 7, step ≤ 14, glance ≤ 20
  assert.deepEqual(respond(20, 6), { x: 7, y: 2 });   // band 1: rushes toward the source
  assert.deepEqual(respond(20, 12), { x: 13, y: 2 }); // band 2: one step toward the source
  assert.deepEqual(respond(20, 17), { x: 18, y: 2 }); // band 3: random()=0 → glance toward the source
  state.random = () => 0.9;
  assert.deepEqual(respond(20, 17), { x: 20, y: 2 }); // band 3: glance fails → random drift
  assert.deepEqual(respond(20, 24), { x: 27, y: 2 }); // beyond all bands: random drift
});

test('unlocked zombies drift one tile every turn even without noise', () => {
  const game = createGame();
  const zombie = { id: 'z', x: 10, y: 10, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({ zombies: [zombie], player: { x: 30, y: 30, facing: 's' } });
  game.setState(state);
  game.updateZombies(new Set());
  assert.equal(zombie.x !== 10 || zombie.y !== 10, true);
});

test('night goggles extend the night sight radius', () => {
  const game = createGame();
  const state = makeState({ turn: 53, weatherIndex: 0, player: { x: 20, y: 14, facing: 's' } });
  game.setState(state);
  assert.equal(game.visibleAt(24, 14), false); // clear night: radius 3
  state.equipment.head = 'goggles';
  assert.equal(game.visibleAt(24, 14), true);  // goggles: radius 4
});

test('thermal cloak shortens the zombie lock-on distance', () => {
  const game = createGame();
  const state = makeState({ player: { x: 5, y: 5, facing: 's' } });
  game.setState(state);
  const zombie = { id: 'z', x: 10, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  state.zombies = [zombie];
  game.updateZombies(new Set()); // distance 5 ≤ 6: tracks toward the player
  assert.equal(zombie.x, 9);
  state.equipment.cloak = 'cloak';
  zombie.x = 10;
  game.updateZombies(new Set()); // distance 5 > 4: stays unlocked, drifts randomly
  assert.equal(zombie.x, 10); // random()=0 picks (0,-1), so x is unchanged
});

test('tactical belt adds two carry slots', () => {
  const game = createGame();
  const state = makeState({});
  game.setState(state);
  assert.equal(game.carrySlotCapacity(), 12);
  state.equipment.belt = 'belt';
  assert.equal(game.carrySlotCapacity(), 14);
  state.equipment.back = 'backpack';
  assert.equal(game.carrySlotCapacity(), 18);
});

test('canteen improves drinking efficiency', () => {
  const game = createGame();
  const state = makeState({ inventory: { water: 2 }, thirst: 30 });
  game.setState(state);
  game.drinkWater();
  assert.equal(state.thirst, 61); // +32, then the spent turn drains 1
  state.thirst = 30;
  state.inventory.water = 2;
  state.equipment.canteen = 'canteen';
  game.drinkWater();
  assert.equal(state.thirst, 77); // +48, then the spent turn drains 1
});

test('every generated world contains at least two pieces of equipment', () => {
  const game = createGame();
  const equipmentItems = ['backpack', 'armor', 'weapon', 'suppressor', 'goggles', 'cloak', 'belt', 'canteen', 'heavyBackpack', 'armorLite', 'axe', 'muzzleBrake', 'helmet', 'ghillie', 'toolBelt', 'thermos'];
  for (let seed = 1; seed <= 250; seed += 1) {
    game.resetGame();
    const state = game.getState();
    state.random = game.rng(seed);
    game.buildWorld();
    const equipment = state.containers.reduce((total, container) => total
      + Object.keys(container.loot).filter((item) => equipmentItems.includes(item))
        .reduce((sum, item) => sum + (container.loot[item] || 0), 0), 0);
    assert.ok(equipment >= 2, `seed ${seed} only generated ${equipment} equipment pieces`);
  }
});

test('new equipment can be equipped and unequipped like the originals', () => {
  const game = createGame();
  const state = makeState({ inventory: { goggles: 1, canteen: 1 } });
  game.setState(state);
  game.equipItem('goggles');
  assert.equal(state.equipment.head, 'goggles');
  assert.equal(state.inventory.goggles || 0, 0);
  game.unequipItem('goggles');
  assert.equal(state.equipment.head, null);
  assert.equal(state.inventory.goggles, 1);
  game.equipItem('canteen');
  assert.equal(state.equipment.canteen, 'canteen');
});

test('worn pieces are selectable and mutually exclusive with bag selection', () => {
  const game = createGame();
  const state = makeState({ inventory: { goggles: 1, water: 2 } });
  game.setState(state);
  game.equipItem('goggles');
  game.selectWornEquipment('goggles');
  assert.equal(state.selectedEquipment, 'goggles');
  game.selectInventoryItem('water', 2, 0);
  assert.equal(state.selectedInventory?.item, 'water');
  assert.equal(state.selectedEquipment, null); // bag selection clears worn selection
  game.selectWornEquipment('goggles');
  assert.equal(state.selectedEquipment, 'goggles');
  assert.equal(state.selectedInventory, null); // worn selection clears bag selection
  game.selectWornEquipment('goggles'); // clicking again toggles off
  assert.equal(state.selectedEquipment, null);
});

test('discarding a worn piece drops it at the player position', () => {
  const game = createGame();
  const state = makeState({ inventory: { armor: 1 } });
  game.setState(state);
  game.equipItem('armor');
  game.selectWornEquipment('armor');
  game.discardSelectedItem();
  assert.equal(state.equipment.armor, null);
  assert.equal(state.selectedEquipment, null);
  const dropped = state.groundLoot.find((drop) => drop.item === 'armor');
  assert.ok(dropped);
  assert.equal(dropped.x, state.player.x);
  assert.equal(dropped.y, state.player.y);
});

test('equipment slots only select worn pieces; empty slots ignore clicks', () => {
  const game = createGame();
  const state = makeState({ inventory: { backpack: 1 } });
  game.setState(state);
  game.equipItem('backpack');
  const grid = game.document.querySelector('#equipment-grid');
  const click = grid.listeners.click;
  assert.ok(click, 'equipment grid click listener registered');
  click({ target: { closest: (sel) => (sel === '[data-equipment-slot]' ? { dataset: { equipmentSlot: 'back' } } : null) } });
  assert.equal(state.selectedEquipment, 'backpack');
  assert.equal(state.equipment.back, 'backpack'); // still worn, no auto-unequip
  click({ target: { closest: (sel) => (sel === '[data-equipment-slot]' ? { dataset: { equipmentSlot: 'armor' } } : null) } });
  assert.equal(state.selectedEquipment, 'backpack'); // empty slot click is a no-op
  assert.equal(state.equipment.armor, null);
});

test('the wear action equips the selected bag piece and removes the selected worn piece', () => {
  const game = createGame();
  const state = makeState({ inventory: { backpack: 1 } });
  game.setState(state);
  game.setMenuOpen(false); // actions only run past the title screen
  game.selectInventoryItem('backpack', 1, 0);
  game.performAction('wear-selected');
  assert.equal(state.equipment.back, 'backpack');
  assert.equal(state.inventory.backpack || 0, 0);
  assert.equal(state.selectedInventory, null);
  game.selectWornEquipment('backpack');
  game.performAction('wear-selected');
  assert.equal(state.equipment.back, null);
  assert.equal(state.inventory.backpack, 1);
  assert.equal(state.selectedEquipment, null);
});

test('unequipping is rejected when the bag would overflow', () => {
  const game = createGame();
  const state = makeState({ inventory: { heavyBackpack: 1, metal: 40 } });
  game.setState(state);
  game.equipItem('heavyBackpack');
  game.unequipItem('heavyBackpack'); // without its +8 slots/+16kg, the bag cannot hold everything back
  assert.equal(state.equipment.back, 'heavyBackpack');
  assert.equal(state.inventory.heavyBackpack || 0, 0);
});

test('equipping a same-slot item swaps the old one back into the bag', () => {
  const game = createGame();
  const state = makeState({ inventory: { backpack: 1, heavyBackpack: 1 } });
  game.setState(state);
  game.equipItem('backpack');
  assert.equal(state.equipment.back, 'backpack');
  game.equipItem('heavyBackpack');
  assert.equal(state.equipment.back, 'heavyBackpack');
  assert.equal(state.inventory.backpack, 1); // old one returned to the bag
  assert.equal(state.inventory.heavyBackpack || 0, 0);
});

test('swapping to a smaller pack is rejected when it would overload the carrier', () => {
  const game = createGame();
  const state = makeState({ inventory: { heavyBackpack: 1, backpack: 1 } });
  game.setState(state);
  game.equipItem('heavyBackpack'); // 46kg / +8 slots
  state.inventory.metal = 40; // 32kg of metal
  game.equipItem('backpack'); // swapping down to 38kg would total 39kg → rejected
  assert.equal(state.equipment.back, 'heavyBackpack');
  assert.equal(state.inventory.backpack, 1);
  assert.equal(state.inventory.heavyBackpack || 0, 0);
});

test('fire axe and muzzle brake change combat numbers', () => {
  const game = createGame();
  const zombie = { id: 'z', x: 6, y: 5, type: 'hunter', hp: 74, dead: false, dormant: false, state: 'track', cooldown: 0 };
  const state = makeState({ zombies: [zombie] });
  game.setState(state);
  state.equipment.weapon = 'axe';
  game.melee();
  assert.equal(zombie.hp, 74 - 48); // 28 + 20 from the axe
  const target = { id: 't', x: 8, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'track', cooldown: 0 };
  const state2 = makeState({ zombies: [target], inventory: { ammo: 2 }, selectedTarget: { kind: 'zombie', id: 't' } });
  game.setState(state2);
  state2.equipment.muzzle = 'muzzleBrake';
  game.shoot();
  assert.equal(target.dead, true); // 52 < 58 + 15
  assert.equal(state2.noiseEvents[state2.noiseEvents.length - 1].intensity, 24);
});

test('ghillie hides you from zombies three tiles out', () => {
  const game = createGame();
  const state = makeState({ player: { x: 5, y: 5, facing: 's' } });
  game.setState(state);
  state.equipment.cloak = 'ghillie';
  const zombie = { id: 'z', x: 9, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  state.zombies = [zombie];
  game.updateZombies(new Set()); // distance 4 > 3 → random drift (0,-1)
  assert.equal(zombie.x, 9);
  zombie.x = 8;
  zombie.y = 5;
  game.updateZombies(new Set()); // distance 3 ≤ 3 → tracks
  assert.equal(zombie.x, 7);
});

test('helmet and light plate stack contact damage reduction', () => {
  const game = createGame();
  const zombie = { id: 'z', x: 6, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'track', cooldown: 0 };
  const state = makeState({ zombies: [zombie] });
  game.setState(state);
  state.equipment.armor = 'armorLite';
  state.equipment.head = 'helmet';
  game.updateZombies(new Set());
  assert.equal(state.health, 100 - Math.max(1, 8 - 3 - 3)); // 98
});

test('heavy backpack and thermos scale their stats', () => {
  const game = createGame();
  const state = makeState({});
  game.setState(state);
  state.equipment.back = 'heavyBackpack';
  assert.equal(game.carrySlotCapacity(), 20);
  assert.equal(game.carryWeightCapacity(), 46);
  state.thirst = 30;
  state.inventory.water = 2;
  state.equipment.canteen = 'thermos';
  game.drinkWater();
  assert.equal(state.thirst, 85); // +56, then the spent turn drains 1
});

test('depositing keeps the selection so repeated clicks move one unit each', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '营地', x: 5, y: 5, active: true, radius: 2, power: 80, level: 2, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash }, inventory: { metal: 3 } });
  game.setState(state);
  game.selectInventoryItem('metal', 3, 0);
  game.storeSelectedItem();
  game.storeSelectedItem();
  assert.equal(stash.metal, 2);
  assert.equal(state.inventory.metal, 1);
  assert.ok(state.selectedInventory); // selection survives for continuous clicking
  game.storeSelectedItem(); // last unit
  assert.equal(stash.metal, 3);
  assert.equal(state.selectedInventory, null); // cleared once the stack is exhausted
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

test('a newly activated powered safe point keeps repelling zombies after the player leaves', () => {
  const game = createGame();
  const safe = { id: 1, name: '前线站', x: 5, y: 5, active: false, radius: 0, power: 0, level: 0 };
  const zombie = { id: 'z', x: 7, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({
    inventory: { metal: 6, filter: 1, battery: 1 },
    safePoints: [safe],
    stashes: {},
  });
  game.setState(state);
  game.activateSafePoint();
  game.activateSafePoint();
  game.activateSafePoint();
  assert.equal(safe.active, true);
  assert.equal(safe.power, 74);
  game.setPlayerPosition(30, 30);
  state.zombies = [zombie];
  game.updateZombies(new Set());
  assert.deepEqual({ x: zombie.x, y: zombie.y }, { x: 8, y: 5 });
  assert.equal(zombie.state, 'perimeter');
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
    turn: 71,
    safePoints: [safe],
    inventory: { metal: 6, filter: 1, battery: 1 },
  });
  game.setState(state);
  game.activateSafePoint();
  assert.equal(state.day, 2);
  assert.equal(state.activation, null);
  assert.equal(safe.active, false);
});

test('terminal requires five additional safe points, not the starting station', () => {
  const game = createGame();
  const state = makeState({
    openedSafeCount: 4,
    inventory: { sample: 3 },
    player: { x: 59, y: 16, facing: 's' },
  });
  game.setState(state);
  game.activateTerminal();
  assert.equal(state.mode, 'field');
  assert.equal(state.terminalActivated, false);
  state.openedSafeCount = 5;
  game.activateTerminal();
  assert.equal(state.mode, 'won');
  assert.equal(state.terminalActivated, true);
});

test('the terminal needs the samples on the player, not in a stash', () => {
  const game = createGame();
  const stash = game.emptyStash();
  stash.sample = 3;
  const state = makeState({ openedSafeCount: 5, player: { x: 59, y: 16, facing: 's' }, stashes: { 0: stash } });
  game.setState(state);
  game.activateTerminal();
  assert.equal(state.mode, 'field'); // samples sitting in a stash do not count
  state.inventory.sample = 3;
  game.activateTerminal();
  assert.equal(state.mode, 'won');
  assert.equal(state.inventory.sample || 0, 0); // the terminal consumes them
});

test('mission sample progress only counts samples carried by the player', () => {
  const game = createGame();
  const stash = game.emptyStash();
  stash.sample = 3;
  const state = makeState({ inventory: { sample: 1 }, stashes: { 0: stash } });
  game.setState(state);
  assert.equal(game.totalSampleCount(), 1);
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

test('expedition stats settle into a report when re-entering a safe point', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '营地', x: 5, y: 5, active: true, radius: 2, power: 80, level: 2, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash } });
  state.expedition = { safeId: 0, kills: 3, opened: 2, lootGained: 5, cells: 12, damage: 14, maxDistance: 9 };
  game.setState(state);
  game.enterSafeZone(safe);
  assert.equal(state.expedition.kills, 0);
  assert.equal(state.expedition.safeId, 0);
  assert.equal(game.document.querySelector('#expedition-modal').hidden, false);
  assert.match(game.document.querySelector('#expedition-stats').innerHTML, /最远深入/);
  assert.match(game.document.querySelector('#expedition-stats').innerHTML, /9格/);
});

test('a quiet return to the same safe point skips the settlement report', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '营地', x: 5, y: 5, active: true, radius: 2, power: 80, level: 2, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash } });
  game.setState(state);
  game.enterSafeZone(safe);
  assert.equal(game.document.querySelector('#expedition-modal').hidden, true);
});

test('safe-point upgrade consumes stash materials and expands the barrier', () => {
  const game = createGame();
  const stash = game.emptyStash();
  Object.assign(stash, { metal: 6, filter: 2, battery: 2, electronics: 2 });
  const safe = { id: 0, name: '升级站', x: 5, y: 5, active: true, radius: 2, power: 100, level: 1, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash } });
  game.setState(state);
  game.upgradeSafePoint();
  assert.equal(safe.level, 2);
  assert.equal(safe.radius, 3);
  assert.equal(stash.metal || 0, 0);
  assert.equal(safe.power, 85);
});

test('level-3 defenses scorch perimeter zombies and credit kills', () => {
  const game = createGame();
  const safe = { id: 0, name: '守卫站', x: 5, y: 5, active: true, radius: 3, power: 80, level: 3, stash: {} };
  const zombie = { id: 'z', x: 8, y: 5, type: 'common', hp: 8, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({ safePoints: [safe], stashes: { 0: safe.stash }, zombies: [zombie] });
  game.setState(state);
  game.advanceTurns(1, 0);
  assert.equal(zombie.dead, true);
  assert.equal(state.kills, 1);
});

test('level-4 water recyclers refill their stash at dawn', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '循环站', x: 5, y: 5, active: true, radius: 3, power: 80, level: 4, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash } });
  game.setState(state);
  game.startNextDay();
  assert.equal(stash.water, 2);
});

test('dawn recharges powered safe points by level and skips dead ones', () => {
  const game = createGame();
  const stashA = game.emptyStash();
  const stashB = game.emptyStash();
  const alive = { id: 0, name: '有电站', x: 5, y: 5, active: true, radius: 3, power: 90, level: 2, stash: stashA };
  const dead = { id: 1, name: '断电站', x: 20, y: 20, active: true, radius: 2, power: 0, level: 1, stash: stashB };
  const state = makeState({ safePoints: [alive, dead], stashes: { 0: stashA, 1: stashB } });
  game.setState(state);
  game.startNextDay();
  assert.equal(alive.power, 114);
  assert.equal(dead.power, 0);
});

test('dawn recharge never exceeds the 120 power cap', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '满电站', x: 5, y: 5, active: true, radius: 3, power: 118, level: 4, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash } });
  game.setState(state);
  game.startNextDay();
  assert.equal(safe.power, 120);
});

test('airdrop crates always contain at least one battery', () => {
  const game = createGame();
  const state = makeState({ nextAirdropTurn: 10, turn: 10, player: { x: 20, y: 14, facing: 's' } });
  game.setState(state);
  game.spawnAirdropIfDue();
  const crate = state.containers.find((container) => container.type === '补给空投');
  assert.ok(crate);
  assert.ok((crate.loot.battery || 0) >= 1);
});

test('airdrop crate ids stay numeric so the loot panel can address them', () => {
  const game = createGame();
  const state = makeState({ nextAirdropTurn: 10, turn: 10, player: { x: 20, y: 14, facing: 's' } });
  game.setState(state);
  game.spawnAirdropIfDue();
  const crate = state.containers.find((container) => container.type === '补给空投');
  assert.equal(typeof crate.id, 'number');
});

test('scheduled airdrops land 12 to 24 tiles from the player', () => {
  const game = createGame();
  const state = makeState({ nextAirdropTurn: 10, turn: 10, player: { x: 32, y: 22, facing: 's' } });
  state.random = game.rng(42);
  game.setState(state);
  game.spawnAirdropIfDue();
  const crate = state.containers.find((container) => container.type === '补给空投');
  assert.ok(crate, 'a crate should land within 48 attempts');
  const reach = Math.max(Math.abs(crate.x - 32), Math.abs(crate.y - 22));
  assert.ok(reach >= 12 && reach <= 24, `crate landed ${reach} tiles away`);
});

test('airdrop crates can be looted like any open container', () => {
  const game = createGame();
  const crate = { id: 1001, x: 5, y: 6, type: '补给空投', status: 'open', lockTurns: 0, loot: { battery: 1, food: 2 }, openedAt: 0 };
  const state = makeState({ containers: [crate], player: { x: 5, y: 5, facing: 's' } });
  game.setState(state);
  game.lootOne('container', 1001, 'battery');
  assert.equal(state.inventory.battery, 1);
  assert.equal(crate.loot.battery || 0, 0);
});

test('resupply drops wait for a foothold and the third dawn', () => {
  const game = createGame();
  game.resetGame();
  const state = game.getState();
  assert.equal(state.nextAirdropTurn, 0); // day one: silence
  game.startNextDay();
  assert.equal(state.nextAirdropTurn, 0); // day two without a foothold: still silence
  state.openedSafeCount = 1;
  game.startNextDay();
  assert.ok(state.nextAirdropTurn >= 5 && state.nextAirdropTurn <= 9); // day three with a foothold
});

test('initial spawn reveal is not counted as exploration', () => {
  const game = createGame();
  game.resetGame();
  const state = game.getState();
  assert.equal(state.expedition.cells, 0);
  assert.equal(state.dayStats.cells, 0);
});

test('moving into new territory counts revealed cells', () => {
  const game = createGame();
  game.resetGame();
  const state = game.getState();
  game.setPlayerPosition(20, 15);
  assert.equal(state.expedition.cells, 1); // one first-footfall cell
  game.setPlayerPosition(21, 15);
  assert.equal(state.expedition.cells, 2);
  game.setPlayerPosition(20, 15); // retreading an old cell does not double count
  assert.equal(state.expedition.cells, 2);
});

test('deepest penetration counts grid steps beyond the barrier edge', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '营地', x: 5, y: 5, active: true, radius: 3, power: 80, level: 2, stash };
  const state = makeState({ safePoints: [safe], stashes: { 0: stash }, player: { x: 6, y: 6, facing: 's' } });
  game.setState(state);
  game.setPlayerPosition(11, 6); // manhattan from center = 7 → 4 tiles beyond the edge
  assert.equal(state.expedition.maxDistance, 4);
  game.setPlayerPosition(7, 6); // back inside: manhattan 3 → 0 beyond edge; max is kept
  assert.equal(state.expedition.maxDistance, 4);
});

test('deepest penetration is measured from the nearest safe point', () => {
  const game = createGame();
  const stashA = game.emptyStash();
  const stashB = game.emptyStash();
  const home = { id: 0, name: 'A站', x: 5, y: 5, active: true, radius: 3, power: 80, level: 2, stash: stashA };
  const outpost = { id: 1, name: 'B站', x: 20, y: 5, active: true, radius: 2, power: 60, level: 1, stash: stashB };
  const state = makeState({ safePoints: [home, outpost], stashes: { 0: stashA, 1: stashB }, player: { x: 6, y: 6, facing: 's' } });
  game.setState(state);
  // (16,5) is 8 tiles beyond home's edge but only 2 beyond the outpost's.
  game.setPlayerPosition(16, 5);
  assert.equal(state.expedition.maxDistance, 2);
});

test('daytime hunter target grows with pressure and later days', () => {
  const game = createGame();
  const state = makeState({ day: 1, pressure: 1 });
  game.setState(state);
  assert.equal(game.dayZombieTarget(), 12);
  state.day = 21;
  state.pressure = 4;
  assert.equal(game.dayZombieTarget(), 16); // 12 + 3 + 2 capped at 16
});

test('surviving the night in the field spawns a premium airdrop at dawn', () => {
  const game = createGame();
  const state = makeState({ player: { x: 20, y:14, facing: 's' } });
  game.setState(state);
  game.startNextDay({ fieldNight: true });
  const crate = state.containers.find((container) => container.type === '补给空投');
  assert.ok(crate, 'a reward crate should exist');
  const equipmentItems = ['backpack', 'armor', 'weapon', 'suppressor', 'goggles', 'cloak', 'belt', 'canteen', 'heavyBackpack', 'armorLite', 'axe', 'muzzleBrake', 'helmet', 'ghillie', 'toolBelt', 'thermos'];
  assert.ok(equipmentItems.some((item) => crate.loot[item] === 1));
  const reach = Math.max(Math.abs(crate.x - 20), Math.abs(crate.y - 14));
  assert.ok(reach >= 6 && reach <= 12, `crate landed ${reach} tiles away`);
});

test('an unpowered facility night counts as a field night with its reward', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const facility = { id: 0, name: '暗站', x: 5, y: 5, active: true, radius: 2, power: 0, level: 1, stash };
  const state = makeState({ turn: 71, safePoints: [facility], stashes: { 0: stash } });
  game.setState(state);
  game.advanceTurns(1, 0);
  assert.equal(state.day, 2);
  assert.ok(state.containers.some((container) => container.type === '补给空投'));
});

test('a powered facility night grants no street-survival reward', () => {
  const game = createGame();
  const stash = game.emptyStash();
  const safe = { id: 0, name: '亮站', x: 5, y: 5, active: true, radius: 2, power: 60, level: 2, stash };
  const state = makeState({ turn: 71, safePoints: [safe], stashes: { 0: stash } });
  game.setState(state);
  game.advanceTurns(1, 0);
  assert.equal(state.day, 2);
  assert.equal(state.containers.some((container) => container.type === '补给空投'), false);
});

test('night shrinks the visible radius by two tiles', () => {
  const game = createGame();
  const state = makeState({ turn: 53, weatherIndex: 0, player: { x: 20, y: 14, facing: 's' } });
  game.setState(state);
  assert.equal(game.visibleAt(23, 14), true);   // 3 tiles out: still visible on a clear night
  assert.equal(game.visibleAt(24, 14), false);  // 4 tiles out: swallowed by darkness
  state.turn = 10;                              // back to daytime: 5-tile radius
  assert.equal(game.visibleAt(24, 14), true);
});

test('moon phase shifts night visibility', () => {
  const game = createGame();
  const state = makeState({ turn: 53, weatherIndex: 0, player: { x: 20, y: 14, facing: 's' } });
  game.setState(state);
  state.moonIndex = 1; // 薄云: radius 3
  assert.equal(game.visibleAt(23, 14), true);
  assert.equal(game.visibleAt(24, 14), false);
  state.moonIndex = 0; // 晴月: +1 → radius 4
  assert.equal(game.visibleAt(24, 14), true);
  state.moonIndex = 2; // 黑月: -1 → radius 2
  assert.equal(game.visibleAt(22, 14), true);
  assert.equal(game.visibleAt(23, 14), false);
});

test('night emits a heat-source noise at the player position', () => {
  const game = createGame();
  const state = makeState({ turn: 52, player: { x: 30, y: 20, facing: 's' } });
  game.setState(state);
  game.advanceTurns(1, 0); // turn 53: nightfall, then the heat signature appears
  const heat = state.noiseEvents.find((event) => event.heat);
  assert.ok(heat, 'a heat event should exist');
  assert.equal(heat.intensity, 9);
  assert.equal(heat.x, 30);
  assert.equal(heat.y, 20);
});

test('stealth gear kills the heat signature outright', () => {
  const game = createGame();
  const state = makeState({ turn: 52, player: { x: 30, y: 20, facing: 's' } });
  game.setState(state);
  game.advanceTurns(1, 0);
  assert.equal(state.noiseEvents.find((event) => event.heat).intensity, 9);
  state.equipment.cloak = 'cloak';
  game.advanceTurns(1, 0);
  assert.equal(state.noiseEvents.find((event) => event.heat), undefined); // the signature is gone
  state.equipment.cloak = 'ghillie';
  game.advanceTurns(1, 0);
  assert.equal(state.noiseEvents.find((event) => event.heat), undefined);
});

test('zombies listen to the loudest active noise', () => {
  const game = createGame();
  const state = makeState({ turn: 53, player: { x: 30, y: 20, facing: 's' } });
  game.setState(state);
  state.noiseEvents = [
    { x: 30, y: 20, intensity: 10, ttl: 2, heat: true },
    { x: 2, y: 2, intensity: 18, ttl: 3 },
  ];
  const zombie = { id: 'z', x: 10, y: 2, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  state.zombies = [zombie];
  game.updateZombies(new Set());
  assert.equal(zombie.x, 9); // hears the 18-intensity event, steps toward it
});

test('night refills spawn in a ring around the player', () => {
  const game = createGame();
  const state = makeState({ turn: 53, player: { x: 32, y: 22, facing: 's' } });
  state.random = game.rng(42);
  game.setState(state);
  game.spawnForTurn();
  const fresh = state.zombies[state.zombies.length - 1];
  assert.ok(fresh, 'a ring spawn should land');
  const reach = Math.max(Math.abs(fresh.x - 32), Math.abs(fresh.y - 22));
  assert.ok(reach >= 7 && reach <= 13, `spawned ${reach} tiles away`);
});

test('a zombie that locks onto the player roars once per night', () => {
  const game = createGame();
  const state = makeState({ turn: 53, player: { x: 5, y: 5, facing: 's' } });
  game.setState(state);
  const zombie = { id: 'z', x: 7, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  state.zombies = [zombie];
  game.updateZombies(new Set()); // steps next to the player; still silent while merely wandering
  assert.ok(!zombie.roared);
  game.updateZombies(new Set()); // now tracking: roars from its own cell
  assert.equal(zombie.roared, true);
  const roarNoise = state.noiseEvents.filter((event) => event.intensity === 12);
  assert.equal(roarNoise.length, 1);
  assert.equal(roarNoise[0].x, 6);
  game.updateZombies(new Set()); // already roared: no second event
  assert.equal(state.noiseEvents.filter((event) => event.intensity === 12).length, 1);
});

test('nightfall surges a third of the nightly population at once', () => {
  const game = createGame();
  const state = makeState({ turn: 53, pressure: 1, player: { x: 20, y: 14, facing: 's' } });
  state.random = game.rng(42); // varied spawn points, since zombies no longer stack
  game.setState(state);
  game.spawnNightSurge();
  assert.equal(state.zombies.length, Math.floor(game.nightZombieTarget() * 0.35));
});

test('zombies refuse to stack on each other', () => {
  const game = createGame();
  const blocker = { id: 'b', x: 7, y: 5, type: 'common', hp: 52, dead: false, dormant: false };
  const walker = { id: 'w', x: 8, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({ zombies: [blocker, walker] });
  game.setState(state);
  game.stepZombie(walker, { x: 5, y: 5 }); // primary cell (7,5) is occupied
  assert.equal(walker.x === 7 && walker.y === 5, false);
  assert.equal(state.zombies.filter((zombie) => zombie.x === walker.x && zombie.y === walker.y).length, 1);
});

test('zombies avoid closed containers but may stand on opened ones', () => {
  const game = createGame();
  const closed = { id: 0, x: 7, y: 5, type: '军用箱', status: 'closed', lockTurns: 0, loot: { ammo: 1 } };
  const opened = { id: 1, x: 9, y: 5, type: '补给空投', status: 'open', lockTurns: 0, loot: { food: 1 } };
  const walker = { id: 'w', x: 8, y: 5, type: 'common', hp: 52, dead: false, dormant: false, state: 'wander', cooldown: 0 };
  const state = makeState({ containers: [closed, opened], zombies: [walker] });
  game.setState(state);
  game.stepZombie(walker, { x: 5, y: 5 }); // primary cell (7,5) holds a sealed crate
  assert.equal(walker.x === 7 && walker.y === 5, false);
  game.stepZombie(walker, { x: 12, y: 5 }); // (9,5) holds an opened crate → fair game
  assert.deepEqual({ x: walker.x, y: walker.y }, { x: 9, y: 5 });
});

test('spawning never stacks zombies or lands on closed containers', () => {
  const game = createGame();
  const occupant = { id: 'z0', x: 1, y: 1, type: 'common', hp: 52, dead: false, dormant: false };
  const state = makeState({ zombies: [occupant], player: { x: 20, y: 20, facing: 's' } });
  game.setState(state);
  // random always returns 0 → every candidate is (1,1), which is occupied
  assert.equal(game.spawnOne({ night: true, minDistance: 3, allowVisible: true }), false);
  assert.equal(state.zombies.length, 1);
  state.zombies = [];
  state.containers = [{ id: 0, x: 1, y: 1, type: '军用箱', status: 'closed', lockTurns: 0, loot: {} }];
  assert.equal(game.spawnOne({ night: true, minDistance: 3, allowVisible: true }), false);
  assert.equal(state.zombies.length, 0);
});

test('airdrops land on schedule as open crates with crate-anchored noise', () => {
  const game = createGame();
  const state = makeState({ nextAirdropTurn: 10, turn: 10, player: { x: 20, y: 14, facing: 's' } });
  game.setState(state);
  game.spawnAirdropIfDue();
  const crate = state.containers.find((container) => container.type === '补给空投');
  assert.ok(crate, 'an airdrop crate should exist');
  assert.equal(crate.status, 'open');
  assert.ok(Object.values(crate.loot).length >= 4);
  assert.ok(state.noiseEvents.some((event) => event.x === crate.x && event.y === crate.y && event.intensity === 12));
  assert.ok(state.nextAirdropTurn > state.turn);
});

test('corpse loot waits for the player to step onto the tile and search', () => {
  const game = createGame();
  const zombie = { id: 'z', x: 5, y: 5, type: 'hunter', hp: 0, dead: false, dormant: false, state: 'track', cooldown: 0, carriesSample: true };
  const state = makeState({ zombies: [zombie] });
  game.setState(state);
  game.settleZombieDeath(zombie);
  assert.equal(zombie.dead, true);
  assert.equal(state.groundLoot.length, 0); // the kill itself drops nothing
  game.searchCorpse(); // the player is standing on the corpse tile
  assert.ok(state.groundLoot.some((drop) => drop.x === 5 && drop.y === 5 && drop.item === 'sample'));
  assert.equal(state.zombies.length, 0); // the searched body is removed
});

test('consumable stack limits keep bulk items in one slot', () => {
  const game = createGame();
  const state = makeState({});
  game.setState(state);
  assert.equal(game.inventoryStacks({ water: 8 }).length, 2);   // 4 per slot
  assert.equal(game.inventoryStacks({ food: 4 }).length, 1);
  assert.equal(game.inventoryStacks({ battery: 4 }).length, 1);
  assert.equal(game.inventoryStacks({ sample: 3 }).length, 1);
});

test('the render loop draws a world with an airdrop beacon without throwing', () => {
  const game = createGame();
  game.resetGame();
  const state = game.getState();
  state.random = game.rng(42);
  state.turn = 12;
  state.nextAirdropTurn = 12;
  game.spawnAirdropIfDue();
  const crate = state.containers.find((container) => container.type === '补给空投');
  assert.ok(crate);
  crate.x = 7;
  crate.y = 15;
  assert.doesNotThrow(() => game.draw());
});

test('the city map renders the whole world without throwing', () => {
  const game = createGame();
  game.resetGame();
  const state = game.getState();
  state.mapOpen = true;
  assert.doesNotThrow(() => game.draw());
});
