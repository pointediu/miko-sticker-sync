const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {create,normalize}=require('./sync-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const registry=new Map();let serial=0;
class Channel extends EventEmitter{
  open=false;
  send(data){if(this.open)queueMicrotask(()=>this.other.emit('data',structuredClone(data)));}
  close(){if(!this.open)return;this.open=false;this.other.open=false;this.emit('close');this.other.emit('close');}
}
class Peer extends EventEmitter{
  constructor(id){super();this.id=id||'viewer-'+(++serial);this.channels=[];registry.set(this.id,this);queueMicrotask(()=>this.emit('open',this.id));}
  connect(id){const a=new Channel(),b=new Channel();a.other=b;b.other=a;this.channels.push(a);queueMicrotask(()=>{const host=registry.get(id);if(!host)return this.emit('error',{type:'peer-unavailable'});host.channels.push(b);host.emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');});return a;}
  destroy(){registry.delete(this.id);this.channels.forEach(c=>c.close());}
}
function configuration(amount=18){const p={amount,gloss:.48,depth:8,laser:.3,saturation:.35,coverage:.32,softness:.75,grain:.1,hueShift:18,smoothing:180,sensitivity:.5,tiltEnabled:true,iridescence:false};return {mode:'combined',modes:{combined:{...p},laser:{...p}}};}
test('schema rejects missing, non-finite and out-of-range values; strips unknown fields',()=>{
  assert.equal(normalize({mode:'gloss'}),null);
  const c=configuration();c.modes.combined.gloss=Infinity;assert.equal(normalize(c),null);
  c.modes.combined.gloss=2;assert.equal(normalize(c),null);
  c.modes.combined.gloss=.5;c.ignored=true;assert.equal(normalize(c).ignored,undefined);
});
test('authorized viewers receive initial/latest state, remain read-only, pause/resume and reconnect',async(t)=>{
  let config=configuration(),applied=[],status=[];
  const host=create({Peer,hostId:'host',token:'secret',getConfiguration:()=>config});
  const guest=create({Peer,hostId:'host',token:'secret',viewer:true,applyConfiguration:c=>applied.push(c),onStatus:s=>status.push(s)});
  t.after(()=>{guest.stop();host.stop();});
  await sleep(15);assert.equal(applied.length,1);
  for(let i=20;i<=40;i++){config=configuration(i);host.publish();}
  await sleep(80);assert.equal(applied.at(-1).modes.combined.amount,40);assert.equal(applied.length,2);
  guest.follow(false);config=configuration(25);host.publish();await sleep(80);assert.equal(applied.at(-1).modes.combined.amount,40);
  guest.follow(true);assert.equal(applied.at(-1).modes.combined.amount,25);
  guest.publish();assert.equal(config.modes.combined.amount,25);
  const viewer=[...registry.values()].find(p=>p.id.startsWith('viewer'));
  viewer.channels[0].send({type:'state',configuration:configuration(7)});await sleep(5);assert.equal(config.modes.combined.amount,25);
  viewer.channels[0].close();config=configuration(32);await sleep(1100);assert.equal(applied.at(-1).modes.combined.amount,32);
  assert.ok(status.some(s=>s.kind==='retry'));
});
test('incorrect pair secret does not disclose controller configuration',async(t)=>{
  let received=0;
  const host=create({Peer,hostId:'secure-host',token:'right',getConfiguration:()=>configuration()});
  const guest=create({Peer,hostId:'secure-host',token:'wrong',viewer:true,applyConfiguration:()=>received++});
  t.after(()=>{guest.stop();host.stop();});await sleep(25);assert.equal(received,0);
});
test('material selection, palette and density sync; older configurations remain supported',async(t)=>{
  const old=normalize(configuration());assert.equal(old.modes.laser.material,0);
  const config=configuration();Object.assign(config.modes.laser,{material:3,palette:2,density:.78});config.mode='laser';
  let received;
  const host=create({Peer,hostId:'materials-host',token:'materials',getConfiguration:()=>config});
  const guest=create({Peer,hostId:'materials-host',token:'materials',viewer:true,applyConfiguration:c=>received=c});
  t.after(()=>{guest.stop();host.stop();});await sleep(15);
  assert.equal(received.mode,'laser');assert.equal(received.modes.laser.material,3);assert.equal(received.modes.laser.palette,2);assert.equal(received.modes.laser.density,.78);
  config.modes.laser.material=2;host.publish();await sleep(70);assert.equal(received.modes.laser.material,2);
  config.modes.laser.material=1.5;assert.equal(normalize(config),null);
});
