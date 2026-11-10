'use strict';
const duplicateTypes = {
 people:{label:'person',fields:p=>[p.id,p.name,p.dob,p.aliases,p.description],describe:p=>`${p.name} · ${p.id} · DOB ${p.dob||'not recorded'} · ${p.aliases||'no aliases'}`,page:'person'},
 vehicles:{label:'vehicle',fields:v=>[v.id,v.description,v.plate],describe:v=>`${v.id} · ${v.description} · ${v.plate}`,page:'vehicle'},
 cases:{label:'case',fields:c=>[c.id,c.title,...c.incidentIds],describe:c=>`${c.id} · ${c.title} · ${c.incidentIds.join(', ')}`,page:'case'},
 evidence:{label:'evidence item',fields:e=>[e.id,e.name,e.incidentId,e.custodian,e.location],describe:e=>`${e.id} · ${e.name} · ${e.incidentId}`,page:'evidence-detail'}
};
const normalizeMatch = value => String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function possibleDuplicates(title,f){
 const same=(a,b)=>normalizeMatch(a)&&normalizeMatch(a)===normalizeMatch(b);
 if(title==='New person')return db.people.filter(p=>same(p.name,f.get('name'))||(f.get('dob')&&p.dob===f.get('dob'))||same(p.aliases,f.get('name'))).map(duplicateTypes.people.describe);
 if(title==='New vehicle')return db.vehicles.filter(v=>same(v.plate,f.get('plate'))).map(duplicateTypes.vehicles.describe);
 if(title==='Create case')return db.cases.filter(c=>same(c.title,f.get('title'))||f.getAll('incidents').some(id=>c.incidentIds.includes(id))).map(duplicateTypes.cases.describe);
 if(title==='Register evidence')return db.evidence.filter(e=>e.incidentId===f.get('incident')&&same(e.name,f.get('name'))).map(duplicateTypes.evidence.describe);
 return [];
}
function confirmDuplicates(title,f){
 const matches=possibleDuplicates(title,f);
 return !matches.length||confirm('Possible existing records:\n\n'+matches.slice(0,20).join('\n')+(matches.length>20?'\n...and '+(matches.length-20)+' more.':'')+'\n\nCreate a separate record anyway?');
}
function searchBeforeCreate(kind,incidentId){
 const config=duplicateTypes[kind];
 if(!config){flash('Unknown record type.',true);return}
 openDialog('Search for '+config.label,`<p class="muted">Search existing fictional records before creating a new one. Similar names or descriptions do not prove records are identical.</p><div class="fields">${field('query','Search '+config.label,'','search')}</div><div id="duplicate-results" aria-live="polite"></div>`,'Search',f=>{
  const query=String(f.get('query')||'').trim().toLowerCase();if(!query){flash('Enter a search term.',true);return}
  const results=db[kind].filter(item=>config.fields(item).some(value=>String(value||'').toLowerCase().includes(query)));
  const container=$('duplicate-results');
  container.innerHTML=`<p>${results.length} matching record(s)${results.length>30?' (first 30 shown; refine the search)':''}.</p><div class="list">${results.slice(0,30).map(item=>`<div class="list-item"><span>${esc(config.describe(item))}</span> <button type="button" class="secondary" data-result-id="${esc(item.id)}">${incidentId&&kind!=='evidence'?'Select':'Open'}</button></div>`).join('')}</div><p class="muted small">${incidentId&&kind==='evidence'?'Evidence belongs to one incident in this demo; existing items cannot be linked to another incident.':''}</p><button type="button" class="primary" id="create-after-search">Create new ${esc(config.label)}</button>`;
  container.querySelectorAll('[data-result-id]').forEach(button=>button.addEventListener('click',()=>selectExisting(kind,button.dataset.resultId,incidentId)));
  $('create-after-search').addEventListener('click',()=>{if(kind==='people')personForm(null,incidentId);else if(kind==='vehicles')vehicleForm(incidentId);else if(kind==='cases')caseForm(null,incidentId);else evidenceForm(incidentId)});
 });
}
function selectExisting(kind,id,incidentId){
 const item=find(kind,id),incident=incidentId?find('incidents',incidentId):null;
 if(!item||(incidentId&&!incident)){flash('The selected record is no longer available.',true);return}
 if(!incident||kind==='evidence'){closeDialog();show(duplicateTypes[kind].page,id);return}
 if(kind==='people'){linkPerson(incidentId,id);return}
 if(kind==='cases'&&!canViewInvestigation(item)){flash('This investigation is unavailable for the current demo role.',true);return}
 if((kind==='vehicles'?incident.vehicles.includes(id):item.incidentIds.includes(incidentId))){flash('This record is already linked to the incident.',true);return}
 const before=copy(db);
 if(kind==='vehicles'){incident.vehicles.push(id);if(!item.incidentIds.includes(incidentId))item.incidentIds.push(incidentId)}
 else item.incidentIds.push(incidentId);
 record('Linked '+duplicateTypes[kind].label+' '+id+' to incident '+incidentId);
 if(!persist()){db=before;return}closeDialog();show('incident',incidentId);flash('Existing record linked.');
}
