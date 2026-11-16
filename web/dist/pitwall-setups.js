/* Setups (beta, the testers and the admins: setupsOk() in index.html), for iRacing and Le Mans Ultimate.
   "For this car": the free setups for the car you drive, from the free setups library (setups their authors publish under
   a licence that lets anyone share them, tools/setups-library.mjs, each with its author and licence) and from the drivers
   who share theirs. Apply puts the file in the game's setups folder (iRacing: Documents\iRacing\setups\<car>\Pitlane
   Community; LMU: UserData\player\Settings\<track>) and the driver loads it in the garage.
   "My setups": the setups on your PC, with notes, the best lap with each one (iRacing) and Share; a setup saved in the
   last two weeks and not shared yet is offered at the top ("Share" or "Not now").
   The web shows the free setups too; installing and your own setups need the agent on your PC. docs/spec/setups.md */
"use strict";
const SETUPS_DEMO={game:"iracing",root:"C:\\Users\\you\\Documents\\iRacing\\setups",current:{carPath:"mx5 mx52016",car:"Global Mazda MX-5 Cup",setup:"Laguna race.sto",track:"WeatherTech Raceway Laguna Seca"},cars:[{car:"mx5 mx52016",files:[{key:"mx5 mx52016/Laguna race.sto",name:"Laguna race",changed:new Date(Date.now()-864e5).toISOString(),size:4100,notes:"More rear wing, softer front ARB. Good on old tyres.",tags:["race","stable"],bests:{"WeatherTech Raceway Laguna Seca":82.913}},{key:"mx5 mx52016/Laguna quali.sto",name:"Laguna quali",changed:new Date(Date.now()-2*864e5).toISOString(),size:4100,tags:["quali"],bests:{"WeatherTech Raceway Laguna Seca":82.511},shared:true},{key:"mx5 mx52016/baseline.sto",name:"baseline",changed:new Date(Date.now()-30*864e5).toISOString(),size:4000}]}]};
let SETUPS_DATA=null;
const SETUPS_UI={tab:"car",game:"",car:"",track:"",lib:null,libAt:0,done:{}};
(function(){const st=document.createElement("style");st.textContent=`
#v-setups .su-now{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin:0 0 12px}
#v-setups .su-now .dot{width:8px;height:8px;border-radius:50%;background:var(--good);display:inline-block;margin-right:6px}
#v-setups .su-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
#v-setups .su-list{display:grid;gap:8px}
#v-setups .su-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 16px;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
#v-setups .su-n{font-weight:600;font-size:15px;overflow-wrap:anywhere}
#v-setups .su-m{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px;color:var(--muted);margin-top:2px}
#v-setups .su-m a{color:var(--accent)}
#v-setups .su-act{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
#v-setups .su-done{grid-column:1/-1;font-size:13px;color:var(--good)}
#v-setups .su-offer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 16px;align-items:center;padding:12px 14px;border:1px solid var(--accent);border-radius:8px;margin:0 0 12px}
@media (max-width:560px){#v-setups .su-row,#v-setups .su-offer{grid-template-columns:1fr}#v-setups .su-act{justify-content:flex-start}}`;document.head.appendChild(st)})();
const suT=(en,es,pt)=>Tx(en,es,en,pt);
const suGames=()=>["iracing","lmu"];
const suPC=()=>typeof MODE!=="undefined"&&MODE==="bridge"&&!(typeof COMPANION!=="undefined"&&COMPANION); // the PC app, with the agent
function suGame(){if(!SETUPS_UI.game){const l=typeof liveNow==="function"?liveNow():"";SETUPS_UI.game=suGames().includes(l)?l:(typeof vGame==="function"&&suGames().includes(vGame())?vGame():"iracing")}return SETUPS_UI.game}
const suNorm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const suSameCar=(a,b)=>!!a&&!!b&&suNorm(a)===suNorm(b);
const suSameTrack=(a,b)=>{const x=suNorm(a),y=suNorm(b);return !!x&&!!y&&(x===y||(x.length>2&&y.includes(x))||(y.length>2&&x.includes(y)))};
async function suLibrary(){if(SETUPS_UI.lib&&Date.now()-SETUPS_UI.libAt<10*60e3)return SETUPS_UI.lib;
  try{const u=suPC()?"/api/setups-library":((typeof CP!=="undefined"&&CP.server)||location.origin)+"/setups-library/index.json";const r=await fetch(u);if(!r.ok)throw 0;SETUPS_UI.lib=await r.json();SETUPS_UI.libAt=Date.now()}catch(e){if(!SETUPS_UI.lib)SETUPS_UI.lib={sources:[],setups:[]}}
  return SETUPS_UI.lib}
