'use strict';
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');if(!button)return;
 const kinds={'new-person':'people','link-person':'people','new-vehicle':'vehicles','link-vehicle':'vehicles','link-case':'cases','new-evidence':'evidence'};
 if(button.dataset.action==='new-case'){e.stopImmediatePropagation();if(button.dataset.id)createCaseFromIncident(button.dataset.id);else incidentPicker();return}
 const kind=kinds[button.dataset.action];if(!kind)return;
 e.stopImmediatePropagation();searchBeforeCreate(kind,button.dataset.id);
},true);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action,id=b.dataset.id;
 if(['new-task','new-arrest'].includes(action)&&id&&!requireCaseEdit(id)){e.stopImmediatePropagation();return}
 if(action==='toggle-task'){const task=find('tasks',id);if(task?.caseId&&!requireCaseEdit(task.caseId)){e.stopImmediatePropagation();return}}
 if(action==='case-submit'){e.stopImmediatePropagation();submitCase(id)}
 else if(action==='case-decision'){e.stopImmediatePropagation();decideCase(id)}
 else if(action==='case-reassign'){e.stopImmediatePropagation();reassignCase(id)}
 else if(action==='case-claim'){e.stopImmediatePropagation();claimDetectiveCase(id)}
 else if(action==='edit-supplement'){e.stopImmediatePropagation();supplement(id,b.dataset.index)}
 else if(action==='edit-case-item'){e.stopImmediatePropagation();caseItemForm(id,b.dataset.section,b.dataset.itemId)}
 else if(action==='file-case'){e.stopImmediatePropagation();fileCase(id)}
 else if(action==='link-arrest'){e.stopImmediatePropagation();linkArrestToCase(id)}
 else if(action==='assign-case-offenses'){e.stopImmediatePropagation();assignCaseOffenses(id,b.dataset.caseId)}
 else if(action==='vehicle-participants'){e.stopImmediatePropagation();vehicleParticipants(id,b.dataset.vehicle)}
},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='navigate')show(b.dataset.page);else if(a==='open'){const kind=b.dataset.page;listSequence=displayedSequences[kind]?.includes(id)?{kind,ids:[...displayedSequences[kind]]}:null;show(kind,id)}else if(a==='record-step'){if(id)show(b.dataset.kind,id)}else if(a==='page'){pages[b.dataset.key]=Number(b.dataset.page);render()}else if(a==='work-tab'){workloadTab=b.dataset.tab;render()}else if(a==='clear-index'){indexQueries[b.dataset.kind]='';pages[b.dataset.kind]=1;render()}else if(a==='clear-warrants'){warrantFilters={status:'',from:'',to:''};pages.warrants=1;render()}else if(a==='supervision')supervisionForm();else if(a==='assign-review')assignReview(id);else if(a==='search')show('search',null,$('search').value);else if(a==='close-modal')closeDialog();else if(a==='print')window.print();else if(a==='new-incident')incidentForm();else if(a==='edit-incident')incidentForm(id);else if(a==='incident-work')incidentWork(id);else if(a==='arrest-work')arrestWork(id);else if(a==='new-person')personForm();else if(a==='edit-person')personForm(id);else if(a==='new-vehicle')vehicleForm();else if(a==='link-person')linkPerson(id);else if(a==='supplement')supplement(id);else if(a==='edit-case')caseForm(id);else if(a==='new-arrest')arrestForm(id);else if(a==='edit-arrest'){const arrest=find('arrests',id);if(!arrest){flash('Arrest not found.',true);return}arrestForm(arrest.caseId,id)}else if(a==='edit-report-entry')reportEntryForm(b.dataset.kind,id,b.dataset.section,b.dataset.index);else if(a==='delete-report-entry')deleteReportEntry(b.dataset.kind,id,b.dataset.section,b.dataset.index);else if(a==='add-attachment')attachmentForm(b.dataset.kind,id);else if(a==='download-attachment')attachmentAction(b.dataset.kind,id,b.dataset.index,false);else if(a==='delete-attachment')attachmentAction(b.dataset.kind,id,b.dataset.index,true);else if(a==='generate-demo')generateDemo();else if(a==='new-evidence')evidenceForm(id);else if(a==='transfer')transfer(id);else if(a==='new-task')taskForm(id);else if(a==='review-decision')reviewForm(id);else if(a==='warrant-note')warrantNote(id);else if(a==='clear-filters'){reportFilters={from:'',to:'',type:'',status:''};render()}
 else if(a==='toggle-task'){const t=find('tasks',id);if(!t||(t.caseId&&!canViewInvestigation(find('cases',t.caseId)))){flash('Task is unavailable for the current demo role.',true);return}t.status=t.status==='Open'?'Completed':'Open';record('Marked task '+id+' '+t.status.toLowerCase());if(persist()){render();flash('Task updated.')}}
 else if(a==='reset'){if(confirm('Replace all demo records with the original fictional sample data?')){db=copy(initialData);if(persist()){show('dashboard');flash('Demo data reset.')}}}
 else if(a==='export'){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='arakne-rms-demo.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 else if(a==='import')$('import-file').click();
});
$('role').addEventListener('change',e=>{role=e.target.value;render();flash('Demo role changed to '+role+'. This is not authentication.')});
$('supervisor').addEventListener('change',e=>{supervisorIdentity=e.target.value;render();flash('Demo supervisor changed to '+supervisorIdentity+'. This is not authentication.')});
document.addEventListener('submit',e=>{if(e.target.id==='daily-filter'){e.preventDefault();const f=new FormData(e.target);dailyDate=f.get('date');pages['daily-incidents']=1;pages['daily-cases']=1;render();return}if(e.target.id==='index-search'){e.preventDefault();const kind=e.target.dataset.kind;indexQueries[kind]=new FormData(e.target).get('query').trim();pages[kind]=1;render();return}if(e.target.id==='warrant-filters'){e.preventDefault();const f=new FormData(e.target);if(f.get('from')&&f.get('to')&&f.get('from')>f.get('to')){flash('The start date must not be after the end date.',true);return}warrantFilters={status:f.get('status'),from:f.get('from'),to:f.get('to')};pages.warrants=1;render();return}if(e.target.id!=='report-filters')return;e.preventDefault();const f=new FormData(e.target);if(f.get('from')&&f.get('to')&&f.get('from')>f.get('to')){flash('The start date must not be after the end date.',true);return}reportFilters={from:f.get('from'),to:f.get('to'),type:f.get('type'),status:f.get('status')};render()});
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();show('search',null,e.target.value)}});
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeDialog()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').hidden)closeDialog()});
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const parsed=JSON.parse(await file.text());if(!validSnapshot(parsed))throw new Error('Invalid or incompatible demo snapshot');if(!confirm('Replace all current demo records with this snapshot?'))return;adoptLegacyIncidents(parsed);db=parsed;if(db.arrests===undefined)db.arrests=[];if(persist()){show('dashboard');flash('Demo snapshot imported.')}}catch(error){flash('Import failed: '+error.message,true)}});
load();render();
history.replaceState({...history.state,arakne:{view:{...view},scrollX:window.scrollX,scrollY:window.scrollY}},'');
window.addEventListener('popstate',e=>{if(!e.state?.arakne)return;closeDialog();view=e.state.arakne.view;render();window.scrollTo(e.state.arakne.scrollX,e.state.arakne.scrollY)});
