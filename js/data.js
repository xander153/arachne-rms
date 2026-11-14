'use strict';
function generateDemo(){
 const data=copy(db),types=['Burglary / Breaking & Entering','Simple Assault','Motor Vehicle Theft','Vandalism / Damage of Property','Other'],statuses=['Draft','Pending review','Approved','Returned'],officers=['Officer J. Miller','Officer S. Briggs','Officer T. Flores'],detectives=['Detective A. Chen','Detective R. West','Detective M. Diaz'];
 const dateOffset=days=>{const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
 for(let n=0;n<36;n++){
  const incidentId=nextId('INC-DEMO-',data.incidents),caseId=nextId('CASE-DEMO-',data.cases),victimId=nextId('P-DEMO-',data.people);
  data.people.push({id:victimId,name:'Fictional Person '+victimId,dob:'',aliases:'None listed',description:'Fictional reporting party'});
  const suspectId=nextId('P-DEMO-',data.people);data.people.push({id:suspectId,name:'Fictional Person '+suspectId,dob:'',aliases:'None listed',description:'Fictional person associated with an investigation'});
  const type=types[n%types.length],date=dateOffset(-2-n*3),location=(100+n*11)+' Demo Street',officer=officers[n%officers.length],assignee=detectives[n%detectives.length],status=statuses[n%statuses.length];
  const incident={id:incidentId,type,location,date,officer,status,reviewAssignee:status==='Pending review'?supervisorFor(officer):'',narrative:'Fictional training scenario involving '+type.toLowerCase()+'. Investigators are following up on reports and collected items.',people:[{id:victimId,role:'Reporting party'},{id:suspectId,role:'Person of interest'}],vehicles:[],supplements:[],reviewComments:[]};
  if(status==='Approved'||status==='Returned')incident.reviewComments.push({decision:status,text:'Fictional supervisor review.',author:'Supervisor R. Patel',at:date+'T12:00:00Z'});
  if(n%4===0)incident.supplements.push({text:'Fictional follow-up information was recorded.',author:officer,at:date+'T14:00:00Z'});
  data.incidents.push(incident);
  data.cases.push({id:caseId,title:type+' investigation '+incidentId,incidentIds:[incidentId],assignee,status:n%4===2?'Closed':'Open',openedDate:date,access:'Open',notes:'Fictional investigation; review the associated report and follow-up.'});incident.caseId=caseId;
  const evidenceId=nextId('E-DEMO-',data.evidence);data.evidence.push({id:evidenceId,name:['Scene photograph','Recorded statement','Recovered property'][n%3],incidentId,location:'Demo evidence locker '+(n%4+1),custodian:officer,history:[{date,from:'Collected',to:officer,note:'Fictional intake'}]});
  const taskId=nextId('T-DEMO-',data.tasks);data.tasks.push({id:taskId,title:['Review evidence','Contact reporting party','Prepare follow-up'][n%3],caseId,assignee,due:dateOffset(10-n),status:n%4===2?'Completed':'Open'});
  if(n%3===0){const id=nextId('V-DEMO-',data.vehicles);data.vehicles.push({id,description:['Fictional blue sedan','Fictional white van','Fictional gray pickup'][(n/3)%3],plate:'DEMO-'+id,incidentIds:[incidentId]});incident.vehicles.push(id)}
  if(n%4===1){const id=nextId('W-DEMO-',data.warrants);data.warrants.push({id,personId:suspectId,type:'Fictional bench warrant',status:'Listed in demo',issued:date,note:'Fictional record. Status and identity have not been verified.',checks:[]})}
  if(n%2===0){const id=nextId('ARR-DEMO-',data.arrests);data.arrests.push({id,caseId,personId:suspectId,date:dateOffset(-1-n*3),location,officer,assignee:officer,workStatus:'Open',charge:type,notes:'Fictional arrest for demonstration only.'})}
 }
 data.audit.unshift({at:new Date().toISOString(),actor:actor(),action:'Added 36 connected fictional demo scenarios'});
 if(!validSnapshot(data)){flash('Generated demo data failed validation; existing records were not changed.',true);return}
 try{localStorage.setItem(KEY,JSON.stringify(data))}catch(error){flash('Could not save generated demo data: '+error.message,true);return}
 db=data;show('dashboard');flash('Added 36 connected fictional demo scenarios.')
}
function validSnapshot(data){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const str=(x,keys)=>object(x)&&keys.every(k=>typeof x[k]==='string');
 const ids=x=>Array.isArray(x)&&x.every(v=>typeof v==='string');
 const arrays=['incidents','people','vehicles','cases','evidence','warrants','tasks','audit'];
 if(!object(data)||data.version!==1||!arrays.every(k=>Array.isArray(data[k])))return false;
 if(data.arrests!==undefined&&!Array.isArray(data.arrests))return false;
 const arrests=data.arrests===undefined?[]:data.arrests;
 if(!data.incidents.every(x=>str(x,['id','type','location','date','officer','status','narrative'])&&['Draft','Returned','Pending review','Approved'].includes(x.status)&&Array.isArray(x.people)&&x.people.every(p=>str(p,['id','role']))&&ids(x.vehicles)&&Array.isArray(x.supplements)&&x.supplements.every(s=>str(s,['text','author','at']))&&Array.isArray(x.reviewComments)&&x.reviewComments.every(c=>str(c,['decision','text','author','at']))))return false;
 if(!data.people.every(x=>str(x,['id','name','dob','aliases','description']))||!data.vehicles.every(x=>str(x,['id','description','plate'])&&ids(x.incidentIds))||!data.cases.every(x=>str(x,['id','title','assignee','status','notes'])&&['Open','Closed'].includes(x.status)&&ids(x.incidentIds)))return false;
 if(!data.evidence.every(x=>str(x,['id','name','incidentId','location','custodian'])&&Array.isArray(x.history)&&x.history.every(h=>str(h,['date','from','to','note'])))||!data.warrants.every(x=>str(x,['id','personId','type','status','issued','note'])&&Array.isArray(x.checks)&&x.checks.every(c=>str(c,['text','author','at']))))return false;
 if(!data.tasks.every(x=>str(x,['id','title','caseId','assignee','due','status'])&&['Open','Completed'].includes(x.status))||!data.audit.every(x=>str(x,['at','actor','action'])))return false;
 if(!arrests.every(x=>str(x,['id','caseId','personId','date','location','officer','charge','notes']))||new Set(arrests.map(x=>x.id)).size!==arrests.length)return false;
 if(!data.incidents.every(x=>(x.assignee===undefined||typeof x.assignee==='string')&&(x.attention===undefined||typeof x.attention==='boolean')))return false;
 if(!data.incidents.every(x=>x.reviewAssignee===undefined||x.reviewAssignee===''||supervisors.includes(x.reviewAssignee)))return false;
 if(data.supervision!==undefined&&(!object(data.supervision)||!Object.entries(data.supervision).every(([officer,supervisor])=>officer.trim()&&supervisors.includes(supervisor))))return false;
 if(!data.cases.every(x=>(x.openedDate===undefined||typeof x.openedDate==='string')&&(x.access===undefined||['Open','Restricted'].includes(x.access))&&(x.accessUsers===undefined||ids(x.accessUsers))))return false;
 if(!data.incidents.every(x=>x.disposition===undefined||typeof x.disposition==='string'))return false;
 if(!data.incidents.every(x=>x.caseId===undefined||typeof x.caseId==='string'))return false;
 if(![...data.cases,...arrests].every(x=>x.workHistory===undefined||(Array.isArray(x.workHistory)&&x.workHistory.every(w=>str(w,['at','assignedTo','assignedBy','status','note'])))))return false;
 if(!data.incidents.every(x=>x.vehicleParticipants===undefined||(Array.isArray(x.vehicleParticipants)&&x.vehicleParticipants.every(p=>str(p,['vehicleId','ownerId','driverId'])&&x.vehicles.includes(p.vehicleId)&&(!p.ownerId||x.people.some(a=>a.id===p.ownerId))&&(!p.driverId||x.people.some(a=>a.id===p.driverId)))&&new Set(x.vehicleParticipants.map(p=>p.vehicleId)).size===x.vehicleParticipants.length)))return false;
 if(!data.cases.every(x=>(x.disposition===undefined||typeof x.disposition==='string')&&(x.reviewState===undefined||['Not submitted','Pending review','Returned','Approved','Follow-up'].includes(x.reviewState))&&(x.reviewAssignee===undefined||supervisors.includes(x.reviewAssignee))&&(x.filingStatus===undefined||['','Ready for filing','Filed'].includes(x.filingStatus))&&(x.reviewHistory===undefined||(Array.isArray(x.reviewHistory)&&x.reviewHistory.every(h=>str(h,['decision','comment','actor','at']))))))return false;
 if(!arrests.every(x=>x.caseIds===undefined||(ids(x.caseIds)&&x.caseIds.includes(x.caseId)&&new Set(x.caseIds).size===x.caseIds.length)))return false;
 if(!arrests.every(x=>(x.assignee===undefined||typeof x.assignee==='string')&&(x.workStatus===undefined||['Open','Completed'].includes(x.workStatus))))return false;
 const validReport=(item,kind)=>item.report===undefined||(object(item.report)&&Object.entries(item.report).every(([key,value])=>{
  const section=reportSections[kind].find(s=>s.id===key);if(!section)return false;
  const validEntry=entry=>object(entry)&&Object.entries(entry).every(([field,value])=>(section.fields.some(f=>f[0]===field)||(kind==='case'&&key==='offenses'&&field==='offenseId'&&value))&&typeof value==='string')&&(!entry.person||data.people.some(p=>p.id===entry.person));
  return section.multiple?Array.isArray(value)&&value.every(validEntry):validEntry(value);
 }));
 const validAttachment=a=>{
  if(!str(a,['name','type','category','author','at','data'])||!a.name||!['application/pdf','image/png','image/jpeg','text/plain'].includes(a.type)||!attachmentCategories.includes(a.category)||!Number.isInteger(a.size)||a.size<1||a.size>maxAttachmentBytes||(a.category==='Photograph'&&!['image/png','image/jpeg'].includes(a.type))||(a.category==='MV-104'&&a.type!=='application/pdf')||a.data.length!==4*Math.ceil(a.size/3)||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.data))return false;
  try{return atob(a.data).length===a.size}catch(error){return false}
 };
 if(!data.cases.every(x=>validReport(x,'case'))||!arrests.every(x=>validReport(x,'arrest')))return false;
 if(!data.cases.every(c=>{const ids=(c.report?.offenses||[]).map(o=>o.offenseId).filter(Boolean);return new Set(ids).size===ids.length}))return false;
 if(!arrests.every(a=>a.offenseLinks===undefined||(Array.isArray(a.offenseLinks)&&a.offenseLinks.every(ref=>str(ref,['caseId','offenseId'])&&(a.caseIds||[a.caseId]).includes(ref.caseId)&&data.cases.some(c=>c.id===ref.caseId&&(c.report?.offenses||[]).some(o=>o.offenseId===ref.offenseId)))&&new Set(a.offenseLinks.map(ref=>JSON.stringify([ref.caseId,ref.offenseId]))).size===a.offenseLinks.length)))return false;
 const reportRecords=[...data.incidents,...data.cases,...arrests];
 if(!reportRecords.every(x=>x.attachments===undefined||(Array.isArray(x.attachments)&&x.attachments.every(validAttachment))))return false;
 if(reportRecords.flatMap(x=>x.attachments||[]).reduce((sum,a)=>sum+a.size,0)>maxTotalAttachmentBytes)return false;
 for(const key of arrays.filter(x=>x!=='audit'))if(new Set(data[key].map(x=>x.id)).size!==data[key].length)return false;
 const has=(key,id)=>data[key].some(x=>x.id===id);
 return data.incidents.every(x=>x.people.every(p=>has('people',p.id))&&x.vehicles.every(id=>has('vehicles',id))&&(!x.caseId||data.cases.some(c=>c.id===x.caseId&&c.incidentIds.includes(x.id))))&&data.vehicles.every(x=>x.incidentIds.every(id=>has('incidents',id)))&&data.cases.every(x=>x.incidentIds.every(id=>has('incidents',id)))&&data.evidence.every(x=>has('incidents',x.incidentId))&&data.warrants.every(x=>has('people',x.personId))&&data.tasks.every(x=>!x.caseId||has('cases',x.caseId))&&arrests.every(x=>has('cases',x.caseId)&&(!x.caseIds||x.caseIds.every(id=>has('cases',id)))&&has('people',x.personId));
}
// Older snapshots: an incident that already has a case is managed by (the first) linked case.
function adoptLegacyIncidents(data){for(const c of data.cases)for(const id of c.incidentIds){const i=data.incidents.find(x=>x.id===id);if(i&&!i.caseId)i.caseId=c.id}}
function load(){try{const raw=localStorage.getItem(KEY);if(!raw){db=copy(initialData);persist();return}const parsed=JSON.parse(raw);if(!validSnapshot(parsed))throw new Error('Stored data is invalid');adoptLegacyIncidents(parsed);db=parsed;if(db.arrests===undefined)db.arrests=[]}catch(error){db=copy(initialData);flash('Could not load stored demo data: '+error.message+'. Sample data is shown without replacing storage.',true)}}