async function suMine(g){if(MODE==="local")return g==="iracing"?SETUPS_DEMO:{game:g,root:"",cars:[],current:{}};if(!suPC())return null;return await rigGet("/api/setups?game="+g)}
async function suCommunity(g,car){if(MODE==="local")return[];try{const qs=new URLSearchParams({game:g});if(car)qs.set("car",car);const r=await fetch("/api/community/setups?"+qs);const j=await r.json();return r.ok?(j.setups||[]):[]}catch(e){return[]}}
async function renderSetups(){const box=$("#setupsBody");if(!box)return;const g=suGame(),T=suT;
  const pill=$("#setupsPill");if(pill)pill.innerHTML=typeof betaPill==="function"?betaPill():"";
  const fb=$("#setupFolder");fb.hidden=!suPC()||SETUPS_UI.tab!=="mine";fb.textContent=T("Open folder","Abrir carpeta","Abrir pasta");fb.onclick=()=>rigPost("/api/setups",{action:"folder",game:g});
  const [lib,mine]=await Promise.all([suLibrary(),suMine(g)]);SETUPS_DATA=mine;
  const cur=(mine&&mine.current)||{},live=!!cur.carPath;
  const libG=(lib.setups||[]).filter(x=>x.game===g),srcs=Object.fromEntries((lib.sources||[]).map(s=>[s.id,s]));
  // the cars to choose from: the one you drive, then every car with free setups
  const carList=[];const addCar=(k,n)=>{if(k&&!carList.some(c=>suSameCar(c.k,k)))carList.push({k,n:n||k})};
  if(live)addCar(cur.carPath,cur.car);libG.forEach(x=>addCar(x.carPath,x.car));
  if(!SETUPS_UI.car||(live&&SETUPS_UI.autoCar!==cur.carPath)){SETUPS_UI.car=live?cur.carPath:(carList[0]||{}).k||"";SETUPS_UI.autoCar=live?cur.carPath:"";SETUPS_UI.track=""}
  const head=`<div class="seg" role="group" aria-label="${esc(T("Game","Juego","Jogo"))}" style="margin-bottom:12px">${suGames().map(k=>`<button type="button" data-sug="${k}" aria-pressed="${k===g}">${esc(GAME_NAMES[k]||k)}</button>`).join("")}</div>
    ${live?`<div class="su-now"><span><span class="dot"></span><b>${esc(cur.car||cur.carPath)}</b></span><span class="muted">${esc(cur.track||"")}</span></div>`:""}
    <div class="seg" role="group" style="margin-bottom:12px"><button type="button" data-sut="car" aria-pressed="${SETUPS_UI.tab==="car"}">${esc(T("For this car","Para este coche","Para este carro"))}</button><button type="button" data-sut="mine" aria-pressed="${SETUPS_UI.tab==="mine"}">${esc(T("My setups","Mis setups","Meus setups"))}</button></div>`;
  let body="";
  if(SETUPS_UI.tab==="car"){const car=SETUPS_UI.car;
    const comm=await suCommunity(g,g==="iracing"?car:"");
    const rows=[...libG.filter(x=>suSameCar(x.carPath,car)).map(x=>({...x,kind:"lib",src:srcs[x.source]||{}})),
      ...comm.filter(x=>suSameCar(x.carPath,car)).map(x=>({...x,kind:"comm"}))];
    const tracks=[...new Set(rows.map(x=>x.track).filter(Boolean))].sort();
    if(!SETUPS_UI.track&&cur.track){const t=tracks.find(t=>suSameTrack(t,cur.trackFolder||cur.track));if(t)SETUPS_UI.track=t}
    if(SETUPS_UI.track&&!tracks.includes(SETUPS_UI.track))SETUPS_UI.track="";
    const shown=rows.filter(x=>!SETUPS_UI.track||x.track===SETUPS_UI.track).sort((a,b)=>(b.downloads||0)-(a.downloads||0)||String(a.track).localeCompare(b.track)||String(a.name).localeCompare(b.name));
    body=`<div class="su-bar"><select id="suCar" aria-label="${esc(T("Car","Coche","Carro"))}">${carList.map(c=>`<option value="${esc(c.k)}"${suSameCar(c.k,car)?" selected":""}>${esc(c.n)}${live&&suSameCar(c.k,cur.carPath)?" · "+esc(T("now","ahora","agora")):""}</option>`).join("")||`<option value="">–</option>`}</select>
      <select id="suTrack" aria-label="${esc(T("Track","Circuito","Pista"))}"><option value="">${esc(T("All tracks","Todos los circuitos","Todas as pistas"))}</option>${tracks.map(t=>`<option value="${esc(t)}"${t===SETUPS_UI.track?" selected":""}>${esc(t)}</option>`).join("")}</select></div>
      ${shown.length?`<div class="su-list">${shown.map(x=>{const k=x.kind+":"+x.id,done=SETUPS_UI.done[k];
        const by=x.kind==="lib"?`${esc(T("by","de","de"))} ${esc(x.src.credit||"")} · <a href="${esc(((!suPC()&&typeof CP!=="undefined"&&CP.server)?CP.server:"https://pitlanehq.app")+"/setups-library/"+(x.src.licenceFile||""))}" target="_blank" rel="noopener">${esc(x.src.licence||"")}</a>${x.year?" · "+x.year:""}`:`${esc(T("by","de","de"))} ${esc(x.alias||"")} · ${x.downloads||0} ${esc(T("installs","instalaciones","instalações"))}`;
        const btn=x.mine?"":done?`<button type="button" class="btn small" disabled>✓ ${esc(T("Installed","Instalado","Instalado"))}</button>`:`<button type="button" class="btn small primary" data-suin="${esc(k)}">${esc(T("Apply","Aplicar","Aplicar"))}</button>`;
        return `<div class="su-row"><div><div class="su-n">${esc(x.name)} <span class="pill good" style="font-size:10px">${esc(T("Free","Gratis","Grátis"))}</span></div><div class="su-m"><span>${esc(x.track||"")}</span><span>${by}</span></div>${x.notes?`<div class="su-m">${esc(x.notes)}</div>`:""}</div>
          <div class="su-act">${btn}${x.kind==="comm"&&!x.mine&&typeof admDel==="function"?admDel("setups",x.id):""}</div>${done?`<div class="su-done">${esc(done)}</div>`:""}</div>`}).join("")}</div>`
        :`<div class="panel empty">${esc(T("No free setups for this car yet. Share one of yours from My setups.","Aún no hay setups gratis para este coche. Comparte uno tuyo desde Mis setups.","Ainda não há setups grátis para este carro. Compartilhe um seu em Meus setups."))}</div>`}`}
  else if(!mine){body=`<div class="panel empty">${esc(T("Your setups show here when the Pitlane HQ Agent is open on your PC.","Tus setups aparecen aquí con Pitlane HQ Agent abierto en tu PC.","Seus setups aparecem aqui com o Pitlane HQ Agent aberto no seu PC."))}</div>`}
  else if(!mine.root){body=`<div class="panel empty">${esc(g==="lmu"?T("Le Mans Ultimate's setups folder was not found on this PC.","No se encontró la carpeta de setups de Le Mans Ultimate en este PC.","A pasta de setups do Le Mans Ultimate não foi encontrada neste PC."):T("iRacing's setups folder was not found on this PC.","No se encontró la carpeta de setups de iRacing en este PC.","A pasta de setups do iRacing não foi encontrada neste PC."))}</div>`}
  else{const files=(mine.cars||[]).flatMap(c=>c.files.map(f=>({...f,group:c.car})));
    const offer=files.find(f=>!f.shared&&!f.dismissed&&Date.now()-Date.parse(f.changed)<14*864e5);
    body=(offer?`<div class="su-offer"><div><div class="su-n">${esc(T("Share your new setup with other drivers?","¿Compartir tu nuevo setup con otros pilotos?","Compartilhar seu novo setup com outros pilotos?"))}</div><div class="su-m"><span>${esc(offer.name)}</span><span>${esc(offer.group)}</span></div></div>
        <div class="su-act"><button type="button" class="btn small primary" data-sush="${esc(offer.key)}">${esc(T("Share","Compartir","Compartilhar"))}</button><button type="button" class="btn small" data-sudis="${esc(offer.key)}">${esc(T("Not now","Ahora no","Agora não"))}</button></div></div>`:"")+
      (files.length?`<div class="su-list">${files.map(f=>{const bests=Object.entries(f.bests||{});
        return `<div class="su-row"><div><div class="su-n">${esc(f.name)}${(f.tags||[]).map(t=>` <span class="pill" style="font-size:10px">${esc(t)}</span>`).join("")}${f.shared?` <span class="pill good" style="font-size:10px">${esc(T("Shared","Compartido","Compartilhado"))}</span>`:""}</div>
          <div class="su-m"><span>${esc(f.group)}${f.folder?" · "+esc(f.folder):""}</span>${bests.map(([t,v])=>`<span><span class="mono">${fmtT(v)}</span> ${esc(t)}</span>`).join("")}<span>${esc(new Date(f.changed).toLocaleDateString(locale()))}</span></div>${f.notes?`<div class="su-m">${esc(f.notes)}</div>`:""}</div>
          <div class="su-act">${f.shared?"":`<button type="button" class="btn small" data-sush="${esc(f.key)}">${esc(T("Share","Compartir","Compartilhar"))}</button>`}<button type="button" class="btn small" data-sunote="${esc(f.key)}">${esc(T("Notes","Notas","Notas"))}</button>${suPC()?`<button type="button" class="btn small" data-sushow="${esc(f.key)}">${esc(T("Show","Mostrar","Mostrar"))}</button>`:""}</div></div>`}).join("")}</div>`
        :`<div class="panel empty">${esc(T("No setups saved yet.","Aún no hay setups guardados.","Ainda não há setups salvos."))}</div>`)}
  box.innerHTML=(MODE==="local"?`<div class="callout">${esc(T("Demo data","Datos de demostración","Dados de demonstração"))}</div>`:"")+head+body;
  box.querySelectorAll("[data-sug]").forEach(b=>b.onclick=()=>{SETUPS_UI.game=b.dataset.sug;SETUPS_UI.car="";SETUPS_UI.autoCar="";SETUPS_UI.track="";renderSetups()});
  box.querySelectorAll("[data-sut]").forEach(b=>b.onclick=()=>{SETUPS_UI.tab=b.dataset.sut;renderSetups()});
  const sc=$("#suCar");if(sc)sc.onchange=e=>{SETUPS_UI.car=e.target.value;SETUPS_UI.track="";renderSetups()};
  const stk=$("#suTrack");if(stk)stk.onchange=e=>{SETUPS_UI.track=e.target.value;renderSetups()};
  box.querySelectorAll("[data-suin]").forEach(b=>b.onclick=()=>suInstall(b,g));
  box.querySelectorAll("[data-sush]").forEach(b=>b.onclick=()=>openSetupShare(b.dataset.sush));
  box.querySelectorAll("[data-sudis]").forEach(b=>b.onclick=async()=>{if(suPC())await rigPost("/api/setups",{action:"dismiss",key:b.dataset.sudis,game:g});else{const f=(SETUPS_DATA.cars||[]).flatMap(c=>c.files).find(x=>x.key===b.dataset.sudis);if(f)f.dismissed=true}renderSetups()});
  box.querySelectorAll("[data-sunote]").forEach(b=>b.onclick=()=>openSetupNote(b.dataset.sunote));
  box.querySelectorAll("[data-sushow]").forEach(b=>b.onclick=()=>rigPost("/api/setups",{action:"show",key:b.dataset.sushow,game:g}));
  if(typeof wireAdmDel==="function")wireAdmDel(box,renderSetups)}
