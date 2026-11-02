'use strict';
const KEY='mi_caja_familiar_v1';
const empty=()=>({version:1,members:[],contributions:[],loans:[],payments:[]});
let db;
try{db=JSON.parse(localStorage.getItem(KEY))||empty();if(!Array.isArray(db.members)||!Array.isArray(db.contributions)||!Array.isArray(db.loans)||!Array.isArray(db.payments))throw Error('Formato incorrecto')}catch(e){db=empty();alert('No se pudo leer la información local. Importa un respaldo si lo tienes.')}
const $=id=>document.getElementById(id), money=n=>'$'+(Math.round((Number(n)||0)*100)/100).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const cents=n=>Math.round((Number(n)||0)*100), cash=n=>Math.round(n)/100;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
const today=()=>new Date().toISOString().slice(0,10);
function persist(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function toast(s){$('toast').textContent=s;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3000)}
function savings(id){return cash(db.contributions.filter(x=>x.memberId===id).reduce((a,x)=>a+cents(x.amount),0))}
function principal(loan){return cash(Math.max(0,cents(loan.amount)-db.payments.filter(x=>x.loanId===loan.id).reduce((a,x)=>a+cents(x.principal),0)))}
function outstanding(id){return cash(db.loans.filter(x=>x.memberId===id).reduce((a,x)=>a+cents(principal(x)),0))}
function paidInterest(){return cash(db.payments.reduce((a,x)=>a+cents(x.interest),0))}
function totalContrib(){return cash(db.contributions.reduce((a,x)=>a+cents(x.amount),0))}
function loanDisbursed(){return cash(db.loans.reduce((a,x)=>a+cents(x.amount),0))}
function paidTotal(){return cash(db.payments.reduce((a,x)=>a+cents(x.amount),0))}
function cashBalance(){return cash(cents(totalContrib())-cents(loanDisbursed())+cents(paidTotal()))}
function memberName(id){return db.members.find(x=>x.id===id)?.name||'Socio desconocido'}
function monthDiff(from,to){const a=new Date(from+'T12:00:00'),b=new Date(to+'T12:00:00');let n=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();if(b.getDate()<a.getDate())n--;return Math.max(0,n)}
function interestDue(loan){const last=db.payments.filter(x=>x.loanId===loan.id).sort((a,b)=>b.date.localeCompare(a.date))[0];const start=last?.date||loan.date;return cash(cents(principal(loan))*0.1*monthDiff(start,today()))}
function available(m){return cash(Math.max(0,cents(savings(m.id)*0.4)-cents(outstanding(m.id))))}
function item(title,detail){return `<div class="item"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div>`}
function render(){
 const saved=totalContrib(), outstandingAll=cash(db.loans.reduce((a,x)=>a+cents(principal(x)),0)), interest=paidInterest();
 $('stats').innerHTML=[['Socios',db.members.length],['Ahorro acumulado',money(saved)],['Préstamos pendientes',money(outstandingAll)],['Intereses simulados cobrados',money(interest)]].map(([k,v])=>`<div class="stat"><small>${k}</small><strong>${v}</strong></div>`).join('');
 $('cashSummary').textContent=`Saldo teórico de caja: ${money(cashBalance())}. Incluye aportaciones y pagos simulados, menos préstamos simulados. No equivale a efectivo conciliado.`;
 $('memberList').innerHTML=db.members.length?db.members.map(m=>item(m.name,`Ahorro ${money(savings(m.id))} · Deuda ${money(outstanding(m.id))} · Límite adicional ${money(available(m))}`)).join(''):'<p class="hint">Aún no hay socios registrados.</p>';
 for(const [id,placeholder] of [['contribMember','Seleccionar socio'],['loanMember','Seleccionar socio']]){const el=$(id),v=el.value;el.innerHTML=`<option value="">${placeholder}</option>`+db.members.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');el.value=v}
 $('contribList').innerHTML=db.contributions.slice().reverse().slice(0,30).map(x=>item(memberName(x.memberId),`${x.month} · ${money(x.amount)} · registrado ${x.date}`)).join('')||'<p class="hint">Sin aportaciones.</p>';
 const v=$('paymentLoan').value;$('paymentLoan').innerHTML='<option value="">Seleccionar préstamo</option>'+db.loans.filter(l=>principal(l)>0).map(l=>`<option value="${escapeHtml(l.id)}">${escapeHtml(memberName(l.memberId))} · ${money(principal(l))}</option>`).join('');$('paymentLoan').value=v;
 $('loanList').innerHTML=db.loans.slice().reverse().map(l=>item(memberName(l.memberId),`Préstamo ${money(l.amount)} · ${l.months} meses · saldo ${money(principal(l))} · ${l.date}`)).join('')||'<p class="hint">Sin préstamos simulados.</p>';
 $('paymentList').innerHTML=db.payments.slice().reverse().slice(0,30).map(x=>item(memberName(db.loans.find(l=>l.id===x.loanId)?.memberId),`${x.date} · ${money(x.amount)} (capital ${money(x.principal)}, interés ${money(x.interest)})`)).join('')||'<p class="hint">Sin pagos.</p>';
 $('reinvest').textContent=money(cash(cents(interest)/2));$('distribution').textContent=money(cash(cents(interest)-Math.round(cents(interest)/2)));
 const pool=cash(cents(interest)-Math.round(cents(interest)/2));$('profitList').innerHTML=db.members.map(m=>item(m.name,`Participación teórica: ${saved>0?money(pool*savings(m.id)/saved):money(0)} · ahorro ${money(savings(m.id))}`)).join('')||'<p class="hint">Registra socios para ver el reparto.</p>';
 updateEstimate();
}
function updateEstimate(){const m=db.members.find(x=>x.id===$('loanMember').value),p=Number($('loanAmount').value),n=Number($('loanMonths').value);if(!m){$('loanEstimate').textContent='Selecciona un socio para consultar su límite.';return}const max=available(m);if(!(p>0&&n>=1&&n<=120)){$('loanEstimate').textContent=`Disponible máximo: ${money(max)}.`;return}const cuota=p*.1/(1-Math.pow(1.1,-n));$('loanEstimate').textContent=`Máximo adicional ${money(max)} · cuota mensual aproximada ${money(cuota)} · interés total aproximado ${money(cuota*n-p)}. ${p>max?'MONTO EXCEDE EL LÍMITE.':''}`}
$('memberForm').addEventListener('submit',e=>{e.preventDefault();const name=$('memberName').value.trim();if(!name)return;db.members.push({id:uid(),name,phone:$('memberPhone').value.trim(),created:today()});persist();e.target.reset();toast('Socio agregado')});
$('contributionForm').addEventListener('submit',e=>{e.preventDefault();const memberId=$('contribMember').value,month=$('contribMonth').value,amount=Number($('contribAmount').value);if(!db.members.some(m=>m.id===memberId)||!/^\d{4}-\d{2}$/.test(month)||!(amount>0)||!Number.isFinite(amount))return toast('Revisa los datos');if(db.contributions.some(x=>x.memberId===memberId&&x.month===month))return toast('Ya existe una aportación para ese mes');if(cents(amount)!==2000&&!confirm('La aportación acordada es de $20. ¿Registrar un importe diferente?'))return;db.contributions.push({id:uid(),memberId,month,amount:cash(cents(amount)),date:today()});persist();toast('Aportación registrada')});
$('loanMember').addEventListener('change',updateEstimate);$('loanAmount').addEventListener('input',updateEstimate);$('loanMonths').addEventListener('input',updateEstimate);
$('loanForm').addEventListener('submit',e=>{e.preventDefault();const memberId=$('loanMember').value,m=db.members.find(x=>x.id===memberId),amount=cash(cents($('loanAmount').value)),months=Number($('loanMonths').value);if(!m||!(amount>0)||!Number.isInteger(months)||months<1||months>120)return toast('Datos inválidos');if(cents(amount)>cents(available(m)))return toast('Supera el 40 % disponible');if(cents(amount)>cents(cashBalance()))return toast('No hay saldo suficiente en caja');if(!confirm('Crear préstamo SOLO SIMULADO. No representa un desembolso real.'))return;db.loans.push({id:uid(),memberId,amount,months,date:today(),rate:0.1,simulation:true});persist();e.target.reset();$('loanMonths').value=3;toast('Simulación registrada')});
$('paymentForm').addEventListener('submit',e=>{e.preventDefault();const loan=db.loans.find(x=>x.id===$('paymentLoan').value),amount=cash(cents($('paymentAmount').value));if(!loan||!(amount>0))return toast('Datos inválidos');const interest=interestDue(loan),remaining=principal(loan),total=cash(cents(interest)+cents(remaining));if(cents(amount)>cents(total))return toast(`Máximo pendiente: ${money(total)}`);const intPart=cash(Math.min(cents(amount),cents(interest))),capPart=cash(cents(amount)-cents(intPart));db.payments.push({id:uid(),loanId:loan.id,amount,principal:capPart,interest:intPart,date:today(),simulation:true});persist();e.target.reset();toast('Pago simulado registrado')});
$('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mi-caja-respaldo-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
$('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.version!==1||!['members','contributions','loans','payments'].every(k=>Array.isArray(d[k])))throw Error('Archivo incompatible');if(!confirm('¿Reemplazar todos los datos actuales con el respaldo?'))return;db=d;persist();toast('Respaldo importado')}catch(err){toast('Archivo de respaldo inválido')}e.target.value=''});
$('resetBtn').addEventListener('click',()=>{if(confirm('¿Borrar TODOS los datos locales? Esta acción no se puede deshacer.')&&confirm('Última confirmación: ¿eliminar todo?')){db=empty();persist();toast('Datos borrados')}});
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('selected',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.page));window.scrollTo(0,0)}));
$('contribMonth').value=today().slice(0,7);render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
