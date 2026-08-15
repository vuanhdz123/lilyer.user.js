// ==UserScript==
// @name Lilyer Feed Safari
// @version 1.0
// @match https://agma.io/*
// @run-at document-start
// @grant none
// ==/UserScript==

(()=>{const T=[['A5',11267,1472],['E5',11005,10864],['E1',1107,10906],['C1',764,5862],['C5',10984,5776]];
let on=0,i=0,s=null,dead=0,rt,st;
const W=window,send=WebSocket.prototype.send;

WebSocket.prototype.send=function(d){
 s=this;
 if(on&&d instanceof DataView&&d.byteLength>=9&&d.getUint8(0)==0){
  let t=T[i];d.setUint32(1,t[1],true);d.setUint32(5,t[2],true)
 }
 return send.apply(this,arguments)
};

function respawn(){
 let a=document.getElementById('advert'),b=document.getElementById('playBtn');
 let d=a&&a.style.display=='block'||b&&b.offsetHeight>0;
 if(d){
  if(!dead)i=(i+1)%T.length;
  dead=1;
  try{W.closeAdvert()}catch(e){}
  let n=document.getElementById('nick'),v=n?n.value:'';
  if(typeof W.setNick=='function')W.setNick(v);
  else if(typeof W.rspwn=='function')W.rspwn(v);
  else if(b)b.click()
 }else dead=0
}

function space(){
 if(on&&!dead&&s&&s.readyState==1)send.call(s,new Uint8Array([17]))
}

function init(){
 if(W.LILYER)return;
 let x=document.createElement('div');
 x.id='LILYER';
 x.innerHTML='<b>🎀 LILYER FEEDER</b><br><span id="ls">OFFLINE</span> <button id="lb">ON</button><hr>Auto Feed ✓<br>Auto Space 1s ✓<br>Auto Respawn ✓<hr>Đang đến: <b id="lt">---</b>';
 x.style='position:fixed;top:15px;right:10px;z-index:999999;background:#ffd8e9;border:2px solid #ff78ac;border-radius:12px;padding:12px;font:13px Arial;color:#68334c';
 document.body.appendChild(x);
 let b=document.getElementById('lb');
 b.onclick=()=>{
  on=!on;b.textContent=on?'OFF':'ON';
  document.getElementById('ls').textContent=on?'ONLINE':'OFFLINE';
  document.getElementById('lt').textContent=on?T[i][0]+' ('+T[i][1]+','+T[i][2]+')':'---';
  if(on){rt=setInterval(respawn,500);st=setInterval(space,1000)}
  else{clearInterval(rt);clearInterval(st)}
 };
 W.LILYER={stop(){on=0;clearInterval(rt);clearInterval(st);x.remove();delete W.LILYER}}
}
if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',init);
else init()})();
