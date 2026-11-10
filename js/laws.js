'use strict';
let senateApiKey = '';
function lawLookupMarkup(){
 return `<section class="card"><h3>NYS law lookup</h3><p class="muted small">Enter your own NY Senate API key. It stays in memory until this page is reloaded and is sent only to the Senate. Search terms are sent to the Senate; do not enter personal or case information. Results may not reflect the law on the incident date. Verify the statute and complete subdivision, class, category and other fields manually.</p><div class="fields"><label>API key<input id="law-key" type="password" autocomplete="off" value="${esc(senateApiKey)}"></label><label>Law ID (optional)<input id="law-volume" placeholder="e.g. PEN" maxlength="3"></label><label>Law search term<input id="law-term" type="search" placeholder="Offense name or section"></label><div class="actions"><button type="button" class="secondary" id="law-search">Search laws</button></div></div><div id="law-results" aria-live="polite"></div></section>`;
}
function setupLawLookup(){
 const dialog=$('dialog-form'),results=$('law-results'),button=$('law-search');
 let requestId=0;
 async function search(offset){
  const key=$('law-key').value.trim(),term=$('law-term').value.trim(),volume=$('law-volume').value.trim().toUpperCase();
  if(!key||!term||volume&&!/^[A-Z]{3}$/.test(volume)){results.textContent='Enter an API key and search term. Law ID must be three letters if provided.';return}
  senateApiKey=key;const request=++requestId;
  button.disabled=true;results.textContent='Searching NY Senate laws…';
  const url=new URL('https://legislation.nysenate.gov/api/3/laws/'+(volume?volume+'/':'')+'search');
  url.search=new URLSearchParams({term,key,limit:'20',offset:String(offset)}).toString();
  let response,data;
  try{response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok){if($('dialog-form')===dialog&&request===requestId)results.textContent='NY Senate request failed (HTTP '+response.status+').'+(response.status===429?' Please wait before trying again.':'')+' You can enter the offense manually.';return}data=await response.json();if(!data.success||!Array.isArray(data.result?.items)||data.result.items.some(item=>!item.result||typeof item.result!=='object'))throw new Error('Unexpected response')}
  catch(error){if($('dialog-form')===dialog&&request===requestId)results.textContent='Law search unavailable or returned an unexpected response. Check your connection and try again, or enter the offense manually.';return}
  finally{if($('dialog-form')===dialog&&request===requestId)button.disabled=false}
  if($('dialog-form')!==dialog||request!==requestId)return;
  const items=data.result.items.map(item=>item.result);
  results.innerHTML=`<p class="small muted">${esc(data.total??items.length)} result(s). Only sections can be selected. Review the current statute before using it.</p><div class="list">${items.map((item,index)=>`<div class="list-item">${esc(item.lawId)} · ${esc(item.docLevelId||item.locationId)} · ${esc(item.title||'Untitled')} ${esc(item.docType||'')} ${item.activeDate?'· Updated '+esc(item.activeDate):''} ${item.docType==='SECTION'?`<button type="button" class="secondary" data-law-result="${index}">Use section</button>`:''}</div>`).join('')||'<p class="empty">No results found.</p>'}</div>${offset>1?'<button type="button" class="secondary" id="law-prev">Previous results</button>':''}${items.length&&offset+items.length-1<Number(data.total)?'<button type="button" class="secondary" id="law-next">Next results</button>':''}`;
  results.querySelectorAll('[data-law-result]').forEach(control=>control.addEventListener('click',()=>{
   const item=items[Number(control.dataset.lawResult)];
   if(!item.lawId||!item.docLevelId||!item.title){results.insertAdjacentHTML('beforeend','<p class="muted">This result lacks the fields needed for autofill. Enter it manually.</p>');return}
   const form=$('dialog-form'),values=[['law',item.lawId],['section',item.docLevelId],['name',item.title]];
   if(values.some(([name,value])=>form.elements[name].value&&form.elements[name].value!==value)&&!confirm('Replace the existing law, section and offense name? Other fields will remain unchanged and must be reviewed.'))return;
   for(const [name,value] of values)form.elements[name].value=value;
   results.insertAdjacentHTML('beforeend','<p class="muted">Law, section and title filled. Verify them and complete the remaining fields.</p>');
  }));
  const previous=$('law-prev'),next=$('law-next');if(previous)previous.addEventListener('click',()=>search(Math.max(1,offset-20)));if(next)next.addEventListener('click',()=>search(offset+items.length));
 }
 button.addEventListener('click',()=>search(1));
}