async function suInstall(b,g){const T=suT,[kind,id]=b.dataset.suin.split(":");
  if(MODE==="local"){toast(T("Demo data, nothing is installed.","Datos de demostración, no se instala nada.","Dados de demonstração, nada é instalado."));return}
  if(!suPC()){toast(T("Open the Pitlane HQ Agent on your PC to apply setups.","Abre Pitlane HQ Agent en tu PC para aplicar setups.","Abra o Pitlane HQ Agent no seu PC para aplicar setups."));return}
  b.disabled=true;b.textContent="…";
  try{const r=await jpost("/api/community/setups",{action:kind==="lib"?"library":"install",id});
    SETUPS_UI.done[b.dataset.suin]=(r.game||g)==="lmu"?T("Copied to the track's setups folder. Pick it in the garage.","Copiado a la carpeta de setups del circuito. Elígelo en el garaje.","Copiado para a pasta de setups da pista. Escolha-o na garagem."):T("Copied to the car's setups folder. Pick it in the garage and press Load.","Copiado a la carpeta de setups del coche. Elígelo en el garaje y pulsa Load.","Copiado para a pasta de setups do carro. Escolha-o na garagem e aperte Load.");
    renderSetups()}catch(e){toast(e.message);b.disabled=false;b.textContent=T("Apply","Aplicar","Aplicar")}}
