// ============================================================
//  Monster Dash – main.js  (Enhanced Edition)
//  All canvas drawing – no external dependencies
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const CANVAS_W = 900;
const CANVAS_H = 550;
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// ── Constants ────────────────────────────────────────────────
const GROUND_Y     = CANVAS_H - 80;
const GRAVITY      = 0.55;
const JUMP_FORCE   = -13;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const BOSS_KILL_THRESHOLD = 60; // enemies killed to spawn boss

// ── Game State ───────────────────────────────────────────────
let state      = 'start';  // 'start'|'play'|'paused'|'levelclear'|'dead'
let score      = 0;
let highScore  = parseInt(localStorage.getItem('monsterDashHigh') || '0', 10);
let frameCount = 0;
let diffMult   = 1;
let twoPlayer  = false;
let currentLevel     = 1;
let enemiesKilled    = 0;
let bossActive       = false;
let boss             = null;
let levelClearTimer  = 0;
let survivalTimer    = 0;

// ── Input ────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyP' && (state === 'play' || state === 'paused')) togglePause();
  if (e.code === 'KeyR' && state === 'dead') startGame();
  if (e.code === 'KeyF') toggleFullscreen();
  if ((e.code === 'Space' || e.code === 'Enter') && state === 'start') startGame();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ── Audio ────────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol = 0.18) {
  try {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

const SFX = {
  shoot:   () => playTone(880, 'square', 0.08, 0.12),
  jump:    () => playTone(440, 'sine',   0.18, 0.15),
  djump:   () => { playTone(660, 'sine', 0.12, 0.12); playTone(880, 'sine', 0.16, 0.1); },
  hit:     () => playTone(180, 'sawtooth', 0.25, 0.22),
  kill:    () => { playTone(660, 'square', 0.1, 0.15); playTone(880, 'square', 0.15, 0.12); },
  bonus:   () => { playTone(880, 'sine', 0.1, 0.2); playTone(1100, 'sine', 0.1, 0.2); playTone(1320, 'sine', 0.15, 0.2); },
  power:   () => { playTone(440,'sine',0.05,0.2); playTone(554,'sine',0.05,0.2); playTone(659,'sine',0.05,0.2); playTone(880,'sine',0.2,0.2); },
  bossHit: () => playTone(220, 'sawtooth', 0.18, 0.3),
  death:   () => { playTone(220,'sawtooth',0.4,0.3); playTone(110,'sawtooth',0.6,0.25); },
  levelup: () => { [523,659,784,1047].forEach((f,i)=> setTimeout(()=>playTone(f,'sine',0.25,0.25),i*120)); },
};

// ── Particles ────────────────────────────────────────────────
const particles = [];

function spawnParticles(x, y, count, colors, speedMult = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4 + 1) * speedMult;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: Math.random() * 0.04 + 0.025,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.15;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── Background ───────────────────────────────────────────────
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * CANVAS_W,
  y: Math.random() * GROUND_Y,
  r: Math.random() * 2 + 0.3,
  speed: Math.random() * 0.4 + 0.1,
  alpha: Math.random() * 0.6 + 0.3,
}));

