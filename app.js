
(function(){
"use strict";
var KEY="exam-bell-v1";
var $=function(i){return document.getElementById(i)};
var pad=function(n){return n<10?"0"+n:""+n};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var S={exam:{subject:"",teacher:"",start:"",end:"",expected:"",actual:""},bells:[],auto:true,pomo:{focus:25,brk:5}};
try{
  var o=JSON.parse(localStorage.getItem(KEY)||"null");
  if(o){["exam","pomo"].forEach(function(k){if(o[k])Object.assign(S[k],o[k])});
    if(Array.isArray(o.bells))S.bells=o.bells;if(typeof o.auto==="boolean")S.auto=o.auto}
}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* 時間工具：一律整理成 24 小時制 HH:MM */
function normTime(s){
  s=String(s||"").trim().replace(/[：.]/g,":");
  var m=s.match(/^(\d{1,2}):?(\d{2})$/),h,mi;
  if(m){h=+m[1];mi=+m[2]}else if(/^\d{1,2}$/.test(s)){h=+s;mi=0}else return "";
  return(h>23||mi>59)?"":pad(h)+":"+pad(mi);
}
function toMin(t){return /^\d\d:\d\d$/.test(t)?(+t.slice(0,2))*60+(+t.slice(3)):null}
function toNum(v){if(v===""||v==null)return null;v=Math.floor(+v);return isFinite(v)?Math.max(0,v):null}

/* ---------- 分頁 ---------- */
document.querySelectorAll(".tabs button").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll(".tabs button").forEach(function(x){x.setAttribute("aria-selected",x===b)});
    ["exam","bell","pomo"].forEach(function(k){$("p-"+k).classList.toggle("on",k===b.dataset.tab)});
  });
});

/* ---------- 音效（Web Audio）---------- */
var ac=null;
function actx(){
  try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume()}catch(e){}
  return ac;
}
["pointerdown","keydown"].forEach(function(ev){document.addEventListener(ev,function(){actx()},{once:true})});
var PART=[[1,1,2.4],[2.01,.5,1.7],[2.76,.35,1.3],[4.07,.2,.9],[5.4,.12,.6]];
function bellNote(freq,t,vol){
  PART.forEach(function(p){
    var o=ac.createOscillator(),g=ac.createGain();
    o.type="sine";o.frequency.value=freq*p[0];
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol*p[1],t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+p[2]);
    o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+p[2]+.05);
  });
}
function playSeq(freqs,gap,repeat,vol){
  if(!actx())return 0;
  var t=ac.currentTime+.05,i,r;
  for(r=0;r<repeat;r++){
    for(i=0;i<freqs.length;i++){bellNote(freqs[i],t,vol||.25);t+=gap}
    t+=gap*.8;
  }
  return Math.round((t-ac.currentTime)*1000);
}
var DOWN=[415.3,369.99,329.63,246.94],UP=[246.94,329.63,369.99,415.3];
function flash(txt,ms){
  var f=$("flash");f.textContent=txt;f.classList.add("on");
  clearTimeout(flash.t);flash.t=setTimeout(function(){f.classList.remove("on")},Math.max(ms||0,4000));
}
function ring(type,label){
  var ms=playSeq(type==="start"?DOWN:UP,.8,2,.28);
  flash("🔔 "+(type==="start"?"上課鈴":"下課鈴")+(label?"（"+label+"）":"")+" 響鈴中",ms);
}
$("ringStart").addEventListener("click",function(){ring("start")});
$("ringEnd").addEventListener("click",function(){ring("end")});

