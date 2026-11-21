const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');
const asar = require('@electron/asar');

const dir = path.join(process.env.LOCALAPPDATA, 'FACEIT');
const src = path.join(__dirname, 'patch', 'main.js');
const bak = path.join(__dirname, 'backup');
const tmp = path.join(__dirname, '.tmp');
const file = 'faceit-ads.js';
const hook = `require('./${file}');`;

function running() {
  try {
    const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq FACEIT.exe', '/NH'], { encoding: 'utf8' });
    return out.toLowerCase().includes('faceit.exe');
  } catch {
    return false;
  }
}

function ver(name) {
  const m = /^app-(\d+)\.(\d+)\.(\d+)/.exec(name);
  return m ? m.slice(1).map(Number) : null;
}

function newest() {
  if (!fs.existsSync(dir)) throw new Error('FACEIT folder not found');
  const list = fs.readdirSync(dir).filter(n => ver(n));
  if (!list.length) throw new Error('FACEIT version not found');
  list.sort((a, b) => {
    const x = ver(a);
    const y = ver(b);
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  });
  return path.join(dir, list[0]);
}

function cp(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const item of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, item.name);
    const b = path.join(to, item.name);
    if (item.isDirectory()) cp(a, b);
    else fs.copyFileSync(a, b);
  }
}

function wipe(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

async function patch() {
  if (running()) throw new Error('FACEIT client is running. close it first');

  const app = newest();
  const res = path.join(app, 'resources');
  const target = path.join(res, 'app.asar');
  const bdir = path.join(bak, path.basename(app));
  const main = asar.extractFile(target, 'main.js').toString();
  console.log(`version: ${path.basename(app)}`);

  if (!fs.existsSync(path.join(bdir, 'app.asar'))) {
    if (main.startsWith(hook) || main.startsWith("require('./adblock.js');")) {
      throw new Error('No backup found restore the original files first.');
    }
    cp(res, bdir);
    console.log('backup created');
  } else {
    console.log('backup already exists');
  }

  wipe(tmp);
  asar.extractAll(target, tmp);
  fs.copyFileSync(src, path.join(tmp, file));

  let body = fs.readFileSync(path.join(tmp, 'main.js'), 'utf8');
  if (!body.startsWith(hook)) {
    body = body.replace(/^require\('\.\/adblock\.js'\);.*\r?\n/, '');
    body = hook + '\n' + body;
    wipe(path.join(tmp, 'adblock.js'));
    fs.writeFileSync(path.join(tmp, 'main.js'), body);
  }
  console.log('ad code added');

  const out = path.join(res, 'app.asar.new');
  wipe(out);
  wipe(out + '.unpacked');
  await asar.createPackageWithOptions(tmp, out, { unpack: '*.{node,dll,exe}' });
  console.log('asar packed');

  fs.copyFileSync(out, target);
  if (fs.existsSync(out + '.unpacked')) cp(out + '.unpacked', path.join(res, 'app.asar.unpacked'));
  fs.rmSync(out, { force: true });
  wipe(out + '.unpacked');
  wipe(tmp);
  console.log('ads disabled');
}

async function restore() {
  if (running()) throw new Error('FACEIT is running. Close it first.');

  if (!fs.existsSync(bak)) throw new Error('No backup found');
  const list = fs.readdirSync(bak).filter(n => ver(n));
  if (!list.length) throw new Error('No backup found');
  list.sort((a, b) => {
    const x = ver(a);
    const y = ver(b);
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  });

  const v = list[0];
  const from = path.join(bak, v);
  const res = path.join(dir, v, 'resources');
  if (!fs.existsSync(res)) throw new Error('Install folder not found');
  console.log(`backup: ${v}`);

  fs.copyFileSync(path.join(from, 'app.asar'), path.join(res, 'app.asar'));
  const un = path.join(from, 'app.asar.unpacked');
  if (fs.existsSync(un)) cp(un, path.join(res, 'app.asar.unpacked'));
  console.log('original files restored');
}

function menu() {
  console.log('1) patch');
  console.log('2) restore');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Choice: ', async answer => {
    rl.close();
    const pick = answer.trim().toLowerCase();
    try {
      if (pick === '1' || pick === 'patch') await patch();
      else if (pick === '2' || pick === 'restore') await restore();
      else console.log('Invalid choice.');
    } catch (e) {
      console.log(e.message);
    }
  });
}

menu();