const blobs = Array.from({ length: 6 }, (_, i) => ({
  x: (i / 6) * CANVAS_W + Math.random() * 100,
  y: 80 + Math.random() * 120,
  rx: 60 + Math.random() * 60,
  ry: 20 + Math.random() * 20,
  speed: 0.3 + Math.random() * 0.4,
  alpha: 0.04 + Math.random() * 0.05,
}));

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0,   '#0a0020');
  sky.addColorStop(0.5, '#1a0040');
  sky.addColorStop(1,   '#2d0060');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  stars.forEach(s => {
    s.x -= s.speed;
    if (s.x < 0) s.x = CANVAS_W;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  blobs.forEach(b => {
    b.x -= b.speed;
    if (b.x + b.rx < 0) b.x = CANVAS_W + b.rx;
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = '#a060ff';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  groundGrad.addColorStop(0,   '#2a0060');
  groundGrad.addColorStop(0.2, '#1a003a');
  groundGrad.addColorStop(1,   '#0a0015');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  ctx.save();
  ctx.strokeStyle = '#7b2ffc';
  ctx.lineWidth   = 3;
  ctx.shadowColor = '#7b2ffc';
  ctx.shadowBlur  = 18;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.stroke();
  ctx.restore();
}

// ── Platforms ────────────────────────────────────────────────
const platforms = [];
let platformTimer = 0;

function spawnPlatform() {
  platforms.push({
    x: CANVAS_W + 20,
    y: GROUND_Y - 100 - Math.random() * 120,
    w: 80 + Math.random() * 100,
    h: 18,
    speed: 2 + diffMult * 0.5,
  });
}

function updatePlatforms() {
  platformTimer++;
  if (platformTimer > 180) {
    if (Math.random() < 0.5) spawnPlatform();
    platformTimer = 0;
  }
  for (let i = platforms.length - 1; i >= 0; i--) {
    platforms[i].x -= platforms[i].speed;
    if (platforms[i].x + platforms[i].w < 0) platforms.splice(i, 1);
  }
}

function drawPlatforms() {
  platforms.forEach(p => {
    ctx.save();
    ctx.fillStyle   = '#4a1090';
    ctx.shadowColor = '#9b4dff';
    ctx.shadowBlur  = 10;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#9b4dff';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  });
}

// ── Players ──────────────────────────────────────────────────
function makePlayer(x, id) {
  return {
    id,
    x, y: GROUND_Y - 56,
    w: 44, h: 56,
    vx: 0, vy: 0,
    onGround: false,
    jumpsLeft: 2,        // double-jump counter
    jumpPressed: false,
    health: 3,
    invincible: 0,
    shootCooldown: 0,
    facingRight: true,
    animFrame: 0,
    animTimer: 0,
    powerUp: null,       // 'star'|'speed'|'big'|'rapid'
    powerTimer: 0,
    alive: true,
  };
}

let p1 = makePlayer(120, 1);
let p2 = makePlayer(200, 2);

function resetPlayer(p, x) {
  p.x = x; p.y = GROUND_Y - p.h;
  p.vx = 0; p.vy = 0;
  p.onGround = false; p.jumpsLeft = 2; p.jumpPressed = false;
  p.health = 3; p.invincible = 0; p.shootCooldown = 0;
  p.facingRight = true; p.powerUp = null; p.powerTimer = 0; p.alive = true;
}

function getPlayerKeys(p) {
  if (p.id === 1) return {
    left:  keys['ArrowLeft']  || keys['KeyA'],
    right: keys['ArrowRight'] || keys['KeyD'],
    jump:  keys['ArrowUp']    || keys['KeyW'],
    shoot: keys['Space'],
  };
  return {
    left:  keys['KeyJ'],
    right: keys['KeyL'],
    jump:  keys['KeyI'],
    shoot: keys['KeyK'],
  };
}

function updatePlayerPhysics(p) {
  if (!p.alive) return;
  const k = getPlayerKeys(p);
  const spd = PLAYER_SPEED + (p.powerUp === 'speed' ? 3 : 0) + diffMult * 0.3;

  if (k.left)  { p.vx = -spd; p.facingRight = false; }
  else if (k.right) { p.vx = spd; p.facingRight = true; }
  else p.vx *= 0.8;

  // Jump / double-jump
  if (k.jump && !p.jumpPressed && p.jumpsLeft > 0) {
    p.vy = JUMP_FORCE + (p.powerUp === 'big' ? -2 : 0);
    p.jumpPressed = true;
    p.jumpsLeft--;
    if (p.jumpsLeft === 1) {
      SFX.jump();
      spawnParticles(p.x + p.w / 2, p.y + p.h, 8, ['#7b2ffc','#a060ff','#fff'], 0.7);
    } else {
      SFX.djump();
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 14, ['#00c8ff','#ffe600','#fff'], 1.1);
    }
  }
  if (!k.jump) p.jumpPressed = false;

  p.vy += GRAVITY;
  p.x  += p.vx;
  p.y  += p.vy;

  p.x = Math.max(0, Math.min(CANVAS_W - p.w, p.x));

  // Ground
  p.onGround = false;
  if (p.y + p.h >= GROUND_Y) {
    p.y = GROUND_Y - p.h;
    p.vy = 0;
    p.onGround = true;
    p.jumpsLeft = 2;
  }

  // Platforms
  platforms.forEach(pl => {
    if (
      p.vy >= 0 &&
      p.x + p.w > pl.x + 4 && p.x < pl.x + pl.w - 4 &&
      p.y + p.h > pl.y && p.y + p.h < pl.y + pl.h + 12
    ) {
      p.y = pl.y - p.h;
      p.vy = 0;
      p.onGround = true;
      p.jumpsLeft = 2;
    }
  });

  // Shoot
  if (p.shootCooldown > 0) p.shootCooldown--;
  const cooldown = p.powerUp === 'rapid' ? 7 : 18;
  if (k.shoot && p.shootCooldown <= 0) {
    shootBullet(p);
    p.shootCooldown = cooldown;
  }

  if (p.invincible > 0) p.invincible--;

  // Power-up timer
  if (p.powerUp && p.powerTimer > 0) {
    p.powerTimer--;
    if (p.powerTimer <= 0) { p.powerUp = null; updatePowerHUD(); }
  }

  // Animation
  p.animTimer++;
  if (p.animTimer > 8) { p.animFrame = (p.animFrame + 1) % 4; p.animTimer = 0; }
}

// ── Draw Luigi (P1) ──────────────────────────────────────────
function drawLuigi(p) {
  ctx.save();
  if (p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0) ctx.globalAlpha = 0.35;

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  ctx.translate(cx, cy);
  if (!p.facingRight) ctx.scale(-1, 1);

  // Star power rainbow flash
  if (p.powerUp === 'star') {
    ctx.shadowColor = `hsl(${frameCount * 6 % 360}, 100%, 60%)`;
    ctx.shadowBlur  = 22;
  }

  // Shoes
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath(); roundRect(ctx, -12, 22, 12, 7, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, 2, 22, 12, 7, 3);   ctx.fill();

  // Overalls (green)
  ctx.fillStyle = p.powerUp === 'star' ? `hsl(${frameCount*8%360},100%,55%)` : '#2e7d32';
  ctx.beginPath(); roundRect(ctx, -13, 2, 26, 22, 4); ctx.fill();

  // Shirt (light blue)
  ctx.fillStyle = '#64b5f6';
  ctx.beginPath(); roundRect(ctx, -13, 2, 11, 14, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, 2, 2, 11, 14, 3);   ctx.fill();

  // Buttons
  ctx.fillStyle = '#ffe600';
  ctx.beginPath(); ctx.arc(-4, 4, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, 4, 2, 0, Math.PI*2);  ctx.fill();

  // Walking legs
  const legSwing = p.onGround ? Math.sin(p.animFrame * Math.PI / 2) * 7 : 0;
  ctx.fillStyle = '#1e5c20';
  ctx.fillRect(-10, 18, 8, 8 + (legSwing > 0 ? legSwing : 0));
  ctx.fillRect(2, 18, 8, 8 + (legSwing < 0 ? -legSwing : 0));

  // Head / skin
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffcc80';
  ctx.beginPath(); ctx.ellipse(0, -16, 14, 16, 0, 0, Math.PI * 2); ctx.fill();

  // GREEN cap
  ctx.fillStyle = '#388e3c';
  ctx.beginPath();
  ctx.ellipse(0, -22, 15, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Brim
  ctx.beginPath();
  ctx.ellipse(4, -22, 18, 5, -0.1, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();
  // "L" on cap
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Fredoka One, cursive';
  ctx.textAlign = 'center';
  ctx.fillText('L', 0, -18);

  // Mustache (Luigi's is thinner/longer)
  ctx.fillStyle = '#3e2200';
  ctx.beginPath(); ctx.ellipse(-6, -9, 6, 3, -0.3, 0, Math.PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -9, 6, 3, 0.3, 0, Math.PI);  ctx.fill();

  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-5, -14, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -14, 3, 0, Math.PI*2);  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-4, -15, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -15, 1.2, 0, Math.PI*2);  ctx.fill();

  // Gun arm
  ctx.fillStyle = '#64b5f6';
  ctx.fillRect(10, -2, 12, 7);
  ctx.fillStyle = '#888';
  ctx.fillRect(20, -4, 5, 11);

  // Jump spin
  if (!p.onGround && p.jumpsLeft === 0) {
    ctx.fillStyle = 'rgba(0,200,255,0.3)';
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

// ── Draw Mario (P2) ──────────────────────────────────────────
function drawMario(p) {
  ctx.save();
  if (p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0) ctx.globalAlpha = 0.35;

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  ctx.translate(cx, cy);
  if (!p.facingRight) ctx.scale(-1, 1);

  if (p.powerUp === 'star') {
    ctx.shadowColor = `hsl(${frameCount * 6 % 360}, 100%, 60%)`;
    ctx.shadowBlur  = 22;
  }

  // Shoes
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath(); roundRect(ctx, -12, 22, 12, 7, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, 2, 22, 12, 7, 3);   ctx.fill();

  // Overalls (blue)
  ctx.fillStyle = p.powerUp === 'star' ? `hsl(${frameCount*8%360},100%,55%)` : '#1565c0';
  ctx.beginPath(); roundRect(ctx, -13, 2, 26, 22, 4); ctx.fill();

  // Shirt (red)
  ctx.fillStyle = '#c62828';
  ctx.beginPath(); roundRect(ctx, -13, 2, 11, 14, 3); ctx.fill();
  ctx.beginPath(); roundRect(ctx, 2, 2, 11, 14, 3);   ctx.fill();

  // Buttons
  ctx.fillStyle = '#ffe600';
  ctx.beginPath(); ctx.arc(-4, 4, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, 4, 2, 0, Math.PI*2);  ctx.fill();

  const legSwing = p.onGround ? Math.sin(p.animFrame * Math.PI / 2) * 7 : 0;
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(-10, 18, 8, 8 + (legSwing > 0 ? legSwing : 0));
  ctx.fillRect(2, 18, 8, 8 + (legSwing < 0 ? -legSwing : 0));

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffcc80';
  ctx.beginPath(); ctx.ellipse(0, -15, 13, 15, 0, 0, Math.PI * 2); ctx.fill();

  // RED cap
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.ellipse(0, -21, 14, 7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, -21, 17, 5, -0.1, Math.PI*0.9, Math.PI*2.1);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Fredoka One, cursive';
  ctx.textAlign = 'center';
  ctx.fillText('M', 0, -17);

  // Thick mustache
  ctx.fillStyle = '#3e2200';
  ctx.beginPath(); ctx.ellipse(-4, -8, 8, 4, -0.2, 0, Math.PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -8, 8, 4, 0.2, 0, Math.PI);  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-4, -13, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -13, 3, 0, Math.PI*2);  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-3, -14, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -14, 1.2, 0, Math.PI*2);  ctx.fill();

  ctx.fillStyle = '#c62828';
  ctx.fillRect(10, -2, 12, 7);
  ctx.fillStyle = '#888';
  ctx.fillRect(20, -4, 5, 11);

  if (!p.onGround && p.jumpsLeft === 0) {
    ctx.fillStyle = 'rgba(255,100,0,0.3)';
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

function drawPlayer(p) {
  if (!p.alive) return;
  if (p.id === 1) drawLuigi(p);
  else drawMario(p);
}

// ── Bullets ──────────────────────────────────────────────────
const bullets = [];

function shootBullet(p) {
  SFX.shoot();
  const dir = p.facingRight ? 1 : -1;
  const rapid = p.powerUp === 'rapid';
  bullets.push({
    owner: p.id,
    x: p.facingRight ? p.x + p.w : p.x,
    y: p.y + 20,
    vx: dir * (rapid ? BULLET_SPEED * 1.4 : BULLET_SPEED),
    r: rapid ? 5 : 7,
    trail: [],
    color: p.id === 1 ? '#39ff14' : '#ff6b00',
  });
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 6) b.trail.shift();
    b.x += b.vx;
    if (b.x < -20 || b.x > CANVAS_W + 20) bullets.splice(i, 1);
  }
}

function drawBullets() {
  bullets.forEach(b => {
    b.trail.forEach((t, idx) => {
      ctx.save();
      ctx.globalAlpha = (idx / b.trail.length) * 0.45;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.r * (idx / b.trail.length), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.save();
    ctx.fillStyle   = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── Bonuses (Pac-Man style collectibles) ─────────────────────
const bonuses = [];
let bonusTimer = 0;

const BONUS_TYPES = [
  { type: 'cherry',  color: '#ff3030', glowColor:'#ff3030', label:'🍒', power: 'rapid',  duration: 300, scoreVal: 50,  desc:'RAPID FIRE!' },
  { type: 'star',    color: '#ffe600', glowColor:'#ffe600', label:'⭐', power: 'star',   duration: 420, scoreVal: 100, desc:'STAR POWER!' },
  { type: 'pill',    color: '#00c8ff', glowColor:'#00c8ff', label:'💊', power: 'speed',  duration: 360, scoreVal: 75,  desc:'SPEED BOOST!' },
  { type: 'heart',   color: '#ff3fa4', glowColor:'#ff3fa4', label:'❤️', power: 'heal',   duration: 0,   scoreVal: 30,  desc:'+1 LIFE!' },
  { type: 'mushroom',color: '#ff6b00', glowColor:'#ff6b00', label:'🍄', power: 'big',    duration: 350, scoreVal: 80,  desc:'SUPER JUMP!' },
];

function spawnBonus() {
  const cfg = BONUS_TYPES[Math.floor(Math.random() * BONUS_TYPES.length)];
  const onPlatform = platforms.length > 0 && Math.random() < 0.4;
  let bx = CANVAS_W + 10;
  let by = onPlatform
    ? platforms[Math.floor(Math.random() * platforms.length)].y - 28
    : GROUND_Y - 32 - Math.random() * 140;
  bonuses.push({ ...cfg, x: bx, y: by, w: 28, h: 28, speed: 2.5, bob: Math.random() * Math.PI * 2 });
}

function updateBonuses() {
  bonusTimer++;
  if (bonusTimer > 200) {
    if (Math.random() < 0.55) spawnBonus();
    bonusTimer = 0;
  }
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const b = bonuses[i];
    b.x -= b.speed;
    b.bob += 0.06;
    if (b.x + b.w < 0) { bonuses.splice(i, 1); continue; }

    // Check collection for each alive player
    const playersToCheck = twoPlayer ? [p1, p2] : [p1];
    for (const p of playersToCheck) {
      if (!p.alive) continue;
      if (rectsOverlap(p, { x: b.x, y: b.y + Math.sin(b.bob)*5, w: b.w, h: b.h })) {
        collectBonus(p, b);
        bonuses.splice(i, 1);
        break;
      }
    }
  }
}

function collectBonus(p, b) {
  SFX.bonus();
  score += b.scoreVal;
  updateScoreDisplay();
  spawnParticles(b.x + b.w/2, b.y + b.h/2, 16, [b.glowColor, '#fff', '#ffe600'], 1.3);
  spawnScorePopup(b.x, b.y, b.desc, b.glowColor);

  if (b.power === 'heal') {
    p.health = Math.min(3, p.health + 1);
    updateHeartsDisplay(p);
  } else {
    p.powerUp = b.power;
    p.powerTimer = b.duration;
    SFX.power();
    updatePowerHUD();
  }
}

function drawBonuses() {
  bonuses.forEach(b => {
    const by = b.y + Math.sin(b.bob) * 5;
    ctx.save();
    ctx.shadowColor = b.glowColor;
    ctx.shadowBlur  = 14;
    // Glow ring
    ctx.strokeStyle = b.glowColor;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.5 + Math.sin(b.bob) * 0.2;
    ctx.beginPath();
    ctx.arc(b.x + b.w/2, by + b.h/2, b.w/2 + 4, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `${b.w}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w/2, by + b.h);
    ctx.restore();
  });
}

// ── Pop-culture Enemies ───────────────────────────────────────
const enemies = [];
let enemyTimer = 0;

// Each pop-culture enemy type: draw function + stats
const POP_ENEMIES = [
  {
    id: 'ghost',     label: 'Blinky', w: 44, h: 48, hp: 1,
    speedFn: () => (1.9 + diffMult*0.4)*(0.8+Math.random()*0.4),
    score: 10, glowColor: '#ff4444',
    draw: drawGhost,
  },
  {
    id: 'dalek',     label: 'Dalek',  w: 46, h: 54, hp: 2,
    speedFn: () => (2.2 + diffMult*0.5)*(0.8+Math.random()*0.3),
    score: 25, glowColor: '#c0c000',
    draw: drawDalek,
  },
  {
    id: 'spaceinvader', label: 'Invader', w: 46, h: 44, hp: 1,
    speedFn: () => (3.0 + diffMult*0.6)*(0.85+Math.random()*0.3),
    score: 20, glowColor: '#39ff14',
    draw: drawSpaceInvader,
  },
  {
    id: 'cylon',     label: 'Cylon', w: 48, h: 54, hp: 2,
    speedFn: () => (2.5 + diffMult*0.5)*(0.9+Math.random()*0.3),
    score: 30, glowColor: '#ff2200',
    draw: drawCylon,
  },
  {
    id: 'goomba',    label: 'Goomba', w: 44, h: 44, hp: 1,
    speedFn: () => (2.0 + diffMult*0.4)*(0.8+Math.random()*0.4),
    score: 15, glowColor: '#a06030',
    draw: drawGoomba,
  },
  {
    id: 'alien',     label: 'Xenomorph', w: 44, h: 56, hp: 2,
    speedFn: () => (2.8 + diffMult*0.5)*(0.85+Math.random()*0.3),
    score: 35, glowColor: '#1a8c00',
    draw: drawAlien,
  },
  {
    id: 'terminator', label: 'T-800', w: 46, h: 58, hp: 3,
    speedFn: () => (1.5 + diffMult*0.4)*(0.9+Math.random()*0.2),
    score: 40, glowColor: '#ff3030',
    draw: drawTerminator,
  },
];

function spawnEnemy() {
  if (bossActive) return;
  const available = POP_ENEMIES.filter(e => {
    if (currentLevel < 2 && (e.id === 'terminator' || e.id === 'cylon')) return false;
    return true;
  });
  const cfg = available[Math.floor(Math.random() * available.length)];
  enemies.push({
    ...cfg,
    x: CANVAS_W + 10,
    y: GROUND_Y - cfg.h,
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speedFn(),
    animFrame: 0,
    animTimer: 0,
    hitFlash: 0,
  });
}

function updateEnemies() {
  if (bossActive) return;
  enemyTimer++;
  const interval = Math.max(38, 85 - diffMult * 8);
  if (enemyTimer >= interval) {
    spawnEnemy();
    if (diffMult > 2 && Math.random() < 0.35) spawnEnemy();
    enemyTimer = 0;
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x -= e.speed;
    e.animTimer++;
    if (e.animTimer > 10) { e.animFrame = (e.animFrame + 1) % 4; e.animTimer = 0; }
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.x + e.w < 0) { enemies.splice(i, 1); continue; }
    checkPlayerEnemyCollision(e, i);
  }
}

function checkPlayerEnemyCollision(e, idx) {
  const playersToCheck = twoPlayer ? [p1, p2] : [p1];
  for (const p of playersToCheck) {
    if (!p.alive || p.invincible > 0) continue;
    if (rectsOverlap(p, e)) {
      if (p.powerUp === 'star') {
        // Star power kills enemy
        killEnemy(idx, e);
        return;
      }
      p.health--;
      p.invincible = 90;
      SFX.hit();
      spawnParticles(p.x+p.w/2, p.y+p.h/2, 12, ['#ff3fa4','#ff6b00','#fff'], 1.2);
      updateHeartsDisplay(p);
      if (p.health <= 0) { p.alive = false; checkGameOver(); }
    }
  }
}

function killEnemy(idx, e) {
  enemiesKilled++;
  score += e.score;
  SFX.kill();
  spawnParticles(e.x+e.w/2, e.y+e.h/2, 20, [e.glowColor,'#fff','#ffe600','#ff3fa4'], 1.5);
  spawnScorePopup(e.x, e.y - 10, `+${e.score}`, e.glowColor);
  enemies.splice(idx, 1);
  updateScoreDisplay();

  if (enemiesKilled >= BOSS_KILL_THRESHOLD && !bossActive) spawnBoss();
}

function drawEnemyEntity(e) {
  ctx.save();
  if (e.hitFlash > 0) ctx.globalAlpha = 0.5 + Math.sin(e.hitFlash * 0.8) * 0.5;
  ctx.translate(e.x + e.w/2, e.y + e.h/2);
  ctx.shadowColor = e.glowColor;
  ctx.shadowBlur  = 16;
  e.draw(e);
  if (e.maxHp > 1) drawHpBar(e);
  ctx.restore();
}

function drawHpBar(e) {
  ctx.shadowBlur = 0;
  const bw = e.w - 4, bh = 6;
  ctx.fillStyle = '#333';
  ctx.fillRect(-bw/2, -e.h/2 - 12, bw, bh);
  ctx.fillStyle = '#39ff14';
  ctx.fillRect(-bw/2, -e.h/2 - 12, bw * (e.hp/e.maxHp), bh);
}

function drawEnemies() {
  enemies.forEach(e => drawEnemyEntity(e));
}

// ── Pop-culture enemy draw functions ─────────────────────────
function drawGhost(e) {
  // Pac-Man Ghost (Blinky)
  const bob = Math.sin(e.animFrame * Math.PI/2) * 3;
  ctx.fillStyle = '#ff4444';
  // Body dome
  ctx.beginPath();
  ctx.arc(0, -6+bob, 18, Math.PI, 0);
  ctx.lineTo(18, 14+bob);
  for (let i = 3; i >= 0; i--) {
    ctx.arc(-18+i*12, 14+bob, 6, 0, Math.PI, true);
  }
  ctx.closePath();
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-6,-4+bob,6,8,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6,-4+bob,6,8,0,0,Math.PI*2);  ctx.fill();
  ctx.fillStyle = '#00f';
  ctx.beginPath(); ctx.arc(-5,-4+bob,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(7,-4+bob,4,0,Math.PI*2);  ctx.fill();
}

function drawSpaceInvader(e) {
  const bob = Math.sin(e.animFrame * Math.PI/2) * 3;
  ctx.fillStyle = '#39ff14';
  // Grid-pixel body
  const px = 5;
  const grid = [
    [0,0,1,0,0,0,1,0,0],
    [0,0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,0,1,1,1,0,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,0,1,1,1,0,1,0],
    [1,0,0,0,0,0,0,0,1],
    [0,1,0,0,0,0,0,1,0],
  ];
  grid.forEach((row, ry) => row.forEach((cell, rx) => {
    if (!cell) return;
    ctx.fillRect(-22+rx*px, -20+ry*px+bob, px-1, px-1);
  }));
}

function drawDalek(e) {
  const bob = Math.sin(e.animFrame * Math.PI/3) * 2;
  // Skirt
  ctx.fillStyle = '#c8b400';
  ctx.beginPath(); roundRect(ctx,-20,2+bob,40,22,3); ctx.fill();
  // Bumps
  ctx.fillStyle = '#a09000';
  for (let bx=-14; bx<=14; bx+=9) {
    for (let by=0; by<2; by++) {
      ctx.beginPath(); ctx.arc(bx, 8+by*9+bob, 3, 0, Math.PI*2); ctx.fill();
    }
  }
  // Mid section
  ctx.fillStyle = '#888';
  ctx.beginPath(); roundRect(ctx,-16,-8+bob,32,14,2); ctx.fill();
  // Shoulder lights
  ctx.fillStyle = '#00f0ff'; ctx.shadowColor='#00f0ff'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(-14,-2+bob,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(14,-2+bob,4,0,Math.PI*2);  ctx.fill();
  ctx.shadowBlur=16;
  // Head dome
  ctx.fillStyle = '#c8b400';
  ctx.beginPath(); ctx.arc(0,-20+bob,13,0,Math.PI*2); ctx.fill();
  // Eye
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath(); ctx.arc(0,-20+bob,5,0,Math.PI*2); ctx.fill();
  // Gun stalk
  ctx.fillStyle = '#666';
  ctx.fillRect(-2,-10+bob,4,12);
  ctx.fillRect(-8,-12+bob,10,5);
}

function drawCylon(e) {
  const bob = Math.sin(e.animFrame * Math.PI/3) * 2;
  // Chrome body
  const g = ctx.createLinearGradient(-20,-24+bob,20,26+bob);
  g.addColorStop(0,'#888'); g.addColorStop(0.5,'#ccc'); g.addColorStop(1,'#666');
  ctx.fillStyle = g;
  ctx.beginPath(); roundRect(ctx,-20,-24+bob,40,52,6); ctx.fill();
  // Visor band (scanning red eye)
  const scan = Math.sin(frameCount * 0.12) * 12;
  ctx.fillStyle = '#222';
  ctx.fillRect(-18,-12+bob,36,14);
  ctx.fillStyle = '#ff2200';
  ctx.shadowColor='#ff2200'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.arc(scan,-5+bob,5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=16;
  // Body stripes
  ctx.strokeStyle='#555'; ctx.lineWidth=2;
  for (let sy=-2; sy<=3; sy++) {
    ctx.beginPath(); ctx.moveTo(-18,sy*8+bob); ctx.lineTo(18,sy*8+bob); ctx.stroke();
  }
  // Feet
  ctx.fillStyle='#555';
  ctx.fillRect(-18,24+bob,14,10);
  ctx.fillRect(4,24+bob,14,10);
}

function drawGoomba(e) {
  const bob = Math.sin(e.animFrame * Math.PI/2) * 3;
  // Brown body
  ctx.fillStyle = '#8B4513';
  ctx.beginPath(); ctx.ellipse(0,4+bob,18,16,0,0,Math.PI*2); ctx.fill();
  // Feet
  ctx.fillStyle = '#5c2e00';
  const lf = Math.sin(e.animFrame * Math.PI/2)*5;
  ctx.beginPath(); ctx.ellipse(-10,18+bob+lf,8,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10,18+bob-lf,8,5,0,0,Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-7,0+bob,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(7,0+bob,5,0,Math.PI*2);  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-8,0+bob,2.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,0+bob,2.5,0,Math.PI*2);  ctx.fill();
  // Angry brows
  ctx.strokeStyle='#000'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(-12,-5+bob); ctx.lineTo(-3,-2+bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12,-5+bob);  ctx.lineTo(3,-2+bob);  ctx.stroke();
  // Fangs
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.moveTo(-5,8+bob); ctx.lineTo(-2,14+bob); ctx.lineTo(1,8+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo(3,8+bob);  ctx.lineTo(6,14+bob);  ctx.lineTo(9,8+bob); ctx.fill();
}

function drawAlien(e) {
  const bob = Math.sin(e.animFrame * Math.PI/3) * 2;
  // Elongated head
  ctx.fillStyle = '#1a5c00';
  ctx.beginPath(); ctx.ellipse(0,-18+bob,10,20,0,0,Math.PI*2); ctx.fill();
  // Inner skull
  ctx.fillStyle = '#2a8800';
  ctx.beginPath(); ctx.ellipse(0,-20+bob,7,14,0,0,Math.PI*2); ctx.fill();
  // Body
  ctx.fillStyle = '#1a5c00';
  ctx.beginPath(); roundRect(ctx,-14,-4+bob,28,28,4); ctx.fill();
  // Ribs
  ctx.strokeStyle='#0a3a00'; ctx.lineWidth=2;
  for (let r=0;r<3;r++){
    ctx.beginPath(); ctx.moveTo(-12,2+r*8+bob); ctx.lineTo(12,2+r*8+bob); ctx.stroke();
  }
  // Teeth/mouth
  ctx.fillStyle='#ffe600';
  for(let t=-8;t<=8;t+=4){
    ctx.beginPath(); ctx.moveTo(t,-6+bob); ctx.lineTo(t+2,0+bob); ctx.lineTo(t+4,-6+bob); ctx.fill();
  }
  // Inner mouth
  ctx.fillStyle='#001a00';
  ctx.beginPath(); ctx.rect(-10,-6+bob,20,6); ctx.fill();
  // Limbs
  ctx.fillStyle='#1a5c00';
  ctx.fillRect(-22,0+bob,10,30);
  ctx.fillRect(12,0+bob,10,30);
  ctx.fillRect(-14,22+bob,9,12);
  ctx.fillRect(5,22+bob,9,12);
}

function drawTerminator(e) {
  const bob = Math.sin(e.animFrame * Math.PI/3) * 2;
  // Metal skeleton body
  ctx.fillStyle = '#444';
  ctx.beginPath(); roundRect(ctx,-18,-20+bob,36,46,4); ctx.fill();
  ctx.fillStyle = '#666';
  ctx.fillRect(-14,-16+bob,28,38);
  // Spine/ribs
  ctx.strokeStyle='#888'; ctx.lineWidth=2;
  for(let r=-3;r<=2;r++){
    ctx.beginPath(); ctx.moveTo(-12,r*8+bob); ctx.lineTo(12,r*8+bob); ctx.stroke();
  }
  // Skull head
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.ellipse(0,-30+bob,14,16,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(0,-32+bob,10,11,0,0,Math.PI*2); ctx.fill();
  // Red eyes
  ctx.fillStyle='#ff2200';
  ctx.shadowColor='#ff2200'; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.arc(-5,-32+bob,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5,-32+bob,4,0,Math.PI*2);  ctx.fill();
  ctx.shadowBlur=16;
  // Jaw teeth
  ctx.fillStyle='#ccc';
  for(let t=-10;t<=8;t+=4){
    ctx.beginPath(); ctx.rect(t,-20+bob,3,7); ctx.fill();
  }
  // Arms
  ctx.fillStyle='#555';
  ctx.fillRect(-28,-18+bob,12,36);
  ctx.fillRect(16,-18+bob,12,36);
  // Feet
  ctx.fillStyle='#333';
  ctx.fillRect(-16,24+bob,14,10);
  ctx.fillRect(2,24+bob,14,10);
}

// ── Boss ──────────────────────────────────────────────────────
const BOSS_CONFIGS = [
  { name: 'BOWSER',     color:'#ff6b00', glowColor:'#ff6b00', hp: 40, draw: drawBossBowser },
  { name: 'DARTH VADER',color:'#222',    glowColor:'#ff0000', hp: 50, draw: drawBossDarthVader },
  { name: 'MEGATRON',   color:'#888',    glowColor:'#c0c0c0', hp: 45, draw: drawBossMegatron },
];

function getBossConfig() {
  return BOSS_CONFIGS[(currentLevel - 1) % BOSS_CONFIGS.length];
}

function spawnBoss() {
  bossActive = true;
  enemies.length = 0;
  const cfg = getBossConfig();
  boss = {
    ...cfg,
    x: CANVAS_W - 160,
    y: GROUND_Y - 120,
    w: 110, h: 120,
    maxHp: cfg.hp,
    vx: -1.2, vy: 0,
    phase: 1,
    animFrame: 0,
    animTimer: 0,
    hitFlash: 0,
    shootTimer: 0,
    alive: true,
  };
  document.getElementById('boss-bar-wrap').classList.remove('hidden');
  updateBossBar();
  SFX.levelup();
}

function updateBoss() {
  if (!boss || !boss.alive) return;

  boss.animTimer++;
  if (boss.animTimer > 8) { boss.animFrame = (boss.animFrame+1)%4; boss.animTimer=0; }
  if (boss.hitFlash > 0) boss.hitFlash--;

  // Movement pattern
  boss.x += boss.vx;
  boss.y += boss.vy;
  if (boss.x < CANVAS_W * 0.35) boss.vx = Math.abs(boss.vx);
  if (boss.x + boss.w > CANVAS_W - 10) boss.vx = -Math.abs(boss.vx);

  // Phase 2: more aggressive
  if (boss.hp <= boss.maxHp / 2 && boss.phase === 1) {
    boss.phase = 2;
    boss.vx *= 1.6;
    spawnParticles(boss.x+boss.w/2, boss.y+boss.h/2, 30, [boss.glowColor,'#fff','#ffe600'], 2);
  }

  // Bounce on ground
  if (boss.y + boss.h >= GROUND_Y) { boss.y = GROUND_Y - boss.h; boss.vy = (boss.phase===2 ? -6 : -4) * (Math.random()<0.4?1:0); }
  boss.vy += 0.3;

  // Boss shoots projectiles
  boss.shootTimer++;
  const fireRate = boss.phase === 2 ? 40 : 70;
  if (boss.shootTimer >= fireRate) {
    boss.shootTimer = 0;
    spawnBossProjectile();
  }

  // Player collision
  const playersToCheck = twoPlayer ? [p1, p2] : [p1];
  for (const p of playersToCheck) {
    if (!p.alive || p.invincible > 0) continue;
    if (rectsOverlap(p, boss)) {
      if (p.powerUp === 'star') continue;
      p.health--;
      p.invincible = 90;
      SFX.hit();
      updateHeartsDisplay(p);
      if (p.health <= 0) { p.alive = false; checkGameOver(); }
    }
  }

  updateBossBar();
}

const bossProjectiles = [];

function spawnBossProjectile() {
  const target = (twoPlayer && !p1.alive && p2.alive) ? p2 : p1;
  if (!target.alive) return;
  const dx = (target.x + target.w/2) - (boss.x + boss.w/2);
  const dy = (target.y + target.h/2) - (boss.y + boss.h/2);
  const len = Math.sqrt(dx*dx+dy*dy) || 1;
  bossProjectiles.push({
    x: boss.x + boss.w/2, y: boss.y + boss.h/2,
    vx: (dx/len)*4.5, vy: (dy/len)*4.5,
    r: 9, color: boss.glowColor,
    trail: [],
  });
}

function updateBossProjectiles() {
  for (let i = bossProjectiles.length-1; i >= 0; i--) {
    const b = bossProjectiles[i];
    b.trail.push({x:b.x,y:b.y});
    if (b.trail.length>8) b.trail.shift();
    b.x+=b.vx; b.y+=b.vy;
    if (b.x<-30||b.x>CANVAS_W+30||b.y>CANVAS_H+30) { bossProjectiles.splice(i,1); continue; }
    const playersToCheck = twoPlayer ? [p1, p2] : [p1];
    for (const p of playersToCheck) {
      if (!p.alive || p.invincible > 0) continue;
      if (circleRectOverlap(b.x,b.y,b.r,p.x,p.y,p.w,p.h)) {
        if (p.powerUp === 'star') { bossProjectiles.splice(i,1); break; }
        p.health--; p.invincible=90; SFX.hit();
        updateHeartsDisplay(p);
        spawnParticles(b.x,b.y,8,['#ff3030','#fff'],1);
        bossProjectiles.splice(i,1);
        if (p.health<=0) { p.alive=false; checkGameOver(); }
        break;
      }
    }
  }
}

function drawBossProjectiles() {
  bossProjectiles.forEach(b => {
    b.trail.forEach((t,idx)=>{
      ctx.save();
      ctx.globalAlpha=(idx/b.trail.length)*0.4;
      ctx.fillStyle=b.color;
      ctx.beginPath(); ctx.arc(t.x,t.y,b.r*(idx/b.trail.length),0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
    ctx.save();
    ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

function drawBoss() {
  if (!boss || !boss.alive) return;
  ctx.save();
  if (boss.hitFlash>0) ctx.globalAlpha=0.45+Math.sin(boss.hitFlash*0.8)*0.45;
  ctx.translate(boss.x+boss.w/2, boss.y+boss.h/2);
  ctx.shadowColor=boss.glowColor; ctx.shadowBlur=28;
  boss.draw(boss);
  // Name label
  ctx.shadowBlur=0;
  ctx.font='bold 13px Fredoka One, cursive';
  ctx.fillStyle='#fff';
  ctx.textAlign='center';
  ctx.fillText(boss.name, 0, -boss.h/2-14);
  ctx.restore();
}

function drawBossBowser(b) {
  const bob = Math.sin(b.animFrame*Math.PI/3)*4;
  // Shell
  ctx.fillStyle='#3a7a00';
  ctx.beginPath(); ctx.ellipse(0,10+bob,44,36,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#ffe600'; ctx.lineWidth=3;
  for(let r=0;r<3;r++){
    ctx.beginPath(); ctx.ellipse(0,10+bob,20+r*8,14+r*6,0,0,Math.PI*2); ctx.stroke();
  }
  // Body
  ctx.fillStyle='#c86400';
  ctx.beginPath(); roundRect(ctx,-30,-30+bob,60,52,8); ctx.fill();
  // Spiky collar
  ctx.fillStyle='#ffe600';
  for(let s=-3;s<=3;s++){
    ctx.beginPath(); ctx.moveTo(s*10,-28+bob); ctx.lineTo(s*10+5,-42+bob); ctx.lineTo(s*10+10,-28+bob); ctx.fill();
  }
  // Head
  ctx.fillStyle='#c86400';
  ctx.beginPath(); ctx.ellipse(0,-50+bob,28,24,0,0,Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-12,-54+bob,9,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(12,-54+bob,9,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#c00'; ctx.beginPath(); ctx.arc(-12,-54+bob,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(12,-54+bob,5,0,Math.PI*2); ctx.fill();
  // Horns
  ctx.fillStyle='#ffe600';
  ctx.beginPath(); ctx.moveTo(-20,-62+bob); ctx.lineTo(-14,-80+bob); ctx.lineTo(-6,-62+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6,-62+bob);  ctx.lineTo(14,-80+bob);  ctx.lineTo(20,-62+bob); ctx.fill();
  // Claws
  ctx.fillStyle='#ffe600';
  ctx.fillRect(-52,0+bob,24,12); ctx.fillRect(28,0+bob,24,12);
  // Legs
  ctx.fillStyle='#a05000';
  ctx.fillRect(-24,22+bob,18,28); ctx.fillRect(6,22+bob,18,28);
}

function drawBossDarthVader(b) {
  const bob=Math.sin(b.animFrame*Math.PI/3)*3;
  // Cape
  ctx.fillStyle='#111';
  ctx.beginPath();
  ctx.moveTo(-50,20+bob); ctx.lineTo(-30,-40+bob); ctx.lineTo(30,-40+bob); ctx.lineTo(50,20+bob);
  ctx.quadraticCurveTo(0,50+bob,-50,20+bob); ctx.fill();
  // Body armor
  const bg=ctx.createLinearGradient(-26,-36+bob,26,36+bob);
  bg.addColorStop(0,'#333'); bg.addColorStop(0.5,'#555'); bg.addColorStop(1,'#222');
  ctx.fillStyle=bg;
  ctx.beginPath(); roundRect(ctx,-26,-36+bob,52,52,4); ctx.fill();
  // Chest buttons
  ctx.fillStyle='#888';
  for(let cx=-14;cx<=10;cx+=8) ctx.fillRect(cx,-28+bob,6,5);
  for(let cy=-18;cy<=0;cy+=8){ ctx.fillStyle=cy===-18?'#0f0':'#f00'; ctx.fillRect(16,cy+bob,5,5); }
  // Helmet
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.ellipse(0,-56+bob,24,28,0,0,Math.PI*2); ctx.fill();
  // Faceplate dome
  ctx.fillStyle='#222';
  ctx.beginPath(); ctx.ellipse(0,-56+bob,18,20,0,0,Math.PI*2); ctx.fill();
  // Eye lenses
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(-8,-60+bob,7,5,0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8,-60+bob,7,5,-0.3,0,Math.PI*2); ctx.fill();
  // Breathing grille
  for(let g=-3;g<=3;g+=2){ ctx.fillStyle='#444'; ctx.fillRect(g*3,-48+bob,2,8); }
  // Lightsaber
  ctx.fillStyle='#f00'; ctx.shadowColor='#f00'; ctx.shadowBlur=14;
  ctx.fillRect(34,-50+bob,6,60);
  ctx.fillStyle='#ff8888';
  ctx.fillRect(35,-50+bob,3,58);
  ctx.shadowBlur=28;
  // Gloves/hands
  ctx.fillStyle='#222';
  ctx.fillRect(-42,-16+bob,16,20); ctx.fillRect(26,-16+bob,16,20);
}

function drawBossMegatron(b) {
  const bob=Math.sin(b.animFrame*Math.PI/3)*3;
  const mg=ctx.createLinearGradient(-40,-50+bob,40,50+bob);
  mg.addColorStop(0,'#aaa'); mg.addColorStop(0.5,'#eee'); mg.addColorStop(1,'#666');
  ctx.fillStyle=mg;
  ctx.beginPath(); roundRect(ctx,-36,-50+bob,72,70,6); ctx.fill();
  // Mechanical ribs
  ctx.strokeStyle='#888'; ctx.lineWidth=3;
  for(let r=0;r<5;r++){ ctx.beginPath(); ctx.moveTo(-32,-40+r*12+bob); ctx.lineTo(32,-40+r*12+bob); ctx.stroke(); }
  // Head
  ctx.fillStyle='#ccc';
  ctx.beginPath(); roundRect(ctx,-22,-74+bob,44,28,4); ctx.fill();
  ctx.fillStyle='#999';
  ctx.beginPath(); roundRect(ctx,-18,-72+bob,36,24,3); ctx.fill();
  // Red eyes
  ctx.fillStyle='#f00'; ctx.shadowColor='#f00'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.arc(-8,-62+bob,6,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-62+bob,6,0,Math.PI*2);  ctx.fill();
  ctx.shadowBlur=28;
  // Cannon arm
  ctx.fillStyle='#888';
  ctx.fillRect(36,-30+bob,28,18);
  ctx.fillStyle='#555';
  ctx.beginPath(); ctx.arc(64,-21+bob,14,0,Math.PI*2); ctx.fill();
  // Cannon glow
  ctx.fillStyle='#ff4400'; ctx.shadowColor='#ff4400'; ctx.shadowBlur=16;
  ctx.beginPath(); ctx.arc(64,-21+bob,8,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=28;
  // Legs
  ctx.fillStyle='#888';
  ctx.fillRect(-28,20+bob,22,30); ctx.fillRect(6,20+bob,22,30);
  ctx.fillStyle='#666';
  ctx.fillRect(-30,44+bob,24,12); ctx.fillRect(6,44+bob,24,12);
  // Wing bits
  ctx.fillStyle='#aaa';
  ctx.beginPath(); ctx.moveTo(-36,-40+bob); ctx.lineTo(-56,-10+bob); ctx.lineTo(-36,-10+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo(36,-40+bob);  ctx.lineTo(56,-10+bob);  ctx.lineTo(36,-10+bob); ctx.fill();
}

// ── Bullet ↔ enemy/boss collisions ───────────────────────────
function checkBulletEnemyCollisions() {
  for (let bi = bullets.length-1; bi >= 0; bi--) {
    const b = bullets[bi];
    let hit = false;

    // Boss
    if (bossActive && boss && boss.alive) {
      if (circleRectOverlap(b.x,b.y,b.r,boss.x,boss.y,boss.w,boss.h)) {
        boss.hp--;
        boss.hitFlash = 10;
        SFX.bossHit();
        spawnParticles(b.x,b.y,8,[boss.glowColor,'#fff'],1);
        bullets.splice(bi,1);
        updateBossBar();
        if (boss.hp <= 0) bossDefeated();
        hit = true;
      }
    }
    if (hit) continue;

    // Regular enemies
    for (let ei = enemies.length-1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (circleRectOverlap(b.x,b.y,b.r,e.x,e.y,e.w,e.h)) {
        e.hp--;
        e.hitFlash = 12;
        spawnParticles(b.x,b.y,8,[e.glowColor,'#fff','#ffe600'],1);
        bullets.splice(bi,1);
        if (e.hp <= 0) killEnemy(ei, e);
        break;
      }
    }
  }
}

function bossDefeated() {
  boss.alive = false;
  bossActive = false;
  SFX.levelup();
  spawnParticles(boss.x+boss.w/2, boss.y+boss.h/2, 60, [boss.glowColor,'#fff','#ffe600','#ff3fa4'], 2.5);
  score += 500;
  updateScoreDisplay();
  spawnScorePopup(boss.x+boss.w/2-40, boss.y-20, 'BOSS DOWN! +500', '#ffe600');
  document.getElementById('boss-bar-wrap').classList.add('hidden');
  boss = null;
  setTimeout(() => triggerLevelClear(), 1200);
}

function triggerLevelClear() {
  if (state !== 'play') return;
  state = 'levelclear';
  SFX.levelup();
  const nextLvl = currentLevel + 1;
  document.getElementById('levelclear-msg').textContent = `Get ready for Level ${nextLvl}…`;
  document.getElementById('levelclear-screen').classList.remove('hidden');
  let count = 3;
  document.getElementById('levelclear-countdown').textContent = count;
  const iv = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(iv);
      document.getElementById('levelclear-screen').classList.add('hidden');
      nextLevel();
    } else {
      document.getElementById('levelclear-countdown').textContent = count;
    }
  }, 1000);
}

function nextLevel() {
  currentLevel++;
  diffMult += 0.8;
  enemiesKilled = 0;
  bossActive = false;
  boss = null;
  enemies.length = 0;
  bossProjectiles.length = 0;
  enemyTimer = 0;
  document.getElementById('level-value').textContent = currentLevel;
  state = 'play';
  lastTime = performance.now();
  animId = requestAnimationFrame(gameLoop);
}

// ── HUD updates ───────────────────────────────────────────────
function updateHeartsDisplay(p) {
  const el = document.getElementById(p.id === 1 ? 'p1-hearts' : 'p2-hearts');
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.textContent = i < p.health ? '❤️' : '🖤';
    el.appendChild(span);
  }
}

function updateScoreDisplay() {
  document.getElementById('score-value').textContent = score;
  if (score > highScore) {
    highScore = score;
    document.getElementById('highscore-value').textContent = highScore;
    localStorage.setItem('monsterDashHigh', highScore);
  }
}

function updateBossBar() {
  if (!boss) return;
  const pct = Math.max(0, boss.hp / boss.maxHp) * 100;
  document.getElementById('boss-bar-fill').style.width = pct + '%';
}

function updatePowerHUD() {
  const players = twoPlayer ? [p1, p2] : [p1];
  players.forEach(p => {
    const el = document.getElementById(p.id===1?'p1-power-hud':'p2-power-hud');
    if (p.powerUp) {
      const icons = { star:'⭐', speed:'💨', rapid:'🔥', big:'🍄', heal:'❤️' };
      const secs = Math.ceil(p.powerTimer/60);
      el.textContent = `${icons[p.powerUp]||'✨'} ${secs}s`;
    } else {
      el.textContent = '';
    }
  });
}

// ── Score popups ──────────────────────────────────────────────
const scorePopups = [];

function spawnScorePopup(x, y, text, color='#ffe600') {
  scorePopups.push({ x, y, text, color, life: 1 });
}

function updateScorePopups() {
  for (let i=scorePopups.length-1;i>=0;i--) {
    scorePopups[i].y -= 1.5;
    scorePopups[i].life -= 0.022;
    if (scorePopups[i].life <= 0) scorePopups.splice(i,1);
  }
}

function drawScorePopups() {
  scorePopups.forEach(p => {
    ctx.save();
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=8;
    ctx.font='bold 20px Fredoka One, cursive';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });
}

// ── Difficulty ────────────────────────────────────────────────
function updateDifficulty() {
  diffMult = currentLevel + Math.floor(frameCount/1800)*0.5;
}

function updateSurvivalScore() {
  survivalTimer++;
  if (survivalTimer >= 60) {
    score += currentLevel;
    survivalTimer = 0;
    updateScoreDisplay();
  }
}

// ── Collision helpers ─────────────────────────────────────────
function rectsOverlap(a, b) {
  return a.x+6<b.x+b.w-6 && a.x+a.w-6>b.x+6 && a.y+6<b.y+b.h && a.y+a.h>b.y+6;
}

function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nx, dy=cy-ny;
  return dx*dx+dy*dy<r*r;
}

// ── Pause / Fullscreen ────────────────────────────────────────
function togglePause() {
  if (state === 'play') {
    state = 'paused';
    cancelAnimationFrame(animId);
    document.getElementById('pause-overlay').classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'play';
    document.getElementById('pause-overlay').classList.add('hidden');
    lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);
  }
}

function toggleFullscreen() {
  const container = document.getElementById('game-container');
  if (!document.fullscreenElement) {
    (container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen).call(container);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
  }
}

// ── Game Over check ───────────────────────────────────────────
function checkGameOver() {
  if (twoPlayer) {
    if (!p1.alive && !p2.alive) endGame();
  } else {
    if (!p1.alive) endGame();
  }
}

// ── Game loop ─────────────────────────────────────────────────
let lastTime = 0;
let animId   = null;

function gameLoop(ts) {
  lastTime = ts;
  if (state !== 'play') return;

  frameCount++;
  updateDifficulty();
  updateSurvivalScore();

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground();
  drawPlatforms();
  updatePlatforms();

  updatePlayerPhysics(p1);
  if (twoPlayer) updatePlayerPhysics(p2);
  drawPlayer(p1);
  if (twoPlayer) drawPlayer(p2);

  updateBullets();
  drawBullets();

  updateBonuses();
  drawBonuses();

  if (bossActive) {
    updateBoss();
    drawBoss();
    updateBossProjectiles();
    drawBossProjectiles();
  } else {
    updateEnemies();
    drawEnemies();
  }

  checkBulletEnemyCollisions();

  updateParticles();
  drawParticles();

  updateScorePopups();
  drawScorePopups();

  updatePowerHUD();

  animId = requestAnimationFrame(gameLoop);
}

// ── Game flow ─────────────────────────────────────────────────
function startGame() {
  audioCtx.resume();
  state = 'play';

  score = 0; frameCount = 0; diffMult = 1; survivalTimer = 0;
  currentLevel = 1; enemiesKilled = 0; bossActive = false; boss = null;

  enemies.length = 0; bullets.length = 0; particles.length = 0;
  platforms.length = 0; scorePopups.length = 0; bonuses.length = 0;
  bossProjectiles.length = 0;
  enemyTimer = 0; platformTimer = 0; bonusTimer = 0;

  resetPlayer(p1, 120);
  resetPlayer(p2, 200);

  updateHeartsDisplay(p1);
  if (twoPlayer) updateHeartsDisplay(p2);
  updateScoreDisplay();
  document.getElementById('highscore-value').textContent = highScore;
  document.getElementById('level-value').textContent = '1';
  document.getElementById('p2-hud').classList.toggle('hidden', !twoPlayer);
  document.getElementById('boss-bar-wrap').classList.add('hidden');

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('levelclear-screen').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');

  if (animId) cancelAnimationFrame(animId);
  lastTime = performance.now();
  animId = requestAnimationFrame(gameLoop);
}

function endGame() {
  state = 'dead';
  SFX.death();
  if (animId) cancelAnimationFrame(animId);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('monsterDashHigh', highScore);
  }
  document.getElementById('final-score').textContent     = score;
  document.getElementById('final-level').textContent     = currentLevel;
  document.getElementById('final-highscore').textContent = highScore;
  document.getElementById('gameover-screen').classList.remove('hidden');
}

// ── UI wiring ─────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

document.getElementById('mode-1p').addEventListener('click', () => {
  twoPlayer = false;
  document.getElementById('mode-1p').classList.add('active');
  document.getElementById('mode-2p').classList.remove('active');
  document.getElementById('p2-controls').classList.add('hidden');
});

document.getElementById('mode-2p').addEventListener('click', () => {
  twoPlayer = true;
  document.getElementById('mode-2p').classList.add('active');
  document.getElementById('mode-1p').classList.remove('active');
  document.getElementById('p2-controls').classList.remove('hidden');
});

// ── Utility ───────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// Initial bg render
drawBackground();
document.getElementById('highscore-value').textContent = highScore;
