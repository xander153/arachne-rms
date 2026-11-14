'use strict';
const pendingDisposition='Investigation Pending';
const closingDispositions=['Closed by Investigation','Closed by Arrest'];
const caseDispositions=[pendingDisposition,...closingDispositions];
const caseReviewState=c=>c.reviewState||'Not submitted';
const arrestCaseIds=a=>a.caseIds||[a.caseId];
const caseEditable=c=>!!c&&canViewInvestigation(c)&&!['Pending review','Approved'].includes(caseReviewState(c));
// The case that has taken over an incident; incident data is then maintained from that case.
const incidentCase=i=>i&&i.caseId?find('cases',i.caseId)||null:null;
const incidentBlockingCases=id=>db.cases.filter(c=>c.incidentIds.includes(id)&&['Pending review','Approved'].includes(caseReviewState(c)));
const incidentEditable=i=>!!i&&incidentBlockingCases(i.id).length===0&&(!incidentCase(i)||caseEditable(incidentCase(i)));
function workEntry(c,status,assignedTo,note=''){c.workHistory=c.workHistory||[];c.workHistory.push({at:new Date().toISOString(),assignedTo:assignedTo||'',assignedBy:actor(),status,note})}
function backToIncident(id){const c=incidentCase(find('incidents',id));if(c&&view.page==='case'&&view.id===c.id)show('case',c.id);else show('incident',id)}
const incidentCaseReview=i=>{const states=[...new Set(db.cases.filter(c=>c.incidentIds.includes(i.id)).map(caseReviewState))];return states.length===0?'No case linked':states.length===1?states[0]:'Mixed statuses'};
function requireCaseEdit(id){if(caseEditable(find('cases',id)))return true;flash('This case is unavailable or locked for review. A supervisor must reassign an approved case.',true);return false}
function requireIncidentEdit(id){const i=find('incidents',id);if(incidentEditable(i))return true;flash('This incident is locked by its case, which is unavailable or pending/approved. A supervisor must return or reassign all affected cases before editing.',true);return false}
function submitCase(id){
 const c=find('cases',id);if(!requireCaseEdit(id))return;
 if(!closingDispositions.includes(c.disposition)){flash('Choose a closing case disposition (not Investigation Pending) before submitting for review.',true);return}
 openDialog('Submit case for review',`<p class="muted">Select the supervisor working the shift. Any supervisor may review this case.</p><div class="fields">${selectField('supervisor','Shift supervisor',opts(supervisors.map(id=>({id,text:id})),c.reviewAssignee||''))}</div>`,'Submit',f=>{
  if(!requireCaseEdit(id))return;const reviewer=f.get('supervisor');if(!supervisors.includes(reviewer)){flash('Select a supervisor.',true);return}
  const before=copy(db);c.reviewState='Pending review';c.reviewAssignee=reviewer;c.filingStatus='';c.status='Closed';workEntry(c,'Submitted for Review',reviewer);record('Submitted case '+id+' to '+reviewer+' for review');if(!persist()){db=before;return}closeDialog();show('case',id);flash('Case submitted for review.')
 })
}
function decideCase(id){
 const c=find('cases',id);if(role!=='Supervisor'||!c||caseReviewState(c)!=='Pending review'){flash('A pending case and Supervisor demo role are required.',true);return}
 openDialog('Review case '+id,`<p class="muted">Assigned supervisor: ${esc(c.reviewAssignee||'Unassigned')}. Any supervisor may decide.</p><div class="fields">${selectField('decision','Decision',opts([{id:'Approved',text:'Approve'},{id:'Returned',text:'Return for correction'}]))}${textField('comment','Review comment')}</div>`,'Save decision',f=>{
  if(role!=='Supervisor'||caseReviewState(c)!=='Pending review'){flash('The case is no longer available for review.',true);return}
  const decision=f.get('decision'),comment=f.get('comment').trim();if(!['Approved','Returned'].includes(decision)||!comment){flash('Select a decision and enter a comment.',true);return}
  const before=copy(db);c.reviewState=decision;c.filingStatus=decision==='Approved'?'Ready for filing':'';c.reviewHistory=c.reviewHistory||[];c.reviewHistory.push({decision,comment,actor:actor(),at:new Date().toISOString()});workEntry(c,decision==='Approved'?'Record Approved':'Returned for Correction',c.assignee,comment);record(decision+' case '+id);if(!persist()){db=before;return}closeDialog();show('case',id);flash('Case '+decision.toLowerCase()+'.')
 })
}
function reassignCase(id){
 const c=find('cases',id);if(role!=='Supervisor'||!c||caseReviewState(c)!=='Approved'){flash('Only a supervisor may reassign an approved case.',true);return}
 openDialog('Reassign approved case',`<p class="muted">The case will require another review; any prior filing remains in history.</p><div class="fields">${selectField('assignee','Assigned to',assigneeOptions(c.assignee))}${textField('comment','Follow-up reason')}</div>`,'Reassign',f=>{
  if(role!=='Supervisor'||caseReviewState(c)!=='Approved'){flash('This case is no longer available for reassignment.',true);return}
  const assignee=f.get('assignee'),comment=f.get('comment').trim();if(!assignee||!comment){flash('Select an assignee and enter a reason.',true);return}
  const before=copy(db);c.reviewState='Follow-up';c.status='Open';c.assignee=assignee;c.filingStatus='';c.reviewHistory=c.reviewHistory||[];c.reviewHistory.push({decision:'Follow-up',comment,actor:actor(),at:new Date().toISOString()});workEntry(c,'Follow-Up After Approval',assignee,comment);record('Reassigned approved case '+id+' to '+assignee);if(!persist()){db=before;return}closeDialog();show('case',id);flash('Case reassigned for follow-up.')
 })
}
function fileCase(id){
 const c=find('cases',id);if(role!=='Records'||!c||caseReviewState(c)!=='Approved'||c.filingStatus!=='Ready for filing'){flash('Select a case ready for filing as the Records demo role.',true);return}
 const before=copy(db);c.filingStatus='Filed';c.reviewHistory=c.reviewHistory||[];c.reviewHistory.push({decision:'Filed',comment:'Sent to records filing.',actor:actor(),at:new Date().toISOString()});workEntry(c,'Filed',c.assignee,'Sent to records filing.');record('Filed case '+id);if(!persist()){db=before;return}render();flash('Case marked filed.')
}
function linkArrestToCase(caseId){
 if(!requireCaseEdit(caseId))return;
 openDialog('Link existing arrest',`<p class="muted">Choose an existing arrest; one arrest may be linked to multiple cases.</p><div class="fields">${selectField('arrest','Arrest',opts(db.arrests.map(a=>({id:a.id,text:a.id+' · '+label('people',a.personId)}))))}</div>`,'Link arrest',f=>{
  if(!requireCaseEdit(caseId))return;const a=find('arrests',f.get('arrest'));if(!a){flash('Select an arrest.',true);return}if(arrestCaseIds(a).includes(caseId)){flash('This arrest is already linked to the case.',true);return}
  const before=copy(db);a.caseIds=[...arrestCaseIds(a),caseId];record('Linked arrest '+a.id+' to case '+caseId);if(!persist()){db=before;return}closeDialog();show('case',caseId);flash('Arrest linked.')
 })
}
function assignCaseOffenses(arrestId,caseId){
 const arrest=find('arrests',arrestId),c=find('cases',caseId);
 if(!arrest||!arrestCaseIds(arrest).includes(caseId)||!requireCaseEdit(caseId))return;
 const offenses=c.report?.offenses||[];
 if(!offenses.length){flash('Add offenses to this case before assigning them to an arrest.',true);return}
 const selected=new Set((arrest.offenseLinks||[]).filter(ref=>ref.caseId===caseId).map(ref=>ref.offenseId));
 openDialog('Assign offenses to '+arrestId,`<p class="muted">Select only offenses attributed to ${esc(label('people',arrest.personId))} in ${esc(caseId)}. This does not create arrest charges.</p><div class="list">${offenses.map((offense,index)=>`<label class="list-item"><input type="checkbox" name="offense" value="${index}" ${offense.offenseId&&selected.has(offense.offenseId)?'checked':''}> ${esc(offense.name||'Unnamed offense')} · ${esc([offense.law,offense.section,offense.subsection].filter(Boolean).join(' ')||'No statute recorded')}</label>`).join('')}</div>`,'Save assignments',f=>{
  const current=find('arrests',arrestId),caseRecord=find('cases',caseId);
  if(!current||!caseRecord||!arrestCaseIds(current).includes(caseId)||!requireCaseEdit(caseId))return;
  const entries=caseRecord.report?.offenses||[],indexes=f.getAll('offense').map(value=>Number(value));
  if(indexes.some(n=>!Number.isInteger(n)||n<0||n>=entries.length)||new Set(indexes).size!==indexes.length){flash('Invalid offense selection.',true);return}
  const before=copy(db),refs=[];
  for(const n of indexes){const offense=entries[n];if(!offense.offenseId)offense.offenseId=nextId('OFF-',entries.filter(o=>o.offenseId).map(o=>({id:o.offenseId})));refs.push({caseId,offenseId:offense.offenseId})}
  current.offenseLinks=[...(current.offenseLinks||[]).filter(ref=>ref.caseId!==caseId),...refs];
  record('Updated case offense assignments for arrest '+arrestId+' and case '+caseId);
  if(!persist()){db=before;return}closeDialog();show('arrest',arrestId);flash('Offense assignments saved.')
 })
}
function vehicleParticipants(incidentId,vehicleId){
 const incident=find('incidents',incidentId),vehicle=find('vehicles',vehicleId);
 if(!incident||!vehicle||!incident.vehicles.includes(vehicleId)||!requireIncidentEdit(incidentId))return;
 const existing=(incident.vehicleParticipants||[]).find(x=>x.vehicleId===vehicleId)||{};
 const choices=incident.people.map(p=>p.id).filter((id,index,all)=>all.indexOf(id)===index).map(id=>({id,text:label('people',id)+' · '+id}));
 openDialog('Vehicle owner and driver',`<p class="muted">Select people already linked to this incident. Leave blank when unknown.</p><div class="fields">${selectField('owner','Owner',opts(choices,existing.ownerId||'','Unknown'),false)}${selectField('driver','Driver',opts(choices,existing.driverId||'','Unknown'),false)}</div>`,'Save',f=>{
  if(!requireIncidentEdit(incidentId))return;const owner=f.get('owner'),driver=f.get('driver');if([owner,driver].some(id=>id&&!incident.people.some(p=>p.id===id))){flash('Select people linked to this incident.',true);return}
  const before=copy(db);incident.vehicleParticipants=(incident.vehicleParticipants||[]).filter(x=>x.vehicleId!==vehicleId);incident.vehicleParticipants.push({vehicleId,ownerId:owner,driverId:driver});record('Updated incident vehicle participants for '+vehicleId+' on '+incidentId);if(!persist()){db=before;return}closeDialog();backToIncident(incidentId);flash('Vehicle participants saved.')
 })
}
