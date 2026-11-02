const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DEFAULT_DATA_URL = "data.json";
let initialData = null;
const lang = () => (state.preferences && state.preferences.language) || "pt";
const langInfo = () => LANGS[lang()] || LANGS.pt;
function t(s) { const l = lang(); return (l === "pt" || !s) ? s : ((I18N[l] && I18N[l][s]) || s); }
function tf(s, vars) { let r = t(s); for (const k in vars) r = r.split("{" + k + "}").join(vars[k]); return r; }
let state = {
  people: [], preferences: {fontSize:"normal",highContrast:false,switchScan:false,switchScanInterval:2,speechRate:1,voiceURI:"",dayPeriod:"any",language:"pt"},
  customItems: [], selectedPersonId:null, currentCategory:null, currentItem:null, currentMessage:"",
  painRegions:[], painLevel:"", discomfort:"", bodyView:"front", alarmActive:false, alarmTimer:null, audioContext:null, wakeLock:null
};
let switchScanTimer=null;
const regionLabels = {head:"Cabeça",eyes:"Olhos",ears:"Ouvidos",mouth:"Boca e dentes",throat:"Garganta",neck:"Pescoço",chest:"Peito",belly:"Barriga",back:"Costas",arms:"Braços",elbows:"Cotovelos",hands:"Mãos",legs:"Pernas",knees:"Joelhos",feet:"Pés"};
const bodyShapes = {
 front: [
  ["head","ellipse",150,38,30,35],["eyes","rect",132,48,36,8],["ears","rect",115,54,9,17],["ears","rect",176,54,9,17],
  ["mouth","rect",139,66,22,8],["throat","rect",140,77,20,18],["neck","rect",137,83,26,20],
  ["chest","path","M120 105 Q150 92 180 105 L190 155 L110 155 Z"],["belly","path","M112 155 L188 155 L178 207 L122 207 Z"],
  ["arms","path","M119 109 L100 116 L76 185 L91 191 L123 137 Z"],["arms","path","M181 109 L200 116 L224 185 L209 191 L177 137 Z"],
  ["elbows","circle",91,155,10],["elbows","circle",209,155,10],["hands","path","M75 184 L88 190 L83 216 L73 220 L68 210 Z"],["hands","path","M225 184 L212 190 L217 216 L227 220 L232 210 Z"],
  ["legs","path","M123 204 L149 204 L145 290 L127 290 Z"],["legs","path","M151 204 L177 204 L173 290 L155 290 Z"],
  ["knees","ellipse",136,247,12,13],["knees","ellipse",164,247,12,13],["feet","path","M127 286 L145 286 L148 310 L112 310 Q110 300 127 286 Z"],["feet","path","M155 286 L173 286 L188 300 Q190 310 154 310 Z"]
 ],
 back: [
  ["head","ellipse",150,38,30,35],["ears","rect",115,54,9,17],["ears","rect",176,54,9,17],["neck","rect",137,83,26,20],
  ["back","path","M120 105 Q150 92 180 105 L190 158 L110 158 Z"],["back","path","M112 158 L188 158 L178 207 L122 207 Z"],
  ["arms","path","M119 109 L100 116 L76 185 L91 191 L123 137 Z"],["arms","path","M181 109 L200 116 L224 185 L209 191 L177 137 Z"],
  ["elbows","circle",91,155,10],["elbows","circle",209,155,10],["hands","path","M75 184 L88 190 L83 216 L73 220 L68 210 Z"],["hands","path","M225 184 L212 190 L217 216 L227 220 L232 210 Z"],
  ["legs","path","M123 204 L149 204 L145 290 L127 290 Z"],["legs","path","M151 204 L177 204 L173 290 L155 290 Z"],["knees","ellipse",136,247,12,13],["knees","ellipse",164,247,12,13],["feet","path","M127 286 L145 286 L148 310 L112 310 Q110 300 127 286 Z"],["feet","path","M155 286 L173 286 L188 300 Q190 310 154 310 Z"]
 ]
};
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),2600)}
function readSaved(){try{const saved=JSON.parse(localStorage.getItem("comunicavida-state")||"{}");state.people=Array.isArray(saved.people)?saved.people:[];state.preferences={...state.preferences,...(saved.preferences||{})};state.customItems=Array.isArray(saved.customItems)?saved.customItems:[]}catch(e){showToast(t("Não foi possível ler os dados salvos. Os dados iniciais serão usados."))}}
function saveState(){try{localStorage.setItem("comunicavida-state",JSON.stringify({people:state.people,preferences:state.preferences,customItems:state.customItems}));return true}catch(e){showToast(t("Não foi possível salvar. O armazenamento pode estar cheio."));return false}}
function setScreen(name){stopSpeech();$$(".screen").forEach(s=>s.classList.remove("active"));const target=$("#"+name+"Screen");if(target)target.classList.add("active");if(name==="people")renderPeople();if(name==="settings")syncSettings();if(name==="help")renderHelpContacts();updateSwitchScan();window.scrollTo({top:0,behavior:"smooth"})}
function updateSwitchScan(){
  clearInterval(switchScanTimer);switchScanTimer=null;
  if(!state.preferences.switchScan)return;
  let index=-1;
  const advance=()=>{
    const targets=$$("#settingsButton, .screen.active button:not(:disabled), .screen.active input:not(:disabled), .screen.active select:not(:disabled), .screen.active [tabindex='0']").filter(el=>el.getClientRects().length&&el.getAttribute("aria-hidden")!=="true");
    if(!targets.length)return;
    index=(index+1)%targets.length;targets[index].focus({preventScroll:true});
  };
  advance();switchScanTimer=setInterval(advance,(Number(state.preferences.switchScanInterval)||2)*1000);
}
function setMessage(message, speak=false){state.currentMessage=message;$("#currentMessage").textContent=message;$("#messageBar").classList.remove("hidden");if(speak)speakText(message)}
let voiceWarnedFor="";
const normLang=l=>String(l||"").toLowerCase().replace("_","-");
function voicesForLang(){if(!("speechSynthesis" in window))return [];const p=langInfo().prefix;return window.speechSynthesis.getVoices().filter(v=>normLang(v.lang).startsWith(p))}
function pickVoice(){const list=voicesForLang(),sp=normLang(langInfo().speech);return list.find(v=>v.voiceURI===state.preferences.voiceURI)||list.find(v=>normLang(v.lang)===sp)||list[0]||null}
function speakText(message){
  if(!message)return;
  if(!("speechSynthesis" in window)){showToast(t("A voz não funciona neste navegador. Abra o app no Chrome ou no Safari."));return}
  const synth=window.speechSynthesis;
  const utterance=new SpeechSynthesisUtterance(message);
  utterance.lang=langInfo().speech;utterance.volume=1;utterance.rate=Number(state.preferences.speechRate)||1;
  const voice=pickVoice();
  if(voice){try{utterance.voice=voice}catch(e){}}
  else if(synth.getVoices().length&&voiceWarnedFor!==lang()){voiceWarnedFor=lang();showToast(tf("Este aparelho não tem voz em {lang}. Instale uma em Configurações do aparelho > Texto para fala.",{lang:langInfo().voiceName}))}
  utterance.onerror=e=>{if(e.error!=="canceled"&&e.error!=="interrupted")showToast(t("Não foi possível reproduzir a voz."))};
  // o Chrome pode descartar o objeto antes de terminar de falar; guardar uma referência evita isso
  window.__comunicaUtterance=utterance;
  // cancel() seguido de speak() no mesmo instante faz o Chrome/Android engolir a fala; por isso o pequeno atraso
  if(synth.speaking||synth.pending){synth.cancel();setTimeout(()=>{synth.resume();synth.speak(utterance)},120)}
  else{synth.resume();synth.speak(utterance)}
}
function stopSpeech(){if("speechSynthesis" in window)window.speechSynthesis.cancel()}
function allCategories(){return (initialData?.categories||[]).map(c=>({...c,items:[...c.items,...state.customItems.filter(i=>i.categoryId===c.id)]}))}
function categoryEmoji(id){return ({food:"🍽️",drinks:"🥤",activities:"📺",needs:"🛏️",other:"💬"})[id]||"💬"}
function itemEmoji(item){const id=item.id||"";if(id.includes("coffee"))return "☕";if(id==="water")return "💧";if(id==="juice")return "🧃";if(id.includes("drink"))return "🥤";if(id==="tv")return "📺";if(id==="music")return "🎵";if(id==="bathroom")return "🚽";if(id==="bedroom")return "🛏️";if(id==="position")return "🔄";if(id==="meal")return "🍲";if(item.type==="food")return "🍴";if(item.type==="coldDrink")return "🥤";return "💬"}
function adjustmentEmoji(text,item){const t=text.toLowerCase();const map=[["não gostei","👎"],["terminei","✅"],["está bom","👍"],["devagar","🐢"],["quente","🔥"],["gelado","❄️"],["frio","❄️"],["sem gelo","🚫"],["gelo","🧊"],["sal","🧂"],["açúcar","🍬"],["leite","🥛"],["menor","🔸"],["pedaços","✂️"],["mais","➕"],["menos","➖"]];const hit=map.find(([k])=>t.includes(k));return hit?hit[1]:itemEmoji(item)}
const discomfortEmoji={"coceira":"🖐️","enjoo":"🤢","frio":"🥶","calor":"🥵","cansado":"😴","incomodado":"😖","ajuda":"🆘"};
const painEmoji={pouco:"🙂",moderadamente:"😣",muito:"😭",piorando:"📈",melhorou:"📉",incerto:"❓"};
const personActionEmoji={"call-now":"📞","later":"🕐","come":"🏃","company":"🤝","help":"🆘","miss":"💛"};
function setAccent(id){["#itemsScreen","#adjustmentScreen"].forEach(sel=>{const el=$(sel);el.className=el.className.replace(/\bcat-\S+/g,"").trim();el.classList.add("cat-"+id)})}
function renderCategories(){const grid=$("#categoryGrid");grid.innerHTML="";allCategories().forEach(cat=>{const b=document.createElement("button");b.className="category-button cat-"+cat.id;b.innerHTML=`<span class="pict" aria-hidden="true">${categoryEmoji(cat.id)}</span><strong>${escapeHTML(t(cat.name))}</strong><small>${escapeHTML(t(cat.description||""))}</small>`;b.addEventListener("click",()=>selectCategory(cat.id));grid.appendChild(b)})}
function selectCategory(id){state.currentCategory=id;state.currentItem=null;renderItems();$("#messageBar").classList.add("hidden");setAccent(id);setScreen("items");const cat=allCategories().find(c=>c.id===id);speakText(t(cat.name))}
function renderItems(){const cat=allCategories().find(c=>c.id===state.currentCategory);if(!cat)return;$("#itemsTitle").textContent=t(cat.name);const grid=$("#itemGrid");grid.innerHTML="";cat.items.forEach(item=>{const b=document.createElement("button");b.className="item-button cat-"+cat.id;b.innerHTML=`<span class="pict" aria-hidden="true">${itemEmoji(item)}</span><strong>${escapeHTML(t(item.name))}</strong>`;b.addEventListener("click",()=>selectItem(item));grid.appendChild(b)})}
function selectItem(item){state.currentItem=item;$("#messageBar").classList.add("hidden");renderAdjustments();setScreen("adjustment");speakText(t(item.phrase||item.name))}
function renderAdjustments(){const item=state.currentItem;if(!item)return;$("#adjustmentTitle").textContent=t(item.name)+": "+t("como você quer?");const grid=$("#adjustmentGrid");grid.innerHTML="";(item.adjustments||["Quero mais","Quero menos","Está bom","Terminei"]).forEach(adjustment=>{const b=document.createElement("button");b.className="adjustment-button";const img=document.createElement("span");img.className="adjustment-image";img.setAttribute("aria-hidden","true");img.textContent=adjustmentEmoji(adjustment,item);b.appendChild(img);const label=document.createElement("span");label.textContent=t(adjustment);b.appendChild(label);b.addEventListener("click",()=>setMessage(`${t(adjustment)}.`,true));grid.appendChild(b)})}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderBody(){const svgNS="http://www.w3.org/2000/svg";const svg=document.createElementNS(svgNS,"svg");svg.setAttribute("viewBox","0 -14 300 344");svg.setAttribute("role","group");svg.setAttribute("aria-label",t(state.bodyView==="front"?"Corpo humano, vista frontal":"Corpo humano, vista traseira"));const title=document.createElementNS(svgNS,"text");title.setAttribute("x","150");title.setAttribute("y","326");title.setAttribute("text-anchor","middle");title.setAttribute("font-size","10");title.setAttribute("fill","currentColor");title.textContent=t(state.bodyView==="front"?"VISTA FRONTAL":"VISTA TRASEIRA");svg.appendChild(title);
bodyShapes[state.bodyView].forEach(shape=>{const [region,type,...args]=shape;const el=document.createElementNS(svgNS,type);if(type==="path")el.setAttribute("d",args[0]);else if(type==="ellipse"){el.setAttribute("cx",args[0]);el.setAttribute("cy",args[1]);el.setAttribute("rx",args[2]);el.setAttribute("ry",args[3])}else if(type==="circle"){el.setAttribute("cx",args[0]);el.setAttribute("cy",args[1]);el.setAttribute("r",args[2])}else{el.setAttribute("x",args[0]);el.setAttribute("y",args[1]);el.setAttribute("width",args[2]);el.setAttribute("height",args[3])}
el.classList.add("body-part");if(state.painRegions.includes(region))el.classList.add("selected");el.setAttribute("aria-hidden","true");el.setAttribute("pointer-events","none");svg.appendChild(el);
const hit=el.cloneNode();hit.classList.remove("body-part");hit.classList.add("body-hit");hit.removeAttribute("aria-hidden");hit.removeAttribute("pointer-events");hit.dataset.region=region;hit.setAttribute("fill","transparent");hit.setAttribute("stroke","transparent");hit.setAttribute("stroke-width","24");hit.setAttribute("tabindex","0");hit.setAttribute("role","button");hit.setAttribute("aria-label",t(regionLabels[region]));hit.setAttribute("aria-pressed",state.painRegions.includes(region)?"true":"false");hit.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();toggleRegion(region)}});svg.appendChild(hit)});
svg.addEventListener("click",event=>{
  const hitPadding=12;
  const targets=$$(".body-hit",svg).filter(hit=>{const rect=hit.getBoundingClientRect();return event.clientX>=rect.left-hitPadding&&event.clientX<=rect.right+hitPadding&&event.clientY>=rect.top-hitPadding&&event.clientY<=rect.bottom+hitPadding});
  if(!targets.length)return;
  const target=targets.reduce((smallest,hit)=>{const a=hit.getBoundingClientRect(),b=smallest.getBoundingClientRect();return a.width*a.height<b.width*b.height?hit:smallest});
  event.preventDefault();event.stopPropagation();toggleRegion(target.dataset.region);
},true);
const label=document.createElementNS(svgNS,"text");label.setAttribute("x","150");label.setAttribute("y","-2");label.setAttribute("text-anchor","middle");label.setAttribute("font-size","11");label.setAttribute("font-weight","700");label.setAttribute("fill","currentColor");label.textContent=t("Toque em uma região");svg.appendChild(label);$("#bodyMap").replaceChildren(svg)}
function toggleRegion(region){if(state.painRegions.includes(region))state.painRegions=state.painRegions.filter(r=>r!==region);else state.painRegions.push(region);renderBody();renderSelectedRegions();updatePainMessage()}
function renderSelectedRegions(){const container=$("#selectedRegions");container.innerHTML="";if(!state.painRegions.length){container.innerHTML='<span class="muted">'+t("Nenhuma região selecionada.")+'</span>';return}state.painRegions.forEach(r=>{const b=document.createElement("button");b.className="region-chip";b.textContent=t(regionLabels[r])+" ×";b.title=t("Remover")+" "+t(regionLabels[r]);b.addEventListener("click",()=>toggleRegion(r));container.appendChild(b)})}
function updatePainMessage(){const l=lang();const regions=state.painRegions.map(r=>t(regionLabels[r]).toLowerCase());let message="";
if(state.discomfort)message=t(state.discomfort);
else if(l!=="pt"&&PAIN[l]){const P=PAIN[l];if(regions.length)message=P.sentence(P.level[state.painLevel]||"",P.levelAfterNoun.includes(state.painLevel),regions);else if(state.painLevel)message=P.only[state.painLevel]}
else if(regions.length){const place=regions.length===1?regions[0]:regions.slice(0,-1).join(", ")+" e "+regions.at(-1);message="Estou com dor "+(state.painLevel==="pouco"?"leve":state.painLevel==="moderadamente"?"moderada":state.painLevel==="muito"?"forte":state.painLevel==="piorando"?"que está piorando":state.painLevel==="melhorou"?"que melhorou":"")+" "+(state.painLevel==="incerto"?"na região de ":"na região de ")+place+"."}
else if(state.painLevel)message=({"pouco":"Estou com um pouco de dor.","moderadamente":"Estou com dor moderada.","muito":"Estou com muita dor.","piorando":"A dor está piorando.","melhorou":"A dor melhorou.","incerto":"Não sei explicar como me sinto."})[state.painLevel];
state.painEmpty=!message;$("#painMessage").textContent=message||t("Selecione uma região e uma opção para montar a mensagem.")}
function renderDiscomforts(){const grid=$("#discomfortGrid");grid.innerHTML="";initialData.discomforts.forEach(text=>{const b=document.createElement("button");const img=document.createElement("span");img.textContent=Object.entries(discomfortEmoji).find(([k])=>text.toLowerCase().includes(k))?.[1]||"😖";img.setAttribute("aria-hidden","true");img.className="mini-option-image";b.appendChild(img);const label=document.createElement("span");label.textContent=t(text);b.appendChild(label);if(state.discomfort===text)b.classList.add("selected");b.addEventListener("click",()=>{state.discomfort=text;updatePainMessage();$$('#discomfortGrid button').forEach(x=>x.classList.toggle("selected",x===b))});grid.appendChild(b)})}
function renderPeople(){const grid=$("#peopleGrid");grid.innerHTML="";if(!state.people.length)grid.innerHTML='<p class="helper">'+t("Ainda não há pessoas cadastradas. Você pode adicionar alguém importante.")+'</p>';state.people.forEach(person=>{const b=document.createElement("button");b.className="person-card";b.innerHTML=`<span class="person-avatar">${person.photo?`<img alt="" src="${person.photo}">`:escapeHTML((person.nickname||person.name||"?").trim().charAt(0).toUpperCase())}</span><strong>${escapeHTML(person.nickname||person.name)}</strong><small>${escapeHTML(person.relation||t("Pessoa importante"))}</small>`;b.addEventListener("click",()=>selectPerson(person.id));grid.appendChild(b)});if(state.selectedPersonId&&state.people.some(p=>p.id===state.selectedPersonId))selectPerson(state.selectedPersonId);else $("#personDetails").classList.add("hidden")}
function renderHelpContacts(){const container=$("#helpContacts");container.replaceChildren();const contacts=state.people.filter(person=>typeof person.phone==="string"&&/\d{5,}/.test(person.phone)&&/^[-+0-9() .]{5,24}$/.test(person.phone));if(!contacts.length){const note=document.createElement("p");note.className="helper";note.textContent=t("Cadastre um telefone em uma pessoa para ligar pelo aparelho.");container.appendChild(note);return}contacts.forEach(person=>{const button=document.createElement("button");button.className="secondary-button";button.textContent=`${t("Ligar para")} ${person.nickname||person.name}`;button.addEventListener("click",()=>{const number=person.phone.replace(/[^0-9+]/g,"").replace(/(?!^)\+/g,"");window.location.href=`tel:${number}`});container.appendChild(button)})}
function selectPerson(id){state.selectedPersonId=id;const p=state.people.find(x=>x.id===id);if(!p)return;$("#personDetails").classList.remove("hidden");$("#personName").textContent=p.nickname||p.name;$("#personRelation").textContent=[p.name,p.relation].filter(Boolean).join(" · ");const actions=$("#personActions");actions.innerHTML="";initialData.personActions.forEach(a=>{const b=document.createElement("button");b.className="person-action-option";const img=document.createElement("span");img.textContent=personActionEmoji[a.id]||"💬";img.setAttribute("aria-hidden","true");img.className="adjustment-image";b.appendChild(img);const label=document.createElement("span");label.textContent=t(a.label);b.appendChild(label);b.addEventListener("click",()=>{const person=p.nickname||p.name;const phrase=t(a.template).replaceAll("{person}",person);setMessage(phrase,true);showToast(t("Mensagem exibida e falada, se a voz estiver disponível. Nenhuma chamada foi feita."))});actions.appendChild(b)});const extra=$("#customPhrases");extra.innerHTML='<h3>'+t("Gerenciar cadastro")+'</h3><div class="person-edit-actions"><button id="editPerson" class="secondary-button">'+t("Editar")+'</button><button id="deletePerson" class="danger-button">'+t("Excluir")+'</button></div>';$("#editPerson").onclick=()=>openPersonForm(p);$("#deletePerson").onclick=()=>{if(confirm(tf("Excluir o cadastro de {name}?",{name:p.name}))){const previousPeople=state.people,previousSelectedPersonId=state.selectedPersonId;state.people=state.people.filter(x=>x.id!==id);state.selectedPersonId=null;if(!saveState()){state.people=previousPeople;state.selectedPersonId=previousSelectedPersonId;return}renderPeople();showToast(t("Cadastro excluído."))}}}
function openPersonForm(person=null){const panel=$("#personFormPanel"),form=$("#personForm");form.reset();$("#personFormTitle").textContent=t(person?"Editar pessoa":"Cadastrar pessoa");form.dataset.editId=person?.id||"";if(person){form.elements.name.value=person.name||"";form.elements.relation.value=person.relation||"";form.elements.nickname.value=person.nickname||"";form.elements.phone.value=person.phone||""}panel.classList.remove("hidden");panel.scrollIntoView({behavior:"smooth",block:"start"})}
function bindPersonForm(){
  $("#personForm").addEventListener("submit",async e=>{
    e.preventDefault();const form=e.currentTarget;const id=form.dataset.editId;const existing=state.people.find(p=>p.id===id);const file=form.elements.photo.files[0];let photo=existing?.photo||"";
    try{
      if(file){
        if(file.size>2*1024*1024||!file.type.startsWith("image/")){showToast(t("Escolha uma imagem válida de até 2 MB."));return}
        photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Leitura inválida"));reader.onerror=()=>reject(reader.error||new Error("Falha ao ler imagem"));reader.onabort=()=>reject(new Error("Leitura cancelada"));reader.readAsDataURL(file)});
      }
      const phone=form.elements.phone.value.trim();
      if(phone&&!/^[-+0-9() .]{5,24}$/.test(phone)){showToast(t("Confira o número de telefone."));return}
      const previousPeople=state.people,previousSelectedPersonId=state.selectedPersonId;
      const person={id:id||crypto.randomUUID(),name:form.elements.name.value.trim(),relation:form.elements.relation.value.trim(),nickname:form.elements.nickname.value.trim(),phone,photo};
      if(id)state.people=state.people.map(p=>p.id===id?person:p);else state.people.push(person);state.selectedPersonId=person.id;
      if(!saveState()){state.people=previousPeople;state.selectedPersonId=previousSelectedPersonId;return}
      $("#personFormPanel").classList.add("hidden");renderPeople();renderHelpContacts();showToast(t("Pessoa salva neste dispositivo."));
    }catch(error){showToast(t("Não foi possível ler a fotografia. Tente outro arquivo."))}
  });
}
function renderAlarmText(){const on=state.alarmActive;$("#alarmCard").classList.toggle("active",on);$("#alarmStatus").textContent=t(on?"ALARME ATIVADO":"ALARME DESATIVADO");$("#alarmDescription").textContent=t(on?"O alerta sonoro está ativo neste dispositivo. Toque novamente para interromper.":(state.alarmStopped?"O alerta foi interrompido. Toque para ativá-lo novamente.":"Toque no botão para reproduzir um alerta sonoro neste dispositivo."));$("#alarmToggle").textContent=t(on?"INTERROMPER ALARME":"ATIVAR ALARME");$("#alarmToggle").setAttribute("aria-pressed",on?"true":"false")}
async function keepScreenAwake(){if(!navigator.wakeLock||state.wakeLock||document.visibilityState!=="visible")return;try{state.wakeLock=await navigator.wakeLock.request("screen");state.wakeLock.addEventListener("release",()=>{state.wakeLock=null},{once:true})}catch(e){state.wakeLock=null}}
async function releaseScreenWakeLock(){const lock=state.wakeLock;state.wakeLock=null;if(lock&&!lock.released){try{await lock.release()}catch(e){}}}
document.addEventListener("visibilitychange",()=>{if(state.alarmActive&&document.visibilityState==="visible")keepScreenAwake()});
function alarmStart(){if(state.alarmActive)return;state.alarmActive=true;renderAlarmText();keepScreenAwake();alarmBeep();state.alarmTimer=setInterval(alarmBeep,1300);speakText(t("Preciso de ajuda agora"));}
function alarmBeep(){if(!state.alarmActive)return;try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx){showToast(t("O áudio não está disponível neste navegador."));return}if(!state.audioContext||state.audioContext.state==="closed")state.audioContext=new Ctx();const ctx=state.audioContext;if(ctx.state==="suspended")ctx.resume().catch(()=>showToast(t("Não foi possível iniciar o som. Verifique as permissões de áudio.")));const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type="sine";osc.frequency.value=880;gain.gain.setValueAtTime(.001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.22,ctx.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.42);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.44)}catch(e){showToast(t("Não foi possível iniciar o som. Verifique as permissões de áudio."))}}
function alarmStop(){state.alarmActive=false;state.alarmStopped=true;clearInterval(state.alarmTimer);state.alarmTimer=null;releaseScreenWakeLock();stopSpeech();renderAlarmText()}
function populateVoices(){if(!("speechSynthesis" in window))return;const select=$("#voiceSelect");const current=state.preferences.voiceURI;select.innerHTML="";const def=document.createElement("option");def.value="";def.textContent=t("Voz padrão do dispositivo");select.appendChild(def);const all=window.speechSynthesis.getVoices(),mine=voicesForLang();(mine.length?mine:all).forEach(v=>{const o=document.createElement("option");o.value=v.voiceURI;o.textContent=`${v.name} (${v.lang})`;select.appendChild(o)});select.value=current}
function syncSettings(){ $("#language").value=lang();$("#fontSize").value=state.preferences.fontSize;$("#highContrast").checked=!!state.preferences.highContrast;$("#switchScan").checked=!!state.preferences.switchScan;$("#switchScanInterval").value=String(state.preferences.switchScanInterval||2);$("#speechRate").value=state.preferences.speechRate;$("#dayPeriod").value=state.preferences.dayPeriod;populateVoices();const select=$("#customCategory");select.innerHTML="";allCategories().forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=t(c.name);select.appendChild(o)})}
function applyPreferences(){document.documentElement.classList.toggle("font-large",state.preferences.fontSize==="large");document.documentElement.classList.toggle("font-xlarge",state.preferences.fontSize==="xlarge");document.documentElement.classList.toggle("high-contrast",!!state.preferences.highContrast)}
const isRecord=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
function validateBackup(data){
  const validText=(value,max,required=false)=>typeof value==="string"&&value.length<=max&&(!required||value.trim().length>0);
  if(!isRecord(data)||data.version!==1||!Array.isArray(data.people)||data.people.length>500||!Array.isArray(data.customItems)||data.customItems.length>500||!isRecord(data.preferences))return false;
  if(!data.people.every(person=>isRecord(person)&&validText(person.id,100,true)&&validText(person.name,60,true)&&validText(person.relation,50)&&validText(person.nickname,50)&&(person.phone===undefined||(validText(person.phone,24)&&(!person.phone||(/^[-+0-9() .]{5,24}$/.test(person.phone)&&/\d{5,}/.test(person.phone)))))&&validText(person.photo,3_200_000)&&(!person.photo||/^data:image\/(?:png|jpeg|webp|gif);base64,/.test(person.photo))))return false;
  if(!data.customItems.every(item=>isRecord(item)&&validText(item.id,100,true)&&validText(item.categoryId,50,true)&&validText(item.name,60,true)&&validText(item.phrase,140,true)&&validText(item.type,40,true)&&Array.isArray(item.adjustments)&&item.adjustments.length<=100&&item.adjustments.every(value=>validText(value,140,true))))return false;
  const preferences=data.preferences;
  return Object.entries(preferences).every(([key,value])=>{
    if(key==="fontSize")return ["normal","large","xlarge"].includes(value);
    if(key==="highContrast")return typeof value==="boolean";
    if(key==="switchScan")return typeof value==="boolean";
    if(key==="switchScanInterval")return [1,2,3].includes(value);
    if(key==="speechRate")return typeof value==="number"&&Number.isFinite(value)&&value>=0.6&&value<=1.4;
    if(key==="voiceURI")return validText(value,512);
    if(key==="dayPeriod")return ["any","morning","afternoon","evening"].includes(value);
    if(key==="language")return ["pt","en","es"].includes(value);
    return false;
  });
}
function downloadJSON(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
function bindSettings(){
  $("#language").addEventListener("change",e=>setLanguage(e.target.value));
  $("#fontSize").addEventListener("change",e=>{const previous=state.preferences.fontSize;state.preferences.fontSize=e.target.value;applyPreferences();if(!saveState()){state.preferences.fontSize=previous;applyPreferences();syncSettings()}});
  $("#highContrast").addEventListener("change",e=>{const previous=state.preferences.highContrast;state.preferences.highContrast=e.target.checked;applyPreferences();if(!saveState()){state.preferences.highContrast=previous;applyPreferences();syncSettings()}});
  $("#switchScan").addEventListener("change",e=>{const previous=state.preferences.switchScan;state.preferences.switchScan=e.target.checked;if(!saveState()){state.preferences.switchScan=previous;syncSettings();return}updateSwitchScan()});
  $("#switchScanInterval").addEventListener("change",e=>{const previous=state.preferences.switchScanInterval;state.preferences.switchScanInterval=Number(e.target.value);if(!saveState()){state.preferences.switchScanInterval=previous;syncSettings();return}updateSwitchScan()});
  $("#speechRate").addEventListener("input",e=>{const previous=state.preferences.speechRate;state.preferences.speechRate=Number(e.target.value);if(!saveState()){state.preferences.speechRate=previous;syncSettings()}});
  $("#voiceSelect").addEventListener("change",e=>{const previous=state.preferences.voiceURI;state.preferences.voiceURI=e.target.value;if(!saveState()){state.preferences.voiceURI=previous;syncSettings()}});
  $("#testVoice").addEventListener("click",()=>speakText(t("Olá. Esta é a voz do COMUNIQUE-SE.")));
  $("#protectStorage").addEventListener("click",async()=>{
    const status=$("#storageStatus");
    if(!navigator.storage?.persist){status.textContent=t("Este navegador não oferece armazenamento persistente.");return}
    try{
      const granted=await navigator.storage.persist();
      status.textContent=t(granted?"O navegador tentará preservar os dados contra remoção automática; apagar os dados do site ainda os remove.":"O navegador não concedeu armazenamento persistente. Exporte backups regularmente.");
    }catch(error){status.textContent=t("Não foi possível solicitar armazenamento persistente.")}
  });
  $("#exportData").addEventListener("click",()=>downloadJSON("comunique-se-backup.json",{version:1,people:state.people,preferences:state.preferences,customItems:state.customItems}));
  $("#importData").addEventListener("change",async e=>{
    const file=e.target.files[0];
    if(!file)return;
    try{
      if(file.size>20*1024*1024)throw new Error("Arquivo muito grande");
      const parsed=JSON.parse(await file.text());
      if(!validateBackup(parsed))throw new Error("Estrutura inválida");
      if(!confirm(t("Importar este backup substituirá pessoas, itens personalizados e preferências atuais. Continuar?")))return;
      const previousPeople=state.people,previousCustomItems=state.customItems,previousPreferences=state.preferences;
      state.people=parsed.people;
      state.customItems=parsed.customItems;
      state.preferences={...state.preferences,...parsed.preferences};
      if(!saveState()){state.people=previousPeople;state.customItems=previousCustomItems;state.preferences=previousPreferences;e.target.value="";return}
      applyPreferences();applyLanguage();showToast(t("Backup importado com sucesso."));
    }catch(err){showToast(t("Arquivo JSON inválido ou incompatível. Seus dados atuais foram mantidos."))}
    e.target.value="";
  });
  $("#resetData").addEventListener("click",()=>{if(confirm(t("Restaurar dados iniciais? Os cadastros e itens personalizados salvos serão apagados."))){const previousPeople=state.people,previousCustomItems=state.customItems,previousPreferences=state.preferences;state.people=[];state.customItems=[];state.preferences={fontSize:"normal",highContrast:false,switchScan:false,switchScanInterval:2,speechRate:1,voiceURI:"",dayPeriod:"any",language:state.preferences.language};if(!saveState()){state.people=previousPeople;state.customItems=previousCustomItems;state.preferences=previousPreferences;return}applyPreferences();applyLanguage();syncSettings();updateSwitchScan();showToast(t("Dados iniciais restaurados."))}});
  $("#addCustomItem").addEventListener("click",()=>{const categoryId=$("#customCategory").value,name=$("#customItemName").value.trim(),phrase=$("#customItemPhrase").value.trim();if(!name||!phrase){showToast(t("Preencha o nome e a frase da opção."));return}const previousCustomItems=state.customItems;state.customItems=[...state.customItems,{id:"custom-"+crypto.randomUUID(),categoryId,name,phrase,type:"general",adjustments:["Quero mais","Quero menos","Está bom","Não gostei","Terminei"],symbol:"＋"}];if(!saveState()){state.customItems=previousCustomItems;return}renderCategories();syncSettings();$("#customItemName").value="";$("#customItemPhrase").value="";showToast(t("Opção personalizada adicionada."))});
  $("#savePeriod").addEventListener("click",()=>{const previousPeriod=state.preferences.dayPeriod;state.preferences.dayPeriod=$("#dayPeriod").value;if(!saveState()){state.preferences.dayPeriod=previousPeriod;syncSettings();return}showToast(t("Preferência de período salva."))});
}
function unlockAudio(){try{if("speechSynthesis" in window){window.speechSynthesis.getVoices();window.speechSynthesis.resume()}}catch(e){}document.removeEventListener("pointerdown",unlockAudio)}
document.addEventListener("pointerdown",unlockAudio,{once:true});
const DYN_IDS=["alarmStatus","alarmDescription","alarmToggle","painMessage","currentMessage","itemsTitle","adjustmentTitle","personName","personRelation","personFormTitle","voiceSelect","customCategory","categoryGrid","itemGrid","adjustmentGrid","bodyMap","selectedRegions","discomfortGrid","peopleGrid","personActions","customPhrases","toast"];
const origText=new WeakMap(),origAttr=new WeakMap(),HTML_LANG={pt:"pt-BR",en:"en",es:"es"};
let origTitle="",origDesc="";
const norm=x=>x.replace(/\s+/g," ").trim();
function translateDom(){
  const l=lang(),dict=l==="pt"?null:(I18N[l]||{});
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.tagName==="SCRIPT"||p.tagName==="STYLE"||p.closest("[data-dyn]"))return NodeFilter.FILTER_REJECT;return (norm(n.nodeValue)||origText.has(n))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{if(!origText.has(n))origText.set(n,n.nodeValue);const o=origText.get(n),k=norm(o),tr=dict&&dict[k];n.nodeValue=tr?o.match(/^\s*/)[0]+tr+o.match(/\s*$/)[0]:o});
  $$("[aria-label],[title],[placeholder]").forEach(el=>{if(el.closest("[data-dyn]"))return;if(!origAttr.has(el))origAttr.set(el,{});const store=origAttr.get(el);["aria-label","title","placeholder"].forEach(a=>{if(!el.hasAttribute(a))return;if(!(a in store))store[a]=el.getAttribute(a);const tr=dict&&dict[norm(store[a])];el.setAttribute(a,tr||store[a])})});
  const meta=document.querySelector('meta[name="description"]');if(!origTitle)origTitle=document.title;if(meta&&!origDesc)origDesc=meta.getAttribute("content");
  document.title=(dict&&dict[origTitle])||origTitle;if(meta)meta.setAttribute("content",(dict&&dict[origDesc])||origDesc);
  document.documentElement.lang=HTML_LANG[l]||"pt-BR";
}
function refreshDynamic(){
  state.currentMessage="";$("#messageBar").classList.add("hidden");
  renderCategories();renderItems();renderAdjustments();renderBody();renderSelectedRegions();renderDiscomforts();updatePainMessage();renderPeople();renderAlarmText();syncSettings();
  if(!$("#personFormPanel").classList.contains("hidden"))$("#personFormTitle").textContent=t($("#personForm").dataset.editId?"Editar pessoa":"Cadastrar pessoa");
}
function applyLanguage(){translateDom();refreshDynamic()}
function setLanguage(code,speak=true){
  if(!LANGS[code])code="pt";
  const previousLanguage=state.preferences.language,previousVoiceURI=state.preferences.voiceURI;
  state.preferences.language=code;
  if(!voicesForLang().some(v=>v.voiceURI===state.preferences.voiceURI))state.preferences.voiceURI="";
  if(!saveState()){state.preferences.language=previousLanguage;state.preferences.voiceURI=previousVoiceURI;applyLanguage();return}
  applyLanguage();
  if(speak)speakText(t("Olá. Esta é a voz do COMUNIQUE-SE."));
}
function init(){
  fetch(DEFAULT_DATA_URL)
    .then(r=>{if(!r.ok)throw new Error("data.json não encontrado");return r.json()})
    .then(data=>{initialData=data;startApp()})
    .catch(()=>{
      if(window.COMUNICAVIDA_DATA){initialData=window.COMUNICAVIDA_DATA;startApp();}
      else {showToast(t("Não foi possível carregar os dados do aplicativo."));}
    });
}
function startApp(){readSaved();if(!LANGS[state.preferences.language])state.preferences.language="pt";DYN_IDS.forEach(id=>{const el=document.getElementById(id);if(el)el.setAttribute("data-dyn","")});applyPreferences();renderCategories();renderBody();renderSelectedRegions();renderDiscomforts();bindPersonForm();bindSettings();populateVoices();if("speechSynthesis" in window)window.speechSynthesis.onvoiceschanged=populateVoices;
$$("[data-action]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.action;if(action==="communicate"){setScreen("communicate");renderCategories()}else if(action==="pain"){setScreen("pain")}else if(action==="people"){setScreen("people")}else{setScreen("help")}}));
$$("[data-back]").forEach(b=>b.addEventListener("click",()=>setScreen(b.dataset.back||"home")));$("#settingsButton").addEventListener("click",()=>setScreen("settings"));$("#speakMessage").addEventListener("click",()=>speakText(state.currentMessage));$("#stopSpeech").addEventListener("click",stopSpeech);
$("#frontView").addEventListener("click",()=>{state.bodyView="front";$("#frontView").classList.add("selected");$("#backView").classList.remove("selected");renderBody()});$("#backView").addEventListener("click",()=>{state.bodyView="back";$("#backView").classList.add("selected");$("#frontView").classList.remove("selected");renderBody()});$("#clearBody").addEventListener("click",()=>{state.painRegions=[];state.painLevel="";state.discomfort="";renderBody();renderSelectedRegions();updatePainMessage();$$('#painLevels button,#discomfortGrid button').forEach(b=>b.classList.remove("selected"))});
$$("#painLevels button").forEach(b=>{const img=document.createElement("span");img.textContent=painEmoji[b.dataset.level]||"😣";img.setAttribute("aria-hidden","true");img.className="mini-option-image";const label=document.createElement("span");label.textContent=b.textContent;b.textContent="";b.appendChild(img);b.appendChild(label);b.addEventListener("click",()=>{state.painLevel=b.dataset.level;state.discomfort="";$$('#painLevels button').forEach(x=>x.classList.toggle("selected",x===b));$$('#discomfortGrid button').forEach(x=>x.classList.remove("selected"));updatePainMessage()})});$("#confirmPain").addEventListener("click",()=>{updatePainMessage();const msg=$("#painMessage").textContent;if(state.painEmpty){showToast(t("Escolha uma região ou um desconforto primeiro."));return}setMessage(msg,true);showToast(t("Mensagem pronta para comunicar. Isto não é um diagnóstico."))});
$("#addPersonButton").addEventListener("click",()=>openPersonForm());$("#cancelPersonForm").addEventListener("click",()=>$("#personFormPanel").classList.add("hidden"));$("#alarmToggle").addEventListener("click",()=>state.alarmActive?alarmStop():alarmStart());$("#alarmSpeak").addEventListener("click",()=>speakText(t("Preciso de ajuda agora")));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(state.alarmActive)alarmStop();else if(!$("#personFormPanel").classList.contains("hidden"))$("#personFormPanel").classList.add("hidden");else setScreen("home")}});
applyLanguage();
}
init();
