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
 for(const [id,placeholder] of [['contribMember','Seleccionar socio'],['receiptMember','Seleccionar socio'],['loanMember','Seleccionar socio']]){const el=$(id),v=el.value;el.innerHTML=`<option value="">${placeholder}</option>`+db.members.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');el.value=v}
 $('contribList').innerHTML=db.contributions.slice().reverse().slice(0,30).map(x=>item(memberName(x.memberId),`${x.month} · ${money(x.amount)} · registrado ${x.date}${x.receiptImage?' · Comprobante adjunto':''}${x.receiptRef?' · Ref. '+x.receiptRef:''}`)+ (x.receiptImage?`<button class="viewReceipt" type="button" data-receipt="${escapeHtml(x.id)}">Ver comprobante</button>`:'' )).join('')||'<p class="hint">Sin aportaciones.</p>';
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
$('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.version!==1||!['members','contributions','loans','payments'].every(k=>Array.isArray(d[k])))throw Error('Archivo incompatible');if(!confirm('¿Reemplazar todos los datos actuales con el respaldo?'))return;db=d;try{persist();toast('Respaldo importado')}catch(err){toast('No hay espacio suficiente para importar; se conservó el respaldo original')}}catch(err){toast('Archivo de respaldo inválido')}e.target.value=''});
$('resetBtn').addEventListener('click',()=>{if(confirm('¿Borrar TODOS los datos locales? Esta acción no se puede deshacer.')&&confirm('Última confirmación: ¿eliminar todo?')){db=empty();persist();toast('Datos borrados')}});

// Comprobantes: OCR local mediante Tesseract.js cargado bajo demanda.
let receiptImage=null;
const receiptFile=$('receiptFile');
const receiptStatus=$('scanStatus');
function setReceiptStatus(msg){receiptStatus.textContent=msg}
function normalizeAmount(raw){
 let s=String(raw).replace(/[^\d,.]/g,'');if(!s)return NaN;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
 if(comma>=0&&dot>=0){const decimal=comma>dot?',':'.';s=s.replace(decimal===','?/\./g:/,/g,'').replace(decimal,'.')}
 else if(comma>=0)s=s.replace(',','.');
 return Number(s);
}
function parseReceipt(text){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const patterns=[/(?:total\s*(?:pagado|depositado|transferido)?|monto|valor|importe|dep[oó]sito|transferencia|acreditado)\s*(?:\(usd\))?\s*[:=\-]?\s*(?:usd|us\$|\$)?\s*([\d.,]+)/i,/(?:usd|us\$|\$)\s*([\d.,]+)/i];
 let amount=null;
 for(const pat of patterns){for(const line of lines){const m=line.match(pat);if(m){const n=normalizeAmount(m[1]);if(Number.isFinite(n)&&n>0&&n<1000000){amount=n;break}}}if(amount!==null)break}
 const dateMatch=text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/)||text.match(/\b(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
 let date=null;
 if(dateMatch){let y,m,d;if(dateMatch[1].length===4){[y,m,d]=dateMatch.slice(1)}else{[d,m,y]=dateMatch.slice(1)};const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(!Number.isNaN(new Date(iso+'T12:00:00').getTime())&&new Date(iso+'T12:00:00').toISOString().slice(0,10)===iso)date=iso}
 const refMatch=text.match(/(?:referencia|comprobante|transacci[oó]n|operaci[oó]n|n[uú]mero\s*de\s*documento)\s*(?:n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9-]{5,35})/i);
 return {amount,date,reference:refMatch?.[1]||''};
}
async function compressReceipt(file){
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 return canvas.toDataURL('image/jpeg',0.57);
}
receiptFile.addEventListener('change',async()=>{
 receiptImage=null;$('scanReceipt').disabled=true;$('receiptPreview').hidden=true;$('receiptVerified').checked=false;
 const file=receiptFile.files[0];if(!file)return;
 if(!file.type.startsWith('image/')||file.size>12*1024*1024){setReceiptStatus('Selecciona una imagen de hasta 12 MB.');return}
 try{receiptImage=await compressReceipt(file);$('receiptPreview').src=receiptImage;$('receiptPreview').hidden=false;$('scanReceipt').disabled=false;setReceiptStatus('Imagen lista. Pulsa «Leer comprobante».')}catch(e){setReceiptStatus('No se pudo abrir la imagen. Prueba con otra foto.')}
});
function loadOCR(){return new Promise((resolve,reject)=>{
 if(window.Tesseract)return resolve(window.Tesseract);
 const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=()=>resolve(window.Tesseract);s.onerror=()=>reject(Error('No se pudo descargar el lector OCR'));document.head.appendChild(s);
})}
$('scanReceipt').addEventListener('click',async()=>{
 if(!receiptImage)return;
 $('scanReceipt').disabled=true;setReceiptStatus('Leyendo imagen… Puede tardar un minuto. Se necesita internet para cargar el lector.');
 let worker;
 try{const T=await loadOCR();worker=await T.createWorker('spa+eng');const result=await worker.recognize(receiptImage);const found=parseReceipt(result.data.text||'');
 if(found.amount!==null)$('receiptAmount').value=found.amount.toFixed(2);
 if(found.date){$('receiptDate').value=found.date;$('receiptMonth').value=found.date.slice(0,7)}
 if(found.reference)$('receiptRef').value=found.reference;
 setReceiptStatus((found.amount!==null?'Monto sugerido: '+money(found.amount)+'. ':'No se identificó el monto. Escríbelo manualmente. ')+(found.date?'Fecha sugerida: '+found.date+'. ':'No se identificó la fecha; revísala. ')+'Comprueba todos los datos antes de confirmar.');
 }catch(e){setReceiptStatus('No se pudo leer automáticamente. Puedes completar monto y fecha manualmente y adjuntar la imagen.');}
 finally{try{await worker?.terminate()}catch(e){}$('scanReceipt').disabled=false}
});
$('receiptForm').addEventListener('submit',e=>{
 e.preventDefault();const memberId=$('receiptMember').value,month=$('receiptMonth').value,date=$('receiptDate').value,amount=Number($('receiptAmount').value),reference=$('receiptRef').value.trim();
 if(!receiptImage)return toast('Primero adjunta un comprobante');
 if(!db.members.some(m=>m.id===memberId)||!/^[0-9]{4}-[0-9]{2}$/.test(month)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!Number.isFinite(amount)||cents(amount)<=0)return toast('Revisa los datos');
 if(!$('receiptVerified').checked)return toast('Confirma que verificaste el ingreso bancario');
 if(db.contributions.some(x=>x.memberId===memberId&&x.month===month))return toast('Ya existe una aportación para ese socio y mes');
 if(reference&&db.contributions.some(x=>x.receiptRef&&x.receiptRef.toLowerCase()===reference.toLowerCase()))return toast('Esta referencia ya fue registrada');
 if(cents(amount)!==2000&&!confirm('La aportación acordada es de $20. ¿Registrar otro valor?'))return;
 if(!confirm('¿Verificaste en el banco el ingreso de '+money(amount)+' y deseas registrar la aportación?'))return;
 const entry={id:uid(),memberId,month,amount:cash(cents(amount)),date:today(),depositDate:date,receiptRef:reference,receiptImage,verified:true};
 db.contributions.push(entry);
 try{persist()}catch(err){db.contributions.pop();toast('No se pudo guardar: almacenamiento lleno. Usa una foto más pequeña.');return}
 e.target.reset();receiptFile.value='';receiptImage=null;$('receiptPreview').hidden=true;$('scanReceipt').disabled=true;$('receiptMonth').value=today().slice(0,7);$('receiptDate').value=today();setReceiptStatus('Aportación registrada con comprobante.');toast('Aportación registrada');
});
$('contribList').addEventListener('click',e=>{const b=e.target.closest('[data-receipt]');if(!b)return;const x=db.contributions.find(v=>v.id===b.dataset.receipt);if(x?.receiptImage){const w=window.open('','_blank');if(w){const im=w.document.createElement('img');im.src=x.receiptImage;im.style.maxWidth='100%';w.document.body.appendChild(im)}else toast('Permite abrir la imagen en otra ventana')}});

document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{
// Comprobantes: OCR local mediante Tesseract.js cargado bajo demanda.
let receiptImage=null;
const receiptFile=$('receiptFile');
const receiptStatus=$('scanStatus');
function setReceiptStatus(msg){receiptStatus.textContent=msg}
function normalizeAmount(raw){
 let s=String(raw).replace(/[^\d,.]/g,'');if(!s)return NaN;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
 if(comma>=0&&dot>=0){const decimal=comma>dot?',':'.';s=s.replace(decimal===','?/\./g:/,/g,'').replace(decimal,'.')}
 else if(comma>=0)s=s.replace(',','.');
 return Number(s);
}
function parseReceipt(text){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const patterns=[/(?:total\s*(?:pagado|depositado|transferido)?|monto|valor|importe|dep[oó]sito|transferencia|acreditado)\s*(?:\(usd\))?\s*[:=\-]?\s*(?:usd|us\$|\$)?\s*([\d.,]+)/i,/(?:usd|us\$|\$)\s*([\d.,]+)/i];
 let amount=null;
 for(const pat of patterns){for(const line of lines){const m=line.match(pat);if(m){const n=normalizeAmount(m[1]);if(Number.isFinite(n)&&n>0&&n<1000000){amount=n;break}}}if(amount!==null)break}
 const dateMatch=text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/)||text.match(/\b(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
 let date=null;
 if(dateMatch){let y,m,d;if(dateMatch[1].length===4){[y,m,d]=dateMatch.slice(1)}else{[d,m,y]=dateMatch.slice(1)};const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(!Number.isNaN(new Date(iso+'T12:00:00').getTime())&&new Date(iso+'T12:00:00').toISOString().slice(0,10)===iso)date=iso}
 const refMatch=text.match(/(?:referencia|comprobante|transacci[oó]n|operaci[oó]n|n[uú]mero\s*de\s*documento)\s*(?:n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9-]{5,35})/i);
 return {amount,date,reference:refMatch?.[1]||''};
}
async function compressReceipt(file){
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 return canvas.toDataURL('image/jpeg',0.57);
}
receiptFile.addEventListener('change',async()=>{
 receiptImage=null;$('scanReceipt').disabled=true;$('receiptPreview').hidden=true;$('receiptVerified').checked=false;
 const file=receiptFile.files[0];if(!file)return;
 if(!file.type.startsWith('image/')||file.size>12*1024*1024){setReceiptStatus('Selecciona una imagen de hasta 12 MB.');return}
 try{receiptImage=await compressReceipt(file);$('receiptPreview').src=receiptImage;$('receiptPreview').hidden=false;$('scanReceipt').disabled=false;setReceiptStatus('Imagen lista. Pulsa «Leer comprobante».')}catch(e){setReceiptStatus('No se pudo abrir la imagen. Prueba con otra foto.')}
});
function loadOCR(){return new Promise((resolve,reject)=>{
 if(window.Tesseract)return resolve(window.Tesseract);
 const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=()=>resolve(window.Tesseract);s.onerror=()=>reject(Error('No se pudo descargar el lector OCR'));document.head.appendChild(s);
})}
$('scanReceipt').addEventListener('click',async()=>{
 if(!receiptImage)return;
 $('scanReceipt').disabled=true;setReceiptStatus('Leyendo imagen… Puede tardar un minuto. Se necesita internet para cargar el lector.');
 let worker;
 try{const T=await loadOCR();worker=await T.createWorker('spa+eng');const result=await worker.recognize(receiptImage);const found=parseReceipt(result.data.text||'');
 if(found.amount!==null)$('receiptAmount').value=found.amount.toFixed(2);
 if(found.date){$('receiptDate').value=found.date;$('receiptMonth').value=found.date.slice(0,7)}
 if(found.reference)$('receiptRef').value=found.reference;
 setReceiptStatus((found.amount!==null?'Monto sugerido: '+money(found.amount)+'. ':'No se identificó el monto. Escríbelo manualmente. ')+(found.date?'Fecha sugerida: '+found.date+'. ':'No se identificó la fecha; revísala. ')+'Comprueba todos los datos antes de confirmar.');
 }catch(e){setReceiptStatus('No se pudo leer automáticamente. Puedes completar monto y fecha manualmente y adjuntar la imagen.');}
 finally{try{await worker?.terminate()}catch(e){}$('scanReceipt').disabled=false}
});
$('receiptForm').addEventListener('submit',e=>{
 e.preventDefault();const memberId=$('receiptMember').value,month=$('receiptMonth').value,date=$('receiptDate').value,amount=Number($('receiptAmount').value),reference=$('receiptRef').value.trim();
 if(!receiptImage)return toast('Primero adjunta un comprobante');
 if(!db.members.some(m=>m.id===memberId)||!/^[0-9]{4}-[0-9]{2}$/.test(month)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!Number.isFinite(amount)||cents(amount)<=0)return toast('Revisa los datos');
 if(!$('receiptVerified').checked)return toast('Confirma que verificaste el ingreso bancario');
 if(db.contributions.some(x=>x.memberId===memberId&&x.month===month))return toast('Ya existe una aportación para ese socio y mes');
 if(reference&&db.contributions.some(x=>x.receiptRef&&x.receiptRef.toLowerCase()===reference.toLowerCase()))return toast('Esta referencia ya fue registrada');
 if(cents(amount)!==2000&&!confirm('La aportación acordada es de $20. ¿Registrar otro valor?'))return;
 if(!confirm('¿Verificaste en el banco el ingreso de '+money(amount)+' y deseas registrar la aportación?'))return;
 const entry={id:uid(),memberId,month,amount:cash(cents(amount)),date:today(),depositDate:date,receiptRef:reference,receiptImage,verified:true};
 db.contributions.push(entry);
 try{persist()}catch(err){db.contributions.pop();toast('No se pudo guardar: almacenamiento lleno. Usa una foto más pequeña.');return}
 e.target.reset();receiptFile.value='';receiptImage=null;$('receiptPreview').hidden=true;$('scanReceipt').disabled=true;$('receiptMonth').value=today().slice(0,7);$('receiptDate').value=today();setReceiptStatus('Aportación registrada con comprobante.');toast('Aportación registrada');
});
$('contribList').addEventListener('click',e=>{const b=e.target.closest('[data-receipt]');if(!b)return;const x=db.contributions.find(v=>v.id===b.dataset.receipt);if(x?.receiptImage){const w=window.open('','_blank');if(w){const im=w.document.createElement('img');im.src=x.receiptImage;im.style.maxWidth='100%';w.document.body.appendChild(im)}else toast('Permite abrir la imagen en otra ventana')}});

document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('selected',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.page));window.scrollTo(0,0)}));
$('contribMonth').value=today().slice(0,7);$('receiptMonth').value=today().slice(0,7);$('receiptDate').value=today();render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
