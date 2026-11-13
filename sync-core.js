'use strict';
(function (root) {
  const ranges = { amount:[4,42], gloss:[0,1], depth:[.5,20], laser:[0,1], saturation:[0,1], coverage:[.1,1], softness:[0,1], grain:[0,1], hueShift:[0,90], smoothing:[40,400], sensitivity:[0,1] };
  function normalize(input) {
    if (!input || !['combined','laser'].includes(input.mode) || !input.modes) return null;
    const result = {mode:input.mode, modes:{}};
    for (const mode of ['combined','laser']) {
      const values = input.modes[mode];
      if (!values || typeof values !== 'object') return null;
      result.modes[mode] = {};
      for (const [key,[min,max]] of Object.entries(ranges)) {
        if (!Number.isFinite(values[key]) || values[key] < min || values[key] > max) return null;
        result.modes[mode][key] = values[key];
      }
      for (const key of ['tiltEnabled','iridescence']) {
        if (typeof values[key] !== 'boolean') return null;
        result.modes[mode][key] = values[key];
      }
    }
    return result;
  }
  function create(options) {
    const {Peer, hostId, token, viewer=false, getConfiguration, applyConfiguration, onStatus=()=>{}} = options;
    let peer, connection, latest, sequence=0, received=-1, following=true, stopped=false;
    let retryTimer, flushTimer, startTimer, retries=0, lastSeen=Date.now();
    const clients = new Map();
    const status = (kind,text) => onStatus({kind,text,following,count:[...clients.values()].filter(c=>c.authorized).length});
    const safeSend = (c, message) => { try { if(c?.open) c.send(message); } catch (_) { c?.close(); } };
    const snapshot = () => ({type:'state',version:1,sequence,configuration:normalize(getConfiguration())});
    const hostStatus = () => status('ready', clients.size ? `已连接 ${[...clients.values()].filter(c=>c.authorized).length} 台手机` : '等待手机扫码');
    function queueRetry() {
      if (stopped || retryTimer) return;
      status('retry','连接中断，正在重试；请保持电脑页面打开');
      retryTimer=setTimeout(()=>{ retryTimer=null; restart(); }, Math.min(1000*2**retries++,10000));
    }
    function trackClient(c) {
      if (clients.size >= 5) { c.on('open',()=>c.close()); return; }
      const entry={authorized:false,lastSeen:Date.now(),timer:setTimeout(()=>c.close(),6000)};
      clients.set(c,entry);
      c.on('data',data=>{
        if (!data || typeof data!=='object') return;
        entry.lastSeen=Date.now();
        if (!entry.authorized) {
          if(data.type!=='hello' || data.version!==1 || data.token!==token) { c.close(); return; }
          entry.authorized=true; clearTimeout(entry.timer); safeSend(c,snapshot()); hostStatus(); return;
        }
        if(data.type==='ping') safeSend(c,{type:'pong'});
        // Preview clients never write to the controller's configuration.
      });
      const remove=()=>{clearTimeout(entry.timer);clients.delete(c);if(!stopped)hostStatus();};
      c.on('close',remove);c.on('error',()=>{remove();c.close();});
    }
    function connectViewer() {
      received=-1;
      connection=peer.connect(hostId,{reliable:true,serialization:'json'});
      const current=connection;
      current.on('open',()=>{lastSeen=Date.now();safeSend(current,{type:'hello',version:1,token});});
      current.on('data',data=>{
        if(current!==connection || !data || typeof data!=='object')return;
        lastSeen=Date.now();
        if(data.type!=='state' || data.version!==1 || !Number.isSafeInteger(data.sequence) || data.sequence<=received)return;
        const config=normalize(data.configuration); if(!config)return;
        received=data.sequence;latest=config;retries=0;clearTimeout(startTimer);
        if(following)applyConfiguration(latest);
        status('ready',following?'已同步电脑参数':'独立调节中');
      });
      current.on('close',()=>{if(current===connection)queueRetry();});
      current.on('error',()=>{if(current===connection)queueRetry();});
    }
    function cleanup() {
      clearTimeout(startTimer); clearTimeout(flushTimer);flushTimer=null;
      const previous=peer;peer=null;
      connection=null;
      for (const [c,entry] of clients) {clearTimeout(entry.timer);c.close();}
      clients.clear();previous?.destroy();
    }
    function restart() {
      if(stopped)return;
      cleanup();status('connecting','正在连接…');
      peer=new Peer(viewer?undefined:hostId,{debug:0});
      const current=peer;
      startTimer=setTimeout(()=>{status('retry','暂时未连上，请保持电脑页面打开，并尝试连接同一 Wi-Fi');queueRetry();},18000);
      peer.on('open',()=>{
        if(peer!==current)return;
        if(viewer)connectViewer();
        else {clearTimeout(startTimer);retries=0;hostStatus();}
      });
      peer.on('connection',c=>{if(viewer)c.on('open',()=>c.close());else trackClient(c);});
      peer.on('disconnected',()=>{if(peer===current)queueRetry();});
      peer.on('error',error=>{
        if(peer!==current)return;
        if(error.type==='unavailable-id') {clearTimeout(startTimer);status('error','配对已被其他页面使用，请重新生成链接');}
        else queueRetry();
      });
    }
    const heartbeat=setInterval(()=>{
      if(viewer && connection?.open) {
        if(Date.now()-lastSeen>20000){connection.close();queueRetry();}
        else safeSend(connection,{type:'ping'});
      } else if(!viewer) {
        for(const [c,entry] of clients)if(Date.now()-entry.lastSeen>30000)c.close();
      }
    },5000);
    function publish() {
      if(viewer || stopped)return;
      sequence++;
      if(flushTimer)return;
      flushTimer=setTimeout(()=>{flushTimer=null;const data=snapshot();for(const [c,e] of clients)if(e.authorized)safeSend(c,data);},50);
    }
    function follow(value) {
      following=Boolean(value);
      if(following && latest)applyConfiguration(latest);
      status(connection?.open?'ready':'retry',following?'跟随电脑参数':'独立调节中');
    }
    function stop(){stopped=true;clearTimeout(retryTimer);clearInterval(heartbeat);cleanup();}
    restart();
    return {publish,follow,stop,retry(){clearTimeout(retryTimer);retryTimer=null;retries=0;restart();}};
  }
  const api={normalize,create};
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.MikoSync=api;
})(typeof window==='object'?window:globalThis);