function openSetupNote(key){const T=suT,f=((SETUPS_DATA||{}).cars||[]).flatMap(c=>c.files).find(x=>x.key===key);if(!f)return;LAYOUT_VIEW=null;$("#dTitle").textContent=f.name;$("#dSub").textContent="";
  $("#dBody").innerHTML=`<form class="form" id="snForm"><label><span class="label">${esc(T("Notes","Notas","Notas"))}</span><textarea id="snNotes" rows="6" maxlength="4000" style="width:100%;font:14px var(--f-body);background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:4px;padding:8px">${esc(f.notes||"")}</textarea></label>
    <label><span class="label">${esc(T("Tags, separated by commas","Etiquetas, separadas por comas","Etiquetas, separadas por vírgulas"))}</span><input type="text" id="snTags" value="${esc((f.tags||[]).join(", "))}" placeholder="race, quali, wet"></label><div><button class="btn primary" type="submit">${esc(T("Save","Guardar","Salvar"))}</button></div></form>`;
  $("#snForm").onsubmit=async e=>{e.preventDefault();const notes=$("#snNotes").value,tags=$("#snTags").value.split(",").map(x=>x.trim()).filter(Boolean);
    if(MODE==="local"){f.notes=notes;f.tags=tags;closeDrawer();renderSetups();return}if(await rigPost("/api/setups",{action:"note",key,notes,tags,game:suGame()})){closeDrawer();renderSetups()}};
  $("#drawer").hidden=false}
