'use strict';
function incidentWork(id){
 const i=find('incidents',id);if(!i){flash('Incident not found.',true);return}
 if(!requireIncidentEdit(id))return;
 openDialog('Incident assignment & attention',`<div class="fields">${selectField('assignee','Work assigned to (optional)',assigneeOptions(i.assignee),false)}${selectField('attention','Daily attention',opts([{id:'no',text:'Not flagged'},{id:'yes',text:'Flagged'}],i.attention?'yes':'no'))}</div>`,'Save',f=>{
  if(!requireIncidentEdit(id))return;const previous=i.assignee||'',assignee=f.get('assignee');i.assignee=assignee;i.attention=f.get('attention')==='yes';
  if(previous!==assignee)record('Changed incident '+id+' assignment from '+(previous||'Unassigned')+' to '+(assignee||'Unassigned'));
  record('Updated daily attention for incident '+id+' to '+(i.attention?'flagged':'not flagged'));done('Incident work updated.','incident',id)
 })
}
function arrestWork(id){
 const a=find('arrests',id);if(!a){flash('Arrest not found.',true);return}
 openDialog('Arrest assignment & work status',`<div class="fields">${selectField('assignee','Work assigned to',assigneeOptions(a.assignee),false)}${selectField('workStatus','Work status (not release status)',opts(['Open','Completed'].map(id=>({id,text:id})),a.workStatus||'Open'))}</div>`,'Save',f=>{
  const before=copy(db),previous=a.assignee||'',assignee=f.get('assignee'),previousStatus=a.workStatus||'Open';a.assignee=assignee;a.workStatus=f.get('workStatus');
  if(previous!==assignee){workEntry(a,'Record Reassigned',assignee,'Previously assigned to '+(previous||'Unassigned'));record('Changed arrest '+id+' assignment from '+(previous||'Unassigned')+' to '+(assignee||'Unassigned'))}
  if(previousStatus!==a.workStatus){workEntry(a,'Work status: '+a.workStatus,assignee,'Previously '+previousStatus);record('Changed arrest '+id+' work status from '+previousStatus+' to '+a.workStatus)}
  if(!persist()){db=before;return}closeDialog();show('arrest',id);flash('Arrest work updated.')
 })
}
function incidentForm(id){const x=id?find('incidents',id):null;if(id&&!requireIncidentEdit(id))return;const types=['Traffic Stop','Motor Vehicle Accident','Larceny','Robbery','Burglary / Breaking & Entering','Simple Assault','Motor Vehicle Theft','Vandalism / Damage of Property','Other'];const dispositions=['Citation Issued','Warning Issued','Report Taken'];openDialog(x?'Edit incident':'New incident',`<div class="fields">${selectField('type','Incident classification',opts(types.map(t=>({id:t,text:t})),x?.type))}${selectField('disposition','Incident disposition',opts(dispositions.map(id=>({id,text:id})),x?.disposition||'','Not set'),false)}${field('date','Incident date',x?.date||today(),'date')}${field('location','Location',x?.location||'')}${field('officer','Reporting officer',x?.officer||actor())}${textField('narrative','Incident description',x?.narrative||'',false)}</div><p class="small muted">Basic demo field checks only; no NIBRS validation or submission.</p>`,'Save incident',f=>{if(id&&!requireIncidentEdit(id))return;const data={type:f.get('type').trim(),disposition:f.get('disposition'),date:f.get('date'),location:f.get('location').trim(),officer:f.get('officer').trim(),narrative:f.get('narrative').trim()};if(!data.type||!data.location||!data.officer){flash('Complete the required fields.',true);return}let target;if(x){Object.assign(x,data);target=x.id;record('Updated incident '+target)}else{target=nextId('INC-DEMO-',db.incidents);db.incidents.unshift({id:target,...data,status:'Draft',people:[],vehicles:[],supplements:[],reviewComments:[]});record('Created incident '+target)}done('Incident saved.','incident',target)})}
function linkPerson(id,personId){const incident=find('incidents',id),person=find('people',personId);if(!incident||!person){flash('The selected incident or person is unavailable.',true);return}if(!requireIncidentEdit(id))return;openDialog('Link person',`<p>${esc(person.name)} · ${esc(person.id)}</p><div class="fields">${selectField('role','Role in this incident',opts(['Victim','Witness','Reporting party','Suspect','Person of interest','Owner','Driver','Owner/operator','Other'].map(r=>({id:r,text:r}))))}</div>`,'Link person',f=>{if(!requireIncidentEdit(id))return;const r=f.get('role');if(incident.people.some(p=>p.id===personId&&p.role===r)){flash('That person already has this role on the incident.',true);return}incident.people.push({id:personId,role:r});record('Linked person '+personId+' to '+id+' as '+r);done('Person linked.','incident',id)})}
function personForm(id,incidentId){const p=id?find('people',id):null;openDialog(p?'Edit person':'New person',`<div class="fields">${field('name','Name',p?.name||'')}${field('dob','Date of birth',p?.dob||'','date',false)}${field('aliases','Aliases',p?.aliases||'', 'text',false)}${field('description','Description',p?.description||'','text',false)}</div>`,'Save person',f=>{const name=f.get('name').trim();if(!name){flash('Enter a name.',true);return}const before=copy(db),data={name,dob:f.get('dob'),aliases:f.get('aliases').trim(),description:f.get('description').trim()};const target=p?p.id:nextId('P-DEMO-',db.people);if(p)Object.assign(p,data);else db.people.push({id:target,...data});record((p?'Updated ':'Created ')+'person '+target);if(incidentId){if(!persist()){db=before;return}linkPerson(incidentId,target);flash('Person saved. Select their incident role.')}else done('Person saved.','person',target)})}
function vehicleForm(incidentId){openDialog('New vehicle',`<div class="fields">${field('description','Vehicle description')}${field('plate','Plate')}${selectField('incident','Linked incident',opts(db.incidents.map(i=>({id:i.id,text:i.id+' · '+i.type})),incidentId),false)}</div>`,'Save vehicle',f=>{const description=f.get('description').trim(),plate=f.get('plate').trim();if(!description||!plate){flash('Complete the required fields.',true);return}const id=nextId('V-DEMO-',db.vehicles),incident=f.get('incident');db.vehicles.push({id,description,plate,incidentIds:incident?[incident]:[]});if(incident)find('incidents',incident).vehicles.push(id);record('Created vehicle '+id);done('Vehicle saved.','vehicle',id)})}
function supplement(id){if(!requireIncidentEdit(id))return;openDialog('Add supplemental narrative',`<div class="fields">${textField('text','Supplement')}</div>`,'Add supplement',f=>{if(!requireIncidentEdit(id))return;const text=f.get('text').trim();if(!text){flash('Enter a supplement.',true);return}find('incidents',id).supplements.push({text,author:actor(),at:new Date().toISOString()});record('Added supplement to '+id);done('Supplement added.','incident',id)})}
// Cases are created from an incident with no form; this edits an existing case.
function createCaseFromIncident(incidentId,existingCaseId){
 const incident=find('incidents',incidentId);
 if(!incident){flash('Incident not found.',true);return}
 if(incidentCase(incident)){flash('This incident is already managed by case '+incident.caseId+'.',true);return}
 if(!requireIncidentEdit(incidentId))return;
 const before=copy(db);let target=existingCaseId;
 if(target){
  const existing=find('cases',target);
  if(!existing||!requireCaseEdit(target))return;
  if(!existing.incidentIds.includes(incidentId))existing.incidentIds.push(incidentId);
  record('Linked incident '+incidentId+' to case '+target+'; the case now manages the incident');
 }else{
  target=nextId('CASE-DEMO-',db.cases);const owner=actor();
  const created={id:target,title:incident.type,incidentIds:[incidentId],assignee:owner,status:'Open',disposition:pendingDisposition,openedDate:today(),access:'Open',accessUsers:[],notes:''};
  workEntry(created,'Initially Assigned',owner);
  db.cases.unshift(created);record('Created case '+target+' from incident '+incidentId+' and assigned it to '+owner);
 }
 incident.caseId=target;
 if(!persist()){db=before;return}
 closeDialog();show('case',target);flash(existingCaseId?'Incident linked; the case now manages it.':'Case '+target+' created and assigned to you.');
}
function caseForm(id){
 const c=find('cases',id);
 if(!c||!requireCaseEdit(id))return;
 const accessOptions=demoPeople.map(name=>`<option value="${esc(name)}" ${(c.accessUsers||[]).includes(name)?'selected':''}>${esc(name)}</option>`).join('');
 openDialog('Edit case',`<div class="fields">${selectField('assignee','Primary investigator',assigneeOptions(c.assignee),false)}${selectField('status','Status',opts(['Open','Closed'].map(s=>({id:s,text:s})),c.status||'Open'))}${selectField('disposition','Case disposition',opts(caseDispositions.map(id=>({id,text:id})),c.disposition||'','Not set'),false)}${field('openedDate','Date opened',c.openedDate||'','date')}${selectField('access','Investigation access (simulated)',opts(['Open','Restricted'].map(s=>({id:s,text:s})),c.access||'Open'))}<label class="wide">People allowed to view restricted investigation material<select name="accessUsers" multiple size="4">${accessOptions}</select></label>${textField('notes','Investigation notes',c.notes||'',false)}</div><p class="small muted">For multiple selections, use Ctrl-click (or Command-click on Mac). Restricted access is a visual simulation, not security.</p>`,'Save case',f=>{
  const assignee=f.get('assignee'),accessUsers=f.getAll('accessUsers'),openedDate=f.get('openedDate');
  if(!openedDate||accessUsers.some(name=>!demoPeople.includes(name))){flash('Enter an opening date and select valid demo people.',true);return}
  if(!requireCaseEdit(id))return;
  const previous=c.assignee;
  Object.assign(c,{assignee,status:f.get('status'),disposition:f.get('disposition'),openedDate,access:f.get('access'),accessUsers,notes:f.get('notes').trim()});
  if(previous!==assignee){workEntry(c,'Record Reassigned',assignee);record('Changed case '+id+' assignment from '+(previous||'Unassigned')+' to '+(assignee||'Unassigned'))}
  record('Updated case '+id);done('Case saved.','case',id)
 })
}
function evidenceForm(incidentId){openDialog('Register evidence',`<div class="fields">${field('name','Item description')}${selectField('incident','Linked incident',opts(db.incidents.map(i=>({id:i.id,text:i.id+' · '+i.type})),incidentId))}${field('custodian','Initial custodian',actor())}${field('location','Storage location')}</div>`,'Register item',f=>{const name=f.get('name').trim(),custodian=f.get('custodian').trim(),location=f.get('location').trim();if(!name||!custodian||!location){flash('Complete the required fields.',true);return}const id=nextId('E-DEMO-',db.evidence);db.evidence.unshift({id,name,incidentId:f.get('incident'),custodian,location,history:[{date:today(),from:'Collected',to:custodian,note:'Initial simulated intake'}]});record('Registered evidence '+id);done('Evidence registered.','evidence-detail',id)})}
function transfer(id){const e=find('evidence',id);openDialog('Record custody transfer',`<p class="muted">Current custodian: ${esc(e.custodian)}</p><div class="fields">${field('to','New custodian')}${field('location','New storage location',e.location)}${textField('note','Transfer note','',false)}</div>`,'Record transfer',f=>{const to=f.get('to').trim(),location=f.get('location').trim();if(!to||!location){flash('Complete the required fields.',true);return}e.history.push({date:today(),from:e.custodian,to,note:f.get('note').trim()});e.custodian=to;e.location=location;record('Recorded simulated custody transfer for '+id);done('Transfer recorded.','evidence-detail',id)})}
function taskForm(caseId){if(caseId&&(!find('cases',caseId)||!canViewInvestigation(find('cases',caseId)))){flash('This investigation is unavailable for the current demo role.',true);return}openDialog('Create task',`<div class="fields">${field('title','Task')}${field('assignee','Assigned to',actor())}${field('due','Due date','','date',false)}${selectField('case','Linked case',opts(db.cases.filter(canViewInvestigation).map(c=>({id:c.id,text:c.id+' · '+c.title})),caseId),false)}</div>`,'Create task',f=>{const title=f.get('title').trim(),assignee=f.get('assignee').trim(),linked=f.get('case');if(!title||!assignee||(linked&&(!find('cases',linked)||!canViewInvestigation(find('cases',linked))))){flash('Complete the required fields and select an available case.',true);return}const id=nextId('T-DEMO-',db.tasks);db.tasks.unshift({id,title,assignee,due:f.get('due'),caseId:linked,status:'Open'});record('Created task '+id);done('Task created.',caseId?'case':'tasks',caseId||null)})}
function supervisionForm(){openDialog('Configure direct supervision',`<p class="muted">Use the exact reporting officer name on the incident. This fictional mapping determines review routing.</p><div class="fields">${field('officer','Reporting officer')}${selectField('supervisor','Direct supervisor',opts(supervisors.map(id=>({id,text:id}))))}</div>`,'Save relationship',f=>{const officer=f.get('officer').trim(),supervisor=f.get('supervisor');if(!officer||!supervisors.includes(supervisor)){flash('Enter an officer and select a supervisor.',true);return}const before=copy(db);db.supervision={...(db.supervision||defaultSupervision),[officer]:supervisor};record('Configured direct supervisor for '+officer+' as '+supervisor);if(!persist()){db=before;return}closeDialog();show('settings');flash('Reporting relationship saved.')})}
function assignReview(id){const i=find('incidents',id);if(!i||i.status!=='Pending review'||!['Supervisor','Administrator'].includes(role)){flash('A pending report and supervisor or administrator demo role are required.',true);return}const supervisor=supervisorFor(i.officer);if(!supervisor){flash('Configure a direct supervisor for '+i.officer+' in Demo settings first.',true);return}openDialog('Assign review',`<p>Reporting officer: ${esc(i.officer)}<br>Configured direct supervisor: ${esc(supervisor)}<br>Current reviewer: ${esc(i.reviewAssignee||'Unassigned')}</p><p class="muted">Change the reporting relationship in Demo settings if a different supervisor is needed.</p>`,'Assign review',()=>{if(i.status!=='Pending review'||supervisorFor(i.officer)!==supervisor||!['Supervisor','Administrator'].includes(role)){flash('The report or reporting relationship changed. Try again.',true);return}const before=copy(db);i.reviewAssignee=supervisor;record('Assigned review of '+id+' to '+supervisor);if(!persist()){db=before;return}closeDialog();render();flash('Review assigned.')})}
function reviewForm(id){const i=find('incidents',id);if(role!=='Supervisor'||!i||i.status!=='Pending review'||i.reviewAssignee!==actor()){flash('This pending report must be assigned to the current supervisor.',true);return}openDialog('Review '+id,`<div class="fields">${selectField('decision','Decision',opts([{id:'Approved',text:'Approve'},{id:'Returned',text:'Return for revision'}]))}${textField('text','Review comment')}</div>`,'Save decision',f=>{if(role!=='Supervisor'||i.status!=='Pending review'||i.reviewAssignee!==actor()){flash('This report is no longer assigned to the current supervisor.',true);return}const text=f.get('text').trim();if(!text){flash('Enter a review comment.',true);return}i.status=f.get('decision');i.reviewComments.push({decision:i.status,text,author:actor(),at:new Date().toISOString()});record(i.status+' incident '+id);done('Review decision recorded.','incident',id)})}
function warrantNote(id){openDialog('Add simulated check note',`<p class="muted">This records a demo note only. It does not verify the warrant.</p><div class="fields">${textField('text','Note')}</div>`,'Save note',f=>{const text=f.get('text').trim();if(!text){flash('Enter a note.',true);return}find('warrants',id).checks.push({text,author:actor(),at:new Date().toISOString()});record('Added simulated warrant note to '+id);done('Demo note saved.','warrant',id)})}
function casePeople(c){
 const roles=new Map(),add=(id,role)=>{if(!id||!find('people',id))return;const list=roles.get(id)||[];if(role&&!list.includes(role))list.push(role);roles.set(id,list)};
 c.incidentIds.forEach(id=>find('incidents',id)?.people.forEach(p=>add(p.id,p.role)));
 if(canViewInvestigation(c))(c.report?.persons||[]).forEach(p=>add(p.person,p.type));
 return [...roles].map(([id,list])=>({id,role:list.join(', ')}));
}
const sectionKeys=(kind,sectionId)=>reportSections[kind].find(s=>s.id===sectionId).fields.map(f=>f[0]);
const pickKnown=(entry,keys)=>Object.fromEntries(keys.filter(k=>entry&&entry[k]).map(k=>[k,entry[k]]));
// Builds the arrest report sections that can be carried over from the case when an arrest is recorded.
function arrestFromCase(c,personId,offenses,officer){
 const report={},defendant=pickKnown((c.report?.persons||[]).find(p=>p.person===personId),sectionKeys('arrest','defendant'));
 if(Object.keys(defendant).length)report.defendant=defendant;
 const charges=offenses.map(o=>pickKnown(o,sectionKeys('arrest','charges'))).filter(x=>Object.keys(x).length);
 if(charges.length)report.charges=charges;
 const associated=[],seen=new Set(),personKeys=sectionKeys('arrest','persons');
 for(const entry of c.report?.persons||[]){if(entry.person&&entry.person===personId)continue;const v=pickKnown(entry,personKeys);if(Object.keys(v).length){associated.push(v);if(v.person)seen.add(v.person)}}
 for(const id of c.incidentIds)for(const p of find('incidents',id)?.people||[]){if(p.id===personId||seen.has(p.id))continue;seen.add(p.id);associated.push({person:p.id,type:p.role})}
 if(associated.length)report.persons=associated;
 const header=c.report?.header||{},first=find('incidents',c.incidentIds[0]);
 const details=pickKnown({location:first?.location,date:first?.date,offenderCount:header.suspectCount,victimCount:header.victimCount},sectionKeys('arrest','offenseDetails'));
 if(Object.keys(details).length)report.offenseDetails=details;
 const administration=pickKnown({arrestingOfficer:officer,supervisor:supervisorFor(officer)},sectionKeys('arrest','administration'));
 if(Object.keys(administration).length)report.administration=administration;
 return report;
}
const offenseText=o=>(o.name||'Unnamed offense')+' · '+([o.law,o.section,o.subsection].filter(Boolean).join(' ')||'No statute recorded');
function arrestForm(caseId,arrestId){
 const c=find('cases',caseId),existing=arrestId?find('arrests',arrestId):null;
 if(!c||(arrestId&&!existing)||(!existing&&!canViewInvestigation(c))){flash('This record is unavailable for the current demo role.',true);return}
 const people=casePeople(c);
 if(existing&&!people.some(p=>p.id===existing.personId))people.push({id:existing.personId,role:'Current arrestee'});
 if(!people.length){flash('Add people to the case (incident people or case report persons) before recording an arrest.',true);return}
 const offenses=existing||!canViewInvestigation(c)?[]:(c.report?.offenses||[]);
 const personOptions=opts(people.map(p=>({id:p.id,text:label('people',p.id)+' · '+p.id+(p.role?' ('+p.role+')':'')})),existing?.personId);
 const offenseChoices=offenses.length?`<div class="wide"><strong>Charges from case offenses</strong><p class="muted small">Selected offenses become this arrest's charges and are assigned to the arrestee. Review them before saving.</p><div class="list">${offenses.map((o,index)=>`<label class="list-item"><input type="checkbox" name="offense" value="${index}" checked> ${esc(offenseText(o))}</label>`).join('')}</div></div>`:'';
 openDialog(existing?'Edit arrest '+existing.id:'Record arrest for '+c.id,`<p class="muted">People come from this case${offenses.length?' and charges from its offenses':''}. Details already recorded on the case are carried over. This fictional record does not imply a conviction.</p><div class="fields">${selectField('person','Person',personOptions)}${field('date','Arrest date',existing?.date||today(),'date')}${field('location','Arrest location',existing?.location||'')}${field('officer','Arresting officer',existing?.officer||actor())}${existing?'':selectField('assignee','Work assigned to',assigneeOptions(actor()),false)}${offenseChoices}${field('charge',existing?'Primary charge':offenses.length?'Additional charge (optional)':'Primary charge',existing?.charge||'','text',!!existing||!offenses.length)}${textField('notes','Notes',existing?.notes||'',false)}</div>`,existing?'Save arrest':'Record arrest',f=>{
  const personId=f.get('person'),date=f.get('date'),location=f.get('location').trim(),officer=f.get('officer').trim(),assignee=existing?existing.assignee:f.get('assignee'),extraCharge=f.get('charge').trim();
  const currentCase=find('cases',caseId);
  if(existing&&existing.personId!==personId&&(existing.offenseLinks||[]).length){flash('Remove linked case offenses before changing the arrested person.',true);return}
  if(!currentCase||(!existing&&!canViewInvestigation(currentCase))||!find('people',personId)||!people.some(p=>p.id===personId)||!date||!location||!officer){flash('Select a person from the case and complete the required fields.',true);return}
  const entries=existing?[]:(currentCase.report?.offenses||[]),indexes=f.getAll('offense').map(Number);
  if(indexes.some(n=>!Number.isInteger(n)||n<0||n>=entries.length)||new Set(indexes).size!==indexes.length){flash('Invalid offense selection.',true);return}
  const chosen=indexes.map(n=>entries[n]),charge=existing?extraCharge:[...chosen.map(o=>o.name||'Unnamed offense'),extraCharge].filter(Boolean).join('; ');
  if(!charge){flash('Select at least one case offense or enter a charge.',true);return}
  const before=copy(db),id=existing?existing.id:nextId('ARR-DEMO-',db.arrests),values={personId,date,location,officer,charge,notes:f.get('notes').trim()};
  if(existing)Object.assign(existing,values);
  else{
   const links=chosen.map(o=>{if(!o.offenseId)o.offenseId=nextId('OFF-',entries.filter(x=>x.offenseId).map(x=>({id:x.offenseId})));return {caseId,offenseId:o.offenseId}});
   const report=arrestFromCase(currentCase,personId,chosen,officer);
   if(extraCharge)report.charges=[...(report.charges||[]),{name:extraCharge}];
   const arrest={id,caseId,...values,assignee,workStatus:'Open',...(links.length?{offenseLinks:links}:{}),...(Object.keys(report).length?{report}:{})};workEntry(arrest,'Initially Assigned',assignee);db.arrests.unshift(arrest);record('Assigned arrest '+id+' to '+(assignee||'Unassigned'))
  }
  record((existing?'Updated arrest ':'Recorded arrest ')+id+' for case '+caseId);
  if(!persist()){db=before;return}closeDialog();show('arrest',id);flash('Arrest saved.')
 })
}