/* ---------- 考試大鐘 ---------- */
["subject","teacher","start","end","expected","actual"].forEach(function(k){
  var el=$(k);el.value=S.exam[k];
  el.addEventListener("input",function(){if(!el.hasAttribute("data-time"))S.exam[k]=el.value;save()});
  if(el.hasAttribute("data-time"))el.addEventListener("change",function(){
    var v=normTime(el.value);el.classList.toggle("bad",v===""&&el.value.trim()!=="");
    el.value=v;S.exam[k]=v;save();
  });
});
function renderExam(n){
  var e=S.exam,p=$("p-exam");
  $("date").textContent=n.toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"});
  $("clock").textContent=pad(n.getHours())+":"+pad(n.getMinutes())+":"+pad(n.getSeconds());
  window.ExamClock={danger:false};
  var sm=toMin(e.start),em=toMin(e.end),txt="請在下方設定考試時間",cls="";
  if(sm!==null&&em!==null){
    var d0=new Date(n);d0.setHours(0,0,0,0);
    var st=d0.getTime()+sm*6e4,en=d0.getTime()+em*6e4,t=n.getTime();
    if(en<=st)en+=864e5;
    if(t<st){txt="距離考試開始還有 <b>"+Math.ceil((st-t)/6e4)+"</b> 分鐘";cls="wait"}
    else if(t<en){var left=en-t;txt="距離考試結束還有 <b>"+Math.ceil(left/6e4)+"</b> 分鐘";if(left<=6e5)cls="danger"}
    else txt="考試已結束";
  }
  $("remain").innerHTML=txt;
  p.classList.toggle("danger",cls==="danger");window.ExamClock.danger=(cls==="danger");p.classList.toggle("wait",cls==="wait");
  $("iSubject").textContent=e.subject||"";
  var meta=[];
  if(e.start&&e.end)meta.push(e.start+" ～ "+e.end);
  if(e.teacher)meta.push("監考："+e.teacher);
  $("iMeta").textContent=meta.join("　｜　");
  var ex=toNum(e.expected),ac2=toNum(e.actual);
  $("cExp").textContent=ex===null?"—":ex;
  $("cAct").textContent=ac2===null?"—":ac2;
  $("cAbs").textContent=(ex===null||ac2===null)?"—":Math.max(0,ex-ac2);
  $("exWarn").textContent=(ex!==null&&ac2!==null&&ac2>ex)?"⚠ 實到人數大於應到人數，請檢查。":"時間可輸入 0900、9:00 或 9，離開欄位時會自動整理成 24 小時制。";
}
function syncFs(){
  var f=!!(document.fullscreenElement||document.webkitFullscreenElement);
  document.body.classList.toggle("fs",f);$("fsBtn").textContent=f?"離開全螢幕":"全螢幕";
}
$("fsBtn").addEventListener("click",function(){
  var d=document,r;
  try{
    if(d.fullscreenElement||d.webkitFullscreenElement)r=(d.exitFullscreen||d.webkitExitFullscreen).call(d);
    else{var el=d.documentElement;r=(el.requestFullscreen||el.webkitRequestFullscreen).call(el)}
    if(r&&r.catch)r.catch(function(){});
  }catch(e){}
});
document.addEventListener("fullscreenchange",syncFs);
document.addEventListener("webkitfullscreenchange",syncFs);

/* ---------- 上下課鐘 ---------- */
var fired={};
$("auto").checked=S.auto;
$("auto").addEventListener("change",function(){S.auto=$("auto").checked;save();actx()});
function renderBells(){
  S.bells.sort(function(a,b){return toMin(a.start)-toMin(b.start)});
  $("bList").innerHTML=S.bells.length?S.bells.map(function(b){
    return '<li><span><b>'+esc(b.name)+'</b>　上課 '+b.start+'　下課 '+b.end+'</span><button class="btn" type="button" data-del="'+esc(b.id)+'">刪除</button></li>';
  }).join(""):'<li style="color:var(--dim)">還沒有課表，請從上方新增。</li>';
}
$("bList").addEventListener("click",function(e){
  var id=e.target.getAttribute&&e.target.getAttribute("data-del");
  if(!id)return;
  S.bells=S.bells.filter(function(b){return String(b.id)!==id});
  save();renderBells();
});
["bStart","bEnd"].forEach(function(id){
  $(id).addEventListener("change",function(){var v=normTime($(id).value);$(id).classList.toggle("bad",v===""&&$(id).value.trim()!=="");$(id).value=v});
});
$("bAdd").addEventListener("click",function(){
  var s=normTime($("bStart").value),e=normTime($("bEnd").value),err=$("bErr");
  err.style.color="var(--red)";
  if(!s||!e){err.textContent="請輸入正確的上課與下課時間（24 小時制，例如 08:10）。";return}
  if(toMin(e)<=toMin(s)){err.textContent="下課時間必須晚於上課時間。";return}
  S.bells.push({id:Date.now()+"-"+Math.floor(Math.random()*1e4),name:$("bName").value.trim()||("第 "+(S.bells.length+1)+" 節"),start:s,end:e});
  save();renderBells();err.textContent="";
  $("bName").value="";$("bStart").value="";$("bEnd").value="";
});
function checkBells(n){
  if(!S.auto)return;
  var hm=pad(n.getHours())+":"+pad(n.getMinutes()),day=n.toDateString();
  S.bells.forEach(function(b){
    var k1=day+b.id+"s",k2=day+b.id+"e";
    if(b.start===hm&&!fired[k1]){fired[k1]=1;ring("start",b.name)}
    if(b.end===hm&&!fired[k2]){fired[k2]=1;ring("end",b.name)}
  });
}
function renderNext(n){
  var el=$("next");
  if(!S.bells.length){el.textContent="尚未新增課表";return}
  var cur=n.getHours()*60+n.getMinutes(),ev=[];
  S.bells.forEach(function(b){ev.push([toMin(b.start),"上課鈴",b.name,b.start]);ev.push([toMin(b.end),"下課鈴",b.name,b.end])});
  ev.sort(function(a,b){return a[0]-b[0]});
  var nx=ev.filter(function(x){return x[0]>cur})[0],tm=false;
  if(!nx){nx=ev[0];tm=true}
  el.textContent="下一次："+(tm?"明天 ":"")+nx[3]+" "+nx[1]+"（"+nx[2]+"）"+(S.auto?"":"　※自動打鐘已停用");
  $("audioSt").textContent=(ac&&ac.state==="running")?"聲音已啟用。":"尚未啟用聲音：請先點一下頁面上的任何按鈕。";
}

