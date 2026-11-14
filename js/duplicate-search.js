'use strict';
const duplicateTypes = {
 people:{label:'person',fields:p=>[p.id,p.name,p.dob,p.aliases,p.description],describe:p=>`${p.name} · ${p.id} · DOB ${p.dob||'not recorded'} · ${p.aliases||'no aliases'}`,page:'person'},
 vehicles:{label:'vehicle',fields:v=>[v.id,v.description,v.plate],describe:v=>`${v.id} · ${v.description} · ${v.plate}`,page:'vehicle'},
 cases:{label:'case',fields:c=>[c.id,c.title,...c.incidentIds],describe:c=>`${c.id} · ${c.title} · ${c.incidentIds.join(', ')}`,page:'case'},
 evidence:{label:'evidence item',fields:e=>[e.id,e.name,e.serialNumber,e.incidentId,e.custodian,e.location],describe:e=>`${e.id} · ${e.name}${e.serialNumber?' · '+e.serialNumber:''} · ${e.incidentId}`,page:'evidence-detail'}
};
const normalizeMatch = value => String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function possibleDuplicates(title,f){
 const same=(a,b)=>normalizeMatch(a)&&normalizeMatch(a)===normalizeMatch(b);
 if(title==='New person')return db.people.filter(p=>same(p.name,f.get('name'))||(f.get('dob')&&p.dob===f.get('dob'))||same(p.aliases,f.get('name'))).map(duplicateTypes.people.describe);
 if(title==='New vehicle')return db.vehicles.filter(v=>same(v.plate,f.get('plate'))).map(duplicateTypes.vehicles.describe);
 if(title==='Register evidence')return db.evidence.filter(e=>(e.incidentId===f.get('incident')&&same(e.name,f.get('name')))||same(e.serialNumber,f.get('serialNumber'))).map(duplicateTypes.evidence.describe);
 return [];
}
function confirmDuplicates(title,f){
 const matches=possibleDuplicates(title,f);
 return !matches.length||confirm('Possible existing records:\n\n'+matches.slice(0,20).join('\n')+(matches.length>20?'\n...and '+(matches.length-20)+' more.':'')+'\n\nCreate a separate record anyway?');
}
const recentCases=()=>db.cases.filter(canViewInvestigation).map((c,index)=>({c,index})).sort((a,b)=>(b.c.openedDate||'').localeCompare(a.c.openedDate||'')||a.index-b.index).slice(0,10).map(x=>x.c);
function showSearchResults(kind,results,incidentId,intro){
 const config=duplicateTypes[kind],container=$('duplicate-results');
 container.innerHTML=`<p>${intro}</p><div class="list">${results.slice(0,30).map(item=>`<div class="list-item"><span>${esc(config.describe(item))}</span> <button type="button" class="secondary" data-result-id="${esc(item.id)}">${incidentId&&kind!=='evidence'?'Select':'Open'}</button></div>`).join('')}</div><p class="muted small">${incidentId&&kind==='evidence'?'Evidence belongs to one incident in this demo; existing items cannot be linked to another incident.':''}${kind==='cases'?'Selecting a case links this incident to it; the case then manages the incident. Create new opens a case assigned to you.':''}</p><button type="button" class="primary" id="create-after-search">Create new ${esc(config.label)}</button>`;
 container.querySelectorAll('[data-result-id]').forEach(button=>button.addEventListener('click',()=>selectExisting(kind,button.dataset.resultId,incidentId)));
 $('create-after-search').addEventListener('click',()=>{if(kind==='people')personForm(null,incidentId);else if(kind==='vehicles')vehicleForm(incidentId);else if(kind==='cases')createCaseFromIncident(incidentId);else evidenceForm(incidentId)});
}
function searchBeforeCreate(kind,incidentId){
 const config=duplicateTypes[kind];
 if(!config){flash('Unknown record type.',true);return}
 if(incidentId&&!requireIncidentEdit(incidentId))return;
 if(kind==='cases'&&!incidentId){flash('Create a case from an incident.',true);return}
 const caseLookup=kind==='cases';
 openDialog(caseLookup?'Find or create case':'Search for '+config.label,`<p class="muted">${caseLookup?'Recent cases are listed first. Search if the case is not shown, or create a new case (most common).':'Search existing fictional records before creating a new one. Similar names or descriptions do not prove records are identical.'}</p><div class="fields">${field('query','Search '+config.label,'','search',!caseLookup)}</div><div id="duplicate-results" aria-live="polite"></div>`,'Search',f=>{
  const query=String(f.get('query')||'').trim().toLowerCase();
  if(!query){if(caseLookup){showSearchResults(kind,recentCases(),incidentId,'Showing the '+recentCases().length+' most recent case(s).');return}flash('Enter a search term.',true);return}
  const results=db[kind].filter(item=>config.fields(item).some(value=>String(value||'').toLowerCase().includes(query)));
  showSearchResults(kind,results,incidentId,`${results.length} matching record(s)${results.length>30?' (first 30 shown; refine the search)':''}.`);
 });
 if(caseLookup){const recent=recentCases();showSearchResults(kind,recent,incidentId,'Showing the '+recent.length+' most recent case(s).')}
}
function incidentPicker(){
 const candidates=db.incidents.filter(i=>!incidentCase(i)&&incidentEditable(i)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const renderList=(list,intro)=>{$('duplicate-results').innerHTML=`<p>${intro}</p><div class="list">${list.slice(0,10).map(i=>`<div class="list-item"><span>${esc(i.id+' · '+i.type+' · '+i.date+' · '+i.location)}</span> <button type="button" class="primary" data-incident-id="${esc(i.id)}">Create case</button></div>`).join('')}</div>`;$('duplicate-results').querySelectorAll('[data-incident-id]').forEach(b=>b.addEventListener('click',()=>createCaseFromIncident(b.dataset.incidentId)))};
 openDialog('Create case from incident',`<p class="muted">A case is created from an incident and assigned to you. Recent incidents without a case are listed; search if it is not shown.</p><div class="fields">${field('query','Search incidents','','search',false)}</div><div id="duplicate-results" aria-live="polite"></div>`,'Search',f=>{
  const query=String(f.get('query')||'').trim().toLowerCase();
  const list=query?candidates.filter(i=>[i.id,i.type,i.location,i.officer,i.date].some(v=>String(v||'').toLowerCase().includes(query))):candidates;
  renderList(list,query?`${list.length} matching incident(s) without a case${list.length>10?' (first 10 shown)':''}.`:'Most recent incidents without a case.')
 });
 renderList(candidates,'Most recent incidents without a case.');
}
function selectExisting(kind,id,incidentId){
 const item=find(kind,id),incident=incidentId?find('incidents',incidentId):null;
 if(!item||(incidentId&&!incident)){flash('The selected record is no longer available.',true);return}
 if(!incident||kind==='evidence'){closeDialog();show(duplicateTypes[kind].page,id);return}
 if(!requireIncidentEdit(incidentId)||(kind==='cases'&&!requireCaseEdit(id)))return;
 if(kind==='people'){linkPerson(incidentId,id);return}
 if(kind==='cases'){
  if(!canViewInvestigation(item)){flash('This investigation is unavailable for the current demo role.',true);return}
  if(item.incidentIds.includes(incidentId)){flash('This record is already linked to the incident.',true);return}
  createCaseFromIncident(incidentId,id);return
 }
 if(incident.vehicles.includes(id)){flash('This record is already linked to the incident.',true);return}
 const before=copy(db);
 incident.vehicles.push(id);if(!item.incidentIds.includes(incidentId))item.incidentIds.push(incidentId);
 record('Linked '+duplicateTypes[kind].label+' '+id+' to incident '+incidentId);
 if(!persist()){db=before;return}closeDialog();backToIncident(incidentId);flash('Existing record linked.');
}
