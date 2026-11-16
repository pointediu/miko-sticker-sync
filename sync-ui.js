'use strict';
(() => {
  const $=id=>document.getElementById(id), motion=window.mikoMotion;
  let session, libraryPromise, pair, following=true;
  const params=new URLSearchParams(location.hash.slice(1));
  const viewer=params.has('peer');
  const validPair=p=>p && /^miko-[a-f0-9]{32}$/.test(p.hostId) && /^[a-f0-9]{64}$/.test(p.token);
  const hex=length=>Array.from(crypto.getRandomValues(new Uint8Array(length)),x=>x.toString(16).padStart(2,'0')).join('');
  function newPair(){return {hostId:'miko-'+hex(16),token:hex(32)};}
  function readPair(){try{return JSON.parse(sessionStorage.getItem('miko-pair'));}catch(_){return null;}}
  function persistPair(){try{sessionStorage.setItem('miko-pair',JSON.stringify(pair));}catch(_){}}
  function loadPeer(){
    if(window.Peer)return Promise.resolve(window.Peer);
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
      script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';
      const timer=setTimeout(()=>{script.remove();libraryPromise=null;reject(Error('timeout'));},15000);
      script.onload=()=>{clearTimeout(timer);resolve(window.Peer);};
      script.onerror=()=>{clearTimeout(timer);script.remove();libraryPromise=null;reject(Error('load'));};
      document.head.appendChild(script);
    });
    return libraryPromise;
  }
  function lock(){
    document.querySelectorAll('#settingsPanel input,#settingsPanel select,#settingsPanel [data-mode],#settingsPanel [data-preset],#resetParameters').forEach(el=>el.disabled=viewer && following);
    if(!viewer || !following)motion.refreshControls();
    $('followSync').textContent=following?'独立调节':'恢复同步';
    $('followSync').setAttribute('aria-pressed',String(following));
  }
  function renderLink(){
    const link=new URL(location.href);link.search='';
    const configuration=motion.getConfiguration();
    const selected=configuration.modes?.laser;
    if(selected)link.search=new URLSearchParams({material:String(selected.material ?? 0),palette:String(selected.palette ?? 1),strength:String(Math.round(selected.laser*100)),density:String(Math.round((selected.density ?? .5)*100))}).toString();
    link.hash=new URLSearchParams({peer:pair.hostId,key:pair.token}).toString();
    $('syncLink').value=link.href;
    const code=qrcode(0,'M');code.addData(link.href);code.make();
    $('syncQR').innerHTML=code.createSvgTag({cellSize:4,margin:16,scalable:true});
  }
  async function start(){
    $('syncMessage').textContent='正在连接…';$('retryPair').hidden=true;
    try {
      if(!window.isSecureContext || location.protocol==='file:')throw Error('https');
      if(!validPair(pair))throw Error('pair');
      const Peer=await loadPeer();
      session?.stop();
      session=MikoSync.create({Peer,hostId:pair.hostId,token:pair.token,viewer,
        getConfiguration:motion.getConfiguration,
        applyConfiguration:config=>{motion.applyConfiguration(config);lock();},
        onStatus:({kind,text})=>{$('syncMessage').textContent=text;$('retryPair').hidden=!['retry','error'].includes(kind);}
      });
    }catch(error){
      $('syncMessage').textContent=error.message==='https'?'同步和体感需要先发布到 HTTPS 网页。':error.message==='pair'?'配对链接无效，请在电脑重新生成。':'同步服务暂时连不上，仍可独立调节效果。';
      $('retryPair').hidden=false;
    }
  }
  $('syncOptions').addEventListener('toggle',()=>{if($('syncOptions').open && !viewer && !session)start();});
  $('copySyncLink').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('syncLink').value);motion.toast('手机链接已复制');}
    catch(_){$('syncLink').focus();$('syncLink').select();motion.toast('请复制已选中的链接');}
  });
  $('renewSyncLink').addEventListener('click',()=>{session?.stop();session=null;pair=newPair();persistPair();renderLink();start();});
  $('retryPair').addEventListener('click',()=>{if(session)session.retry();else start();});
  $('followSync').addEventListener('click',()=>{following=!following;session?.follow(following);lock();});
  window.addEventListener('miko-settings',()=>{session?.publish();});
  window.addEventListener('pagehide',()=>{session?.stop();session=null;});
  window.addEventListener('pageshow',e=>{if(e.persisted && (viewer || $('syncOptions').open))start();});
  window.addEventListener('online',()=>{if(session)session.retry();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && viewer && session)session.retry();});
  if(viewer){
    pair={hostId:params.get('peer'),token:params.get('key')};
    $('syncOptions').hidden=true;$('syncState').hidden=false;$('followSync').hidden=false;
    lock();start();
  }else{
    pair=readPair();if(!validPair(pair)){pair=newPair();persistPair();}
    renderLink();
    if(new URLSearchParams(location.search).has('material'))$('syncOptions').open=true;
  }
})();