/* ---------- 讀書番茄鐘 ---------- */
var P={phase:"focus",round:1,running:false,endAt:0,left:0};
function phaseMs(){return(P.phase==="focus"?S.pomo.focus:S.pomo.brk)*6e4}
P.left=phaseMs();
$("pFocus").value=S.pomo.focus;$("pBreak").value=S.pomo.brk;
function clampInt(v,lo,hi,def){v=Math.floor(+v);return isFinite(v)?Math.min(hi,Math.max(lo,v)):def}
function onPomoSet(){
  S.pomo.focus=clampInt($("pFocus").value,1,180,25);
  S.pomo.brk=clampInt($("pBreak").value,1,60,5);
  save();if(!P.running)P.left=phaseMs();
}
$("pFocus").addEventListener("change",function(){onPomoSet();$("pFocus").value=S.pomo.focus});
$("pBreak").addEventListener("change",function(){onPomoSet();$("pBreak").value=S.pomo.brk});
function switchPhase(sound){
  if(P.phase==="focus"){P.phase="break";if(sound)playSeq([659.25,783.99,987.77],.7,1,.25)}
  else{P.phase="focus";P.round++;if(sound)playSeq([523.25,392],.8,1,.25)}
  P.left=phaseMs();
  if(P.running)P.endAt=Date.now()+P.left;
}
$("pStart").addEventListener("click",function(){actx();if(P.running)return;P.endAt=Date.now()+P.left;P.running=true});
$("pPause").addEventListener("click",function(){if(!P.running)return;P.left=Math.max(0,P.endAt-Date.now());P.running=false});
$("pReset").addEventListener("click",function(){P.phase="focus";P.round=1;P.running=false;P.left=phaseMs()});
$("pSkip").addEventListener("click",function(){switchPhase(false)});
function renderPomo(){
  if(P.running&&P.endAt-Date.now()<=0)switchPhase(true);
  var ms=P.running?Math.max(0,P.endAt-Date.now()):P.left,sec=Math.ceil(ms/1000);
  var t=pad(Math.floor(sec/60))+":"+pad(sec%60),name=P.phase==="focus"?"專注中":"休息中";
  $("pTime").textContent=t;$("pPhase").textContent=name+(P.running?"":"（已暫停）");
  $("pRound").textContent="第 "+P.round+" 輪";
  $("p-pomo").dataset.phase=P.phase;
  $("pStart").disabled=P.running;$("pPause").disabled=!P.running;
  document.title=P.running?t+" "+name+"｜考試大鐘":"考試大鐘";
}

/* ---------- 主迴圈 ---------- */
function tick(){var n=new Date();renderExam(n);checkBells(n);renderNext(n);renderPomo()}
renderBells();tick();syncFs();
setInterval(tick,250);
})();