function openSetupShare(key){const T=suT,g=suGame(),f=((SETUPS_DATA||{}).cars||[]).flatMap(c=>c.files).find(x=>x.key===key);if(!f)return;LAYOUT_VIEW=null;$("#dTitle").textContent=T("Share setup","Compartir setup","Compartilhar setup");$("#dSub").textContent=f.name;
  const cur=(SETUPS_DATA&&SETUPS_DATA.current)||{},tracks=[...new Set([...Object.keys(f.bests||{}),cur.track].filter(Boolean))];
  $("#dBody").innerHTML=`<form class="me-form" id="ssForm"><label><span class="label">${esc(T("Name","Nombre","Nome"))}</span><input type="text" id="ssN" maxlength="60" value="${esc(f.name)}"></label>
    ${g==="lmu"?"":`<label><span class="label">${esc(T("Track","Circuito","Pista"))}</span><input type="text" id="ssT" maxlength="80" value="${esc(tracks[0]||"")}" list="ssTl"><datalist id="ssTl">${tracks.map(t=>`<option value="${esc(t)}">`).join("")}</datalist></label>`}
    <label><span class="label">${esc(T("Notes for other drivers","Notas para otros pilotos","Notas para outros pilotos"))}</span><textarea id="ssNo" rows="4" maxlength="1000" style="width:100%;font:14px var(--f-body);background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:4px;padding:8px">${esc(f.notes||"")}</textarea></label>
    <p class="note" style="margin:0">${esc(T("It is shared for free under your public name. You can remove it at any time.","Se comparte gratis con tu nombre público. Puedes quitarlo cuando quieras.","É compartilhado de graça com seu nome público. Você pode removê-lo quando quiser."))}</p>
    <button class="btn primary" type="submit">${esc(T("Share","Compartir","Compartilhar"))}</button></form>`;
  $("#drawer").hidden=false;$("#ssForm").onsubmit=async e=>{e.preventDefault();if(MODE==="local"){f.shared=true;toast(T("Demo data, nothing is sent.","Datos de demostración, no se envía nada.","Dados de demonstração, nada é enviado."));closeDrawer();renderSetups();return}
    try{const t=$("#ssT");const r=await jpost("/api/community/setups",{action:"share",game:g,key,name:$("#ssN").value,track:t?t.value:"",notes:$("#ssNo").value});toast(r.kept?T("Already shared","Ya estaba compartido","Já estava compartilhado"):T("Shared, thank you!","¡Compartido, gracias!","Compartilhado, obrigado!"));closeDrawer();renderSetups()}catch(x){toast(x.message)}}}
