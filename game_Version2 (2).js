// Pencilsmith - simple incremental game
// Single-file logic. Save to game.js

// -- Game state
const state = {
  pencils: 0,
  inventory: 0,
  funds: 0.0,
  price: 0.10,
  demand: 1.0, // multiplier where 1.0 = 100%
  perClick: 1,
  perSec: 0,
  workers: 0,
  sharpeners: 0,
  creativity: 0,
  reputation: 0,
  lastTick: Date.now()
};

// -- Config & upgrades (unlock at certain pencil totals)
const upgrades = [
  { id: 'better-wood', name: 'Better Wood', desc: '+1 Pencil per click', cost: 50, unlockedAt: 25, bought: false, apply: () => { state.perClick += 1 } },
  { id: 'sharper-leads', name: 'Sharper Leads', desc: 'Auto-sharpeners 2x effective', cost: 200, unlockedAt: 100, bought: false, apply: () => { state.sharpenerPowerMultiplier = (state.sharpenerPowerMultiplier||1) * 2 } },
  { id: 'mass-production', name: 'Mass Production', desc: 'Workers produce +50% pencils', cost: 1000, unlockedAt: 500, bought: false, apply: () => { state.workerBoost = (state.workerBoost||1) * 1.5 } },
  { id: 'eco-brand', name: 'Eco Brand', desc: 'Demand +20%', cost: 2500, unlockedAt: 2000, bought: false, apply: () => { state.demand *= 1.2 } },
  { id: 'marketing-hub', name: 'Marketing Hub', desc: 'Sell price +10%', cost: 10000, unlockedAt: 7000, bought: false, apply: () => { state.price *= 1.10 } },
  { id: 'factory-line', name: 'Factory Line', desc: 'Workers twice as cheap', cost: 50000, unlockedAt: 25000, bought: false, apply: () => { state.workerCostMultiplier = (state.workerCostMultiplier||1) * 0.5 } },
  { id: 'automation-suite', name: 'Automation Suite', desc: 'Sharpeners produce while offline', cost: 200000, unlockedAt: 100000, bought: false, apply: () => { state.automation = true } },
  { id: 'global-distribution', name: 'Global Distribution', desc: 'Demand +200%', cost: 1_000_000, unlockedAt: 500000, bought: false, apply: () => { state.demand *= 3 } },
  { id: 'design-studio', name: 'Design Studio', desc: 'Gain Creativity per second', cost: 5000, unlockedAt: 1500, bought: false, apply: () => { state.creativityRate = (state.creativityRate||0) + 1 } },
  { id: 'reputation-campaign', name: 'Reputation Campaign', desc: 'Reputation boosts price slightly', cost: 25000, unlockedAt: 8000, bought: false, apply: () => { state.reputationBoost = (state.reputationBoost||1) * 1.05 } },
  { id: 'pencil-collective', name: 'Pencil Collective', desc: 'Workers produce +100%', cost: 120000, unlockedAt: 50000, bought: false, apply: () => { state.workerBoost = (state.workerBoost||1) * 2 } },
  { id: 'luxury-graphite', name: 'Luxury Graphite', desc: 'Price +50% for premium pencils', cost: 500000, unlockedAt: 200000, bought: false, apply: () => { state.price *= 1.5 } },
  { id: 'robot-factory', name: 'Robot Factory', desc: 'Automates most production', cost: 2_000_000, unlockedAt: 1_000_000, bought: false, apply: () => { state.robotFactory = true; state.perSec += 500 } },
];

// -- DOM refs
const $ = id => document.getElementById(id);
const pencilsEl = $('pencils');
const inventoryEl = $('inventory');
const fundsEl = $('funds');
const perSecEl = $('per-sec');
const priceEl = $('price');
const demandEl = $('demand');
const workersEl = $('workers');
const sharpenersEl = $('sharpeners');
const upgradesEl = $('upgrades');
const creativityEl = $('creativity');
const reputationEl = $('reputation');

// -- Buttons
$('make-pencil').addEventListener('click', () => {
  state.pencils += state.perClick;
  state.inventory += state.perClick;
  render();
});
$('buy-worker').addEventListener('click', () => {
  const base = 10.0;
  const multiplier = state.workerCostMultiplier || 1;
  const cost = base * Math.pow(1.15, state.workers) * multiplier;
  if (state.funds >= cost) {
    state.funds -= cost;
    state.workers += 1;
    render();
  }
});
$('buy-sharpener').addEventListener('click', () => {
  const cost = 75 * Math.pow(1.2, state.sharpeners);
  if (state.funds >= cost) {
    state.funds -= cost;
    state.sharpeners += 1;
    render();
  }
});
$('sell-pencils').addEventListener('click', () => {
  const sold = state.inventory;
  if (sold <= 0) return;
  const revenue = sold * state.price * state.demand;
  state.funds += revenue;
  state.inventory = 0;
  // small reputation gain for sales
  state.reputation += Math.floor(sold / 100);
  render();
});
$('raise-price').addEventListener('click', () => { state.price = +(state.price + 0.01).toFixed(2); render(); });
$('lower-price').addEventListener('click', () => { state.price = Math.max(0.01, +(state.price - 0.01).toFixed(2)); render(); });
$('reset').addEventListener('click', () => {
  if (confirm('Reset game and clear local save?')) {
    localStorage.removeItem('pencilsmith-save');
    location.reload();
  }
});

