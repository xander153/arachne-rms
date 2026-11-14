'use strict';
// Keep the original key so existing demo records survive the rename.
const KEY = 'apex_rms_interactive_demo_v1';
const navItems = [['dashboard','Dashboard'],['workload','My work'],['daily','Daily attention'],['incidents','Incidents'],['cases','Cases'],['arrests','Arrests'],['people','People'],['vehicles','Vehicles'],['evidence','Property/Evidence'],['warrants','Warrants'],['review','Review queue'],['filing','Records queue'],['tasks','Tasks'],['analytics','Analytics'],['audit','Audit history'],['settings','Demo settings']];
const initialData = {
  version: 1,
  incidents: [
    {id:'INC-2026-891',type:'Burglary / Breaking & Entering',location:'1042 Market St.',date:'2026-10-28',officer:'Officer J. Miller',status:'Draft',caseId:'CASE-2026-041',narrative:'Fictional scenario: a shop owner reported a broken rear door and missing equipment. A witness described a vehicle leaving the area.',people:[{id:'P-001',role:'Victim'},{id:'P-002',role:'Witness'},{id:'P-003',role:'Person of interest'}],vehicles:['V-001'],supplements:[],reviewComments:[]},
    {id:'INC-2026-890',type:'Motor Vehicle Theft',location:'405 Pine Street',date:'2026-10-25',officer:'Officer S. Briggs',status:'Approved',narrative:'Fictional scenario: a vehicle was reported missing from a residential parking area.',people:[{id:'P-002',role:'Reporting party'}],vehicles:[],supplements:[],reviewComments:[]}
  ],
  people:[
    {id:'P-001',name:'Alex Rivera',dob:'1986-04-14',aliases:'None listed',description:'Store owner'},
    {id:'P-002',name:'Jordan Ellis',dob:'1992-11-02',aliases:'None listed',description:'Local resident'},
    {id:'P-003',name:'Casey Morgan',dob:'1988-03-19',aliases:'C. Morgan',description:'Fictional person of interest'}
  ],
  vehicles:[{id:'V-001',description:'Blue 2018 sedan',plate:'DEMO-417',incidentIds:['INC-2026-891']}],
  cases:[{id:'CASE-2026-041',title:'Market Street burglary',incidentIds:['INC-2026-891'],assignee:'Detective A. Chen',status:'Open',notes:'Review footage and follow up with the witness.'}],
  arrests:[],
  evidence:[{id:'E-001',name:'Rear-door photograph',incidentId:'INC-2026-891',location:'Demo evidence locker A',custodian:'Officer J. Miller',history:[{date:'2026-10-28',from:'Collected',to:'Officer J. Miller',note:'Initial simulated intake'}]}],
  warrants:[{id:'W-0421',personId:'P-003',type:'Bench warrant',status:'Listed in demo',issued:'2026-10-12',note:'Fictional record. Status and identity have not been verified.',checks:[]}],
  tasks:[{id:'T-001',title:'Follow up with witness',caseId:'CASE-2026-041',assignee:'Detective A. Chen',due:'2026-11-12',status:'Open'}],
  audit:[{at:'2026-10-28T15:00:00',actor:'Officer J. Miller',action:'Created fictional incident INC-2026-891'}]
};
let db;
let view = {page:'dashboard',id:null,query:''};
let role = 'Officer';
let dailyDate;
let reportFilters = {from:'',to:'',type:'',status:''};
let warrantFilters = {status:'',from:'',to:''};
let indexQueries = {people:'',vehicles:'',evidence:''};
let pages = {};
let workloadTab = 'incidents';
let supervisorIdentity = 'Supervisor R. Patel';
let listSequence = null;
let displayedSequences = {};
const pageSize = 10;
const supervisors = ['Supervisor R. Patel','Supervisor L. Reed'];
const defaultSupervision = {'Officer J. Miller':'Supervisor R. Patel','Officer S. Briggs':'Supervisor R. Patel','Officer T. Flores':'Supervisor L. Reed','Detective A. Chen':'Supervisor R. Patel','Detective R. West':'Supervisor R. Patel','Detective M. Diaz':'Supervisor L. Reed'};
let toastTimer;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy = value => JSON.parse(JSON.stringify(value));
const find = (collection,id) => db[collection].find(item => item.id === id);
const label = (collection,id,field='name') => find(collection,id)?.[field] || id;
const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
dailyDate = today();
const actor = () => role==='Supervisor'?supervisorIdentity:({Officer:'Officer J. Miller',Detective:'Detective A. Chen',Records:'Records clerk',Administrator:'Administrator'})[role];
const supervisorFor = officer => {const assignments=db.supervision||defaultSupervision;return Object.prototype.hasOwnProperty.call(assignments,officer)?assignments[officer]:''};
const demoPeople = ['Officer J. Miller','Detective A. Chen','Supervisor R. Patel','Administrator'];
const assigneeOptions = (selected='') => opts([...new Set([...demoPeople,...(selected?[selected]:[])])].map(id=>({id,text:id})),selected,'Unassigned');
const canViewInvestigation = c => c.access!=='Restricted'||role==='Supervisor'||role==='Administrator'||(c.accessUsers||[]).includes(actor());
const reportSections = {
 case: [
  {id:'header',title:'Report and occurrence',fields:[['agency','Agency'],['division','Division / precinct'],['ori','ORI'],['reportType','Original / supplement'],['reported','Date and time reported','datetime-local'],['occurredFrom','Occurred from','datetime-local'],['occurredTo','Occurred to','datetime-local'],['incidentType','Incident type'],['business','Business name'],['weapons','Weapons'],['address','Incident address'],['cityStateZip','City, state, ZIP'],['locationCode','Location code'],['victimCount','Number of victims','number'],['suspectCount','Number of suspects','number'],['victimAlsoComplainant','Victim also complainant']]},
  {id:'offenses',title:'Offenses',multiple:true,fields:[['number','Offense number'],['law','Law'],['section','Section'],['subsection','Subdivision'],['class','Class'],['category','Category'],['degree','Degree'],['attempted','Attempted'],['name','Name of offense'],['counts','Counts','number'],['tsled','T/SLED code']]},
  {id:'persons',title:'Associated persons and subjects',multiple:true,fields:[['person','Linked demo person','person'],['type','Person type / number'],['name','Name if not linked'],['alias','Alias / nickname'],['dob','Date of birth if not linked','date'],['age','Age','number'],['sex','Sex'],['race','Race'],['ethnicity','Ethnicity'],['address','Address'],['phone','Phone'],['condition','Apparent condition'],['residence','Residence status'],['handicap','Handicap'],['victimRights','Victim rights information provided'],['skin','Skin'],['height','Height'],['weight','Weight'],['hair','Hair'],['eyes','Eyes'],['glasses','Glasses / contacts'],['build','Build'],['occupation','Occupation'],['employer','Employer / school'],['employerAddress','Employer / school address'],['marks','Scars / marks / tattoos'],['misc','Miscellaneous']]},
  {id:'property',title:'Case report property',multiple:true,fields:[['personNumber','Victim / suspect number'],['status','Property status'],['type','Property type'],['quantity','Quantity / measure'],['make','Make / drug type'],['model','Model'],['serial','Serial number'],['description','Description'],['value','Value']]},
  {id:'vehicles',title:'Case report vehicles',multiple:true,fields:[['status','Vehicle status'],['plate','License plate'],['plateCompleteness','Full / partial plate'],['state','Plate state'],['expiry','Plate expiration year'],['plateType','Plate type'],['value','Value'],['year','Vehicle year'],['make','Make'],['model','Model'],['style','Style'],['vin','VIN'],['colors','Colors'],['towedBy','Towed by'],['towedTo','Towed to'],['notes','Vehicle notes','textarea']]},
  {id:'narrative',title:'Case narrative',fields:[['text','Narrative','textarea']]},
  {id:'administration',title:'Case administration',fields:[['inquiries','Inquiries'],['nyspin','NYSPIN message number'],['reportingOfficer','Reporting officer name / rank'],['officerId','Reporting officer ID'],['supervisor','Supervisor name / rank'],['supervisorId','Supervisor ID'],['closureReason','Closure reason'],['statusDate','Status date','date'],['notified','Notified / transferred to']]},
 ],
 arrest: [
  {id:'identifiers',title:'Report identifiers',fields:[['nysid','NYSID number'],['obts','OBTS number'],['reference','Reference number'],['fbi','FBI number'],['agency','Agency'],['division','Division / precinct']]},
  {id:'defendant',title:'Defendant details',fields:[['phone','Phone'],['address','Street address'],['cityStateZip','City, state, ZIP'],['residence','Residence status'],['birthPlace','Place of birth'],['age','Age','number'],['sex','Sex'],['race','Race'],['ethnicity','Ethnicity'],['skin','Skin'],['height','Height'],['weight','Weight'],['hair','Hair'],['eyes','Eyes'],['glasses','Glasses / contacts'],['build','Build'],['marital','Marital status'],['citizenship','U.S. citizenship'],['citizenOf','Citizen of'],['education','Education'],['religion','Religion'],['occupation','Occupation'],['employed','Employed'],['marks','Scars / marks / tattoos']]},
  {id:'circumstances',title:'Arrest circumstances',fields:[['officerId','Arresting officer ID'],['assistingOfficer','Assisting officer'],['assistingId','Assisting officer ID'],['arrestTime','Arrest time','time'],['juvenile','Juvenile / no further processing'],['condition','Condition at arrest'],['weapons','Weapons at arrest'],['codefendant','Co-defendant arrest number'],['miranda','Miranda given'],['mirandaBy','Miranda by'],['mirandaDate','Miranda date','date'],['mirandaTime','Miranda time','time'],['statements','Statements'],['status','Bail / parole / probation status'],['searchWarrant','Search warrant'],['idProcedure','Identification procedure'],['property','Property'],['evidence','Evidence'],['processedBy','Processed by'],['disposition','Disposition'],['arrestType','Arrest type'],['warrantNumber','Warrant number'],['arrestFoa','Arrest FOA'],['otherAgency','Other agency'],['fingerprints','Fingerprints taken'],['photoNumber','Photo number'],['safis','SAFIS latent print identification']]},
  {id:'court',title:'Arraignment, custody and return',fields:[['arraignmentCourt','Arraignment court'],['arraignmentJudge','Arraignment judge'],['arraignmentDate','Arraignment date','date'],['arraignmentTime','Arraignment time','time'],['arresteeStatus','Arrestee / release status'],['bailAmount','Bail amount'],['bondsman','Bondsman'],['returnCourt','Return court'],['returnJudge','Return judge'],['returnDate','Return date','date'],['returnTime','Return time','time'],['totAgency','Defendant / case transferred to agency'],['totOfficer','Receiving officer'],['totOfficerId','Receiving officer ID'],['totDate','Transfer date','date'],['totTime','Transfer time','time']]},
  {id:'offenseDetails',title:'Offense context',fields:[['location','Location of offense'],['date','Offense date','date'],['offenderCount','Number of offenders','number'],['victimCount','Number of victims','number']]},
  {id:'charges',title:'Charges',multiple:true,fields:[['law','Law'],['section','Article / section'],['subsection','Subdivision'],['class','Class'],['category','Category'],['degree','Degree'],['attempted','Attempted'],['name','Name of offense'],['counts','Counts','number'],['ncic','NCIC code'],['victimAge','Victim age'],['victimSex','Victim sex'],['victimHandicap','Victim handicap'],['associationNumber','Association number'],['type','Charge document type']]},
  {id:'persons',title:'Associated persons',multiple:true,fields:[['person','Linked demo person','person'],['type','Person type'],['name','Name if not linked'],['address','Address'],['phone','Phone']]},
  {id:'narrative',title:'Arrest narrative',fields:[['text','Narrative','textarea']]},
  {id:'administration',title:'Arrest administration',fields:[['arrestingOfficer','Arresting officer name'],['officerId','Officer ID'],['supervisor','Supervisor name'],['supervisorId','Supervisor ID']]},
 ]
};
const attachmentCategories = ['Other','Narrative','Follow-up','Statement','Deposition','Court document','Photograph','MV-104'];
const maxAttachmentBytes = 512*1024;
const maxTotalAttachmentBytes = 1024*1024;
const incidentSummary = id => {
 const i=find('incidents',id);if(!i)return '';
 const people=i.people.map(p=>`${link('person',p.id,label('people',p.id))} (${esc(p.role)})`).join(', ')||'None';
 const vehicles=i.vehicles.map(v=>{const p=(i.vehicleParticipants||[]).find(x=>x.vehicleId===v);return `${link('vehicle',v,label('vehicles',v,'description'))} (owner: ${p?.ownerId?link('person',p.ownerId,label('people',p.ownerId)):'Unknown'}; driver: ${p?.driverId?link('person',p.driverId,label('people',p.driverId)):'Unknown'})`}).join('<br>')||'None';
 const property=db.evidence.filter(e=>e.incidentId===id).map(e=>link('evidence-detail',e.id,e.name)).join(', ')||'None';
 const attachments=(i.attachments||[]).map((a,index)=>`${esc(a.name)} (${esc(a.category)}) ${btn('download-attachment','Download',`data-kind="incident" data-id="${esc(id)}" data-index="${index}"`)}`).join('<br>')||'None';
 return panel(id+' · '+i.type,`<div class="list"><div class="list-item">${link('incident',id,'Open incident')} · ${esc(i.date)} · ${esc(i.location)}</div><div class="list-item">Disposition: ${esc(i.disposition||'Not set')} · Reporting officer: ${esc(i.officer)}</div><div class="list-item">People: ${people}</div><div class="list-item">Vehicles: ${vehicles}</div><div class="list-item">Property/evidence: ${property}</div><div class="list-item">Incident attachments: ${attachments}</div><div class="list-item" style="white-space:pre-wrap">Incident description: ${esc(i.narrative||'None')}</div><div class="list-item">Supplements: ${i.supplements.map(s=>esc(s.text)).join('; ')||'None'}</div></div>`);
};
const stamp = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); };
const badge = value => `<span class="badge ${['Approved','Completed','Closed'].includes(value)?'ok':['Returned','Pending review','Open'].includes(value)?'warn':''}">${esc(value)}</span>`;
const link = (page,id,text) => `<button class="link" data-action="open" data-page="${esc(page)}" data-id="${esc(id)}">${esc(text)}</button>`;
function flash(message,error=false){const node=$('toast');node.textContent=message;node.className='toast'+(error?' error':'');node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,5000)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch(error){flash('Could not save to browser storage: '+error.message,true);return false}}
function record(action){db.audit.unshift({at:new Date().toISOString(),actor:actor(),action})}
function nextId(prefix,records){let n=1;while(records.some(x=>x.id===prefix+String(n).padStart(3,'0')))n++;return prefix+String(n).padStart(3,'0')}
function head(title,subtitle='',actions=''){if(view.page==='arrest'&&title===view.id)actions=recordNavigation('arrest',view.id)+actions;return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="muted">${esc(subtitle)}</p></div><div class="actions no-print">${actions}</div></div>`}
function btn(action,text,extra='',primary=false){return `<button class="${primary?'primary':'secondary'}" data-action="${action}" ${extra}>${esc(text)}</button>`}
function panel(title,content,actions=''){return `<section class="card"><div class="row between"><h2>${esc(title)}</h2><div class="actions no-print">${actions}</div></div>${content}</section>`}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}" class="empty">No records to display.</td></tr>`}</tbody></table></div>`}
function paginate(key,items,renderRows){
 const count=items.length,total=Math.max(1,Math.ceil(count/pageSize)),page=Math.min(Math.max(1,pages[key]||1),total);pages[key]=page;
 const start=(page-1)*pageSize;
 return renderRows(items.slice(start,start+pageSize))+`<div class="row between no-print" style="margin-top:12px"><span class="muted small">${count?`${start+1}–${Math.min(start+pageSize,count)} of ${count}`:'0 results'} · Page ${page} of ${total}</span><div class="actions"><button class="secondary" data-action="page" data-key="${esc(key)}" data-page="${page-1}" ${page===1?'disabled':''}>Previous</button><button class="secondary" data-action="page" data-key="${esc(key)}" data-page="${page+1}" ${page===total?'disabled':''}>Next</button></div></div>`;
}
function sequence(kind,items){displayedSequences[kind]=items.map(x=>x.id);return items}
function recordNavigation(kind,id){
 const ids=listSequence&&listSequence.kind===kind&&listSequence.ids.includes(id)?listSequence.ids:db[{incident:'incidents',case:'cases',arrest:'arrests'}[kind]].map(x=>x.id);
 const index=ids.indexOf(id);
 return `<span class="muted small">Record ${index+1} of ${ids.length}</span><button class="secondary" data-action="record-step" data-kind="${kind}" data-id="${esc(ids[index-1]||'')}" ${index<=0?'disabled':''}>← Previous</button><button class="secondary" data-action="record-step" data-kind="${kind}" data-id="${esc(ids[index+1]||'')}" ${index<0||index>=ids.length-1?'disabled':''}>Next →</button>`;
}
function indexSearch(kind,title,placeholder,items,renderer){
 const query=indexQueries[kind],q=query.trim().toLowerCase();
 const form=`<form id="index-search" data-kind="${kind}" class="fields no-print" style="margin-top:12px"><label>${esc(title)}<input type="search" name="query" value="${esc(query)}" placeholder="${esc(placeholder)}"></label><div class="actions"><button class="primary" type="submit">Search</button><button class="secondary" type="button" data-action="clear-index" data-kind="${kind}">Clear</button></div></form>`;
 return form+(q?paginate(kind,items.filter(x=>renderer.match(x).some(value=>String(value??'').toLowerCase().includes(q))),renderer.rows):'<p class="empty">Enter a search term to find records.</p>');
}
function opts(items,selected='',placeholder='Select...'){return `<option value="">${esc(placeholder)}</option>`+items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.text)}</option>`).join('')}
function show(page,id=null,query=''){if(page==='search'&&(view.page!=='search'||view.query!==query))for(const key of Object.keys(pages))if(key.startsWith('search-'))delete pages[key];view={page,id,query};render();window.scrollTo(0,0)}
function renderNav(){$('nav').innerHTML=navItems.map(([id,text])=>`<button data-action="navigate" data-page="${id}" class="${id==='arrests'?'subnav ':''}${view.page===id||(id==='arrests'&&view.page==='arrest')?'active':''}" ${view.page===id||(id==='arrests'&&view.page==='arrest')?'aria-current="page"':''}>${esc(text)}</button>`).join('')}
function render(){displayedSequences={};renderNav();const views={dashboard,workload,daily,incidents,incident,cases,case:caseDetail,arrests,arrest,people,person,vehicles,vehicle,evidence,'evidence-detail':evidenceDetail,warrants,warrant,review,filing,tasks,analytics,audit,settings,search};$('app').innerHTML=views[view.page]();$('role').value=role;$('supervisor-picker').hidden=role!=='Supervisor';$('supervisor').value=supervisorIdentity}
function listEvents(items){return items.length?`<div class="list timeline">${items.map(x=>`<div class="list-item"><div>${esc(x.action)}</div><div class="muted small">${esc(x.actor)} &middot; ${esc(stamp(x.at))}</div></div>`).join('')}</div>`:'<p class="empty">No activity yet.</p>'}