// -- Upgrade rendering & purchase
function renderUpgrades() {
  upgradesEl.innerHTML = '';
  const totalPencils = state.pencils;
  upgrades.forEach(upg => {
    const unlocked = totalPencils >= upg.unlockedAt;
    const div = document.createElement('div');
    div.className = 'upgrade' + (unlocked ? (upg.bought ? ' bought' : '') : ' locked');
    div.innerHTML = `
      <div>
        <strong>${upg.name}</strong><div style="font-size:12px;color:#666">${upg.desc}</div>
        <div style="font-size:12px;color:#888">Cost: $${upg.cost.toLocaleString()}</div>
      </div>
    `;
    const btn = document.createElement('button');
    btn.textContent = upg.bought ? 'Purchased' : (unlocked ? 'Buy' : `Unlock at ${upg.unlockedAt.toLocaleString()} pencils`);
    btn.disabled = (!unlocked || upg.bought || state.funds < upg.cost);
    btn.addEventListener('click', () => {
      if (!unlocked || upg.bought) return;
      if (state.funds >= upg.cost) {
        state.funds -= upg.cost;
        upg.bought = true;
        try { upg.apply(); } catch (e) { console.error('upgrade apply error', e) }
        render();
      }
    });
    div.appendChild(btn);
    upgradesEl.appendChild(div);
  });
}

// -- Main tick: calculates per-second production and applies worker/sharpener effects
function gameTick(deltaSec) {
  // worker production
  const baseWorkerRate = 1; // each worker base produces 1 pencil/sec
  const workerBoost = state.workerBoost || 1;
  const workerPencils = state.workers * baseWorkerRate * workerBoost;

  // sharpeners produce pencils via sharpening and automation
  const sharpenerBase = 5;
  const sharpenerPower = (state.sharpenerPowerMultiplier || 1);
  const sharpenerPencils = state.sharpeners * sharpenerBase * sharpenerPower;

  // offline automation adds to perSec if unlocked
  const automationBonus = state.automation ? sharpenerPencils * 0.5 : 0;

  // total perSec
  const perSec = (workerPencils + sharpenerPencils + (state.robotFactory ? 500 : 0)) * (1 + ((state.reputationBoost||0) ? (state.reputationBoost-1) : 0));
  state.perSec = perSec;

  // apply perSec production for the tick duration
  const produced = perSec * deltaSec + automationBonus * deltaSec;
  state.inventory += produced;
  state.pencils += produced;

  // creativity and reputation growth from production/sales
  state.creativity += (produced / 100) * deltaSec;
  state.reputation += (produced / 1000) * deltaSec;

  // small passive income from creativity (if design studio bought)
  if (state.creativityRate) {
    state.funds += state.creativityRate * deltaSec * 0.5;
  }
}

// -- Render state to DOM
function render() {
  pencilsEl.textContent = Math.floor(state.pencils).toLocaleString();
  inventoryEl.textContent = Math.floor(state.inventory).toLocaleString();
  fundsEl.textContent = state.funds.toFixed(2);
  perSecEl.textContent = state.perSec.toFixed(1);
  priceEl.textContent = state.price.toFixed(2);
  demandEl.textContent = (state.demand * 100).toFixed(0) + '%';
  workersEl.textContent = state.workers;
  sharpenersEl.textContent = state.sharpeners;
  creativityEl.textContent = Math.floor(state.creativity);
  reputationEl.textContent = Math.floor(state.reputation);

  // update worker/sharpener cost displays
  const workerBase = 10.0;
  const wCost = workerBase * Math.pow(1.15, state.workers) * (state.workerCostMultiplier||1);
  $('worker-cost').textContent = wCost.toFixed(2);
  const sharpCost = 75 * Math.pow(1.2, state.sharpeners);
  $('sharpen-cost').textContent = sharpCost.toFixed(2);

  renderUpgrades();
  save();
}

// -- Save / Load
function save() {
  const payload = {
    state,
    upgrades: upgrades.map(u => ({ id: u.id, bought: u.bought }))
  };
  try { localStorage.setItem('pencilsmith-save', JSON.stringify(payload)); } catch (e) { /* ignore */ }
}

function load() {
  try {
    const raw = localStorage.getItem('pencilsmith-save');
    if (!raw) return;
    const data = JSON.parse(raw);
    // shallow copy fields we expect
    Object.assign(state, data.state);
    // restore purchased upgrades and apply them
    if (data.upgrades) {
      data.upgrades.forEach(saved => {
        const u = upgrades.find(x => x.id === saved.id);
        if (u && saved.bought) {
          u.bought = true;
          try { u.apply(); } catch (e) { console.error('apply on load', e); }
        }
      });
    }
  } catch (e) { console.error('load failed', e); }
}

// -- Main loop
function loop() {
  const now = Date.now();
  const delta = (now - state.lastTick) / 1000.0;
  state.lastTick = now;
  gameTick(delta);
  render();
  requestAnimationFrame(loop);
}

// -- Initialization
load();
render();
state.lastTick = Date.now();
requestAnimationFrame(loop);

// Expose for debugging in console
window._pencilsmith = { state, upgrades };