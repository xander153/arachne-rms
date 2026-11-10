'use strict';
function reportRecord(kind,id){
 const item=find(kind==='case'?'cases':kind==='incident'?'incidents':'arrests',id);
 if(!item||(kind==='case'&&!canViewInvestigation(item))){flash('This report is unavailable for the current demo role.',true);return null}
 return item;
}
function reportView(kind,item,editable=true){
 const sections=reportSections[kind],report=item.report||{};
 const content=sections.map(section=>{
  const entries=section.multiple?(report[section.id]||[]):[report[section.id]||{}];
  const rows=entries.map((entry,index)=>{
   const values=section.fields.filter(([key])=>entry[key]).map(([key,title,type])=>`<div class="list-item"><strong>${esc(title)}:</strong> ${type==='person'?link('person',entry[key],label('people',entry[key])):esc(entry[key])}</div>`).join('');
   const controls=editable&&section.multiple?`<div class="actions no-print">${btn('edit-report-entry','Edit',`data-kind="${kind}" data-id="${esc(item.id)}" data-section="${section.id}" data-index="${index}"`)}${btn('delete-report-entry','Remove',`data-kind="${kind}" data-id="${esc(item.id)}" data-section="${section.id}" data-index="${index}"`)}</div>`:'';
   return `<div class="list-item">${section.multiple?`<strong>Entry ${index+1}</strong>`:''}<div class="list">${values||'<div class="muted">No values recorded.</div>'}</div>${controls}</div>`;
  }).join('')||'<p class="empty">No entries recorded.</p>';
  const action=editable?btn('edit-report-entry',section.multiple?'Add entry':'Edit section',`data-kind="${kind}" data-id="${esc(item.id)}" data-section="${section.id}"`):'';
  return panel(section.title,`<div class="list">${rows}</div>`,action);
 }).join('');
 return `<h2>${kind==='case'?'Case':'Arrest'} report fields${editable?'':' (read-only)'}</h2><p class="muted small">Based on the supplied ${kind==='case'?'DCJS-3205 (11/06)':'DCJS-3203 (4/94)'} example. Illustrative only; not an official form, validation, signature, or submission. Social Security numbers and signatures are not captured. Fields here are report-specific; linked incident and person data remain live and are not copied.</p>${content}`;
}
function reportEntryForm(kind,id,sectionId,index){
 const item=reportRecord(kind,id),section=reportSections[kind]?.find(s=>s.id===sectionId);if(!item||!section)return;
 if(kind==='case'&&!requireCaseEdit(id))return;
 const entries=(item.report||{})[sectionId],editing=index!==undefined&&index!=='';
 const entry=section.multiple?(editing?(entries||[])[Number(index)]:{}):(entries||{});
 if(!entry){flash('Report entry not found.',true);return}
 const fields=section.fields.map(([key,title,type])=>type==='textarea'?textField(key,title,entry[key]||'',false):type==='person'?selectField(key,title,opts(db.people.map(p=>({id:p.id,text:p.name+' · '+p.id})),entry[key]||'','None'),false):field(key,title,entry[key]||'',type||'text',false)).join('');
 const lawLookup=(kind==='case'&&sectionId==='offenses')||(kind==='arrest'&&sectionId==='charges');
 openDialog((editing?'Edit ':section.multiple?'Add ':'Edit ')+section.title,`${lawLookup?lawLookupMarkup():''}<div class="fields">${fields}</div><p class="muted small">Fictional data only. Linked person fields show current person information; other fields are specific to this report.</p>`,'Save section',f=>{
  if(!reportRecord(kind,id)||(kind==='case'&&!requireCaseEdit(id)))return;
  const values=Object.fromEntries(section.fields.map(([key])=>[key,String(f.get(key)||'').trim()]));
  if(section.multiple&&!Object.values(values).some(Boolean)){flash('Enter at least one value.',true);return}
  if(values.person&&!find('people',values.person)){flash('Select a valid demo person.',true);return}
  if(sectionId==='header'&&values.occurredFrom&&values.occurredTo&&values.occurredFrom>values.occurredTo){flash('Occurred to must not be before occurred from.',true);return}
  const before=copy(db),target=find(kind==='case'?'cases':'arrests',id);target.report=target.report||{};
  if(section.multiple){target.report[sectionId]=target.report[sectionId]||[];if(editing)target.report[sectionId][Number(index)]=values;else target.report[sectionId].push(values)}else target.report[sectionId]=values;
  record('Updated '+kind+' '+id+' report section '+section.title);
  if(!persist()){db=before;return}closeDialog();show(kind,id);flash('Report section saved.')
 });
 if(lawLookup)setupLawLookup();
}
function deleteReportEntry(kind,id,sectionId,index){
 const item=reportRecord(kind,id),section=reportSections[kind]?.find(s=>s.id===sectionId&&s.multiple),n=Number(index);
 if(!item||!section||!Number.isInteger(n)||n<0||!item.report?.[sectionId]?.[n]){flash('Report entry not found.',true);return}
 if(kind==='case'&&!requireCaseEdit(id))return;
 if(!confirm('Remove this report entry?'))return;
 const before=copy(db);item.report[sectionId].splice(n,1);record('Removed '+kind+' '+id+' report entry from '+section.title);
 if(!persist()){db=before;return}render();flash('Report entry removed.')
}
function attachmentsView(kind,item,editable=true){
 const list=item.attachments||[];
 const rows=list.map((a,index)=>`<div class="list-item"><strong>${esc(a.name)}</strong> · ${esc(a.category)} · ${Math.ceil(a.size/1024)} KB<div class="small muted">Added by ${esc(a.author)} · ${esc(stamp(a.at))}</div>${a.category==='Photograph'&&['image/png','image/jpeg'].includes(a.type)?`<img alt="Fictional attachment ${esc(a.name)}" src="data:${a.type};base64,${a.data}" style="display:block;max-width:180px;max-height:180px;margin:8px 0">`:''}<div class="actions no-print">${btn('download-attachment','Download',`data-kind="${kind}" data-id="${esc(item.id)}" data-index="${index}"`)}${editable?btn('delete-attachment','Remove',`data-kind="${kind}" data-id="${esc(item.id)}" data-index="${index}"`):''}</div></div>`).join('')||'<p class="empty">No attachments.</p>';
 return panel('Fictional attachments',`<p class="muted small">Stored unencrypted in this browser and included in JSON exports. PDF, PNG, JPEG or text only; 512 KB per file, 1 MB total. Downloads are not scanned. Case restrictions are only simulated; arrest attachments are visible with the arrest.</p><div class="list">${rows}</div>`,editable?btn('add-attachment','Add attachment',`data-kind="${kind}" data-id="${esc(item.id)}"`):'');
}
function attachmentForm(kind,id){
 if(!reportRecord(kind,id))return;
 if((kind==='case'&&!requireCaseEdit(id))||(kind==='incident'&&!requireIncidentEdit(id)))return;
 openDialog('Add fictional attachment',`<p class="muted">Do not upload real reports, photographs or sensitive information. Files are stored unencrypted in browser storage and exported with the demo snapshot.</p><div class="fields">${selectField('category','Document type',opts(attachmentCategories.map(id=>({id,text:id}))))}<label class="wide">Fictional file (PDF, PNG, JPEG or text; maximum 512 KB)<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain" required></label></div>`,'Add attachment',async f=>{
  const file=f.get('file'),category=f.get('category'),types=['application/pdf','image/png','image/jpeg','text/plain'];
  if(!file||!file.name||!file.size||file.size>maxAttachmentBytes||!types.includes(file.type)||!attachmentCategories.includes(category)){flash('Choose a non-empty PDF, PNG, JPEG or text file of at most 512 KB and a document type.',true);return}
  if(category==='Photograph'&&!['image/png','image/jpeg'].includes(file.type)){flash('Photographs must be PNG or JPEG files.',true);return}
  if(category==='MV-104'&&file.type!=='application/pdf'){flash('An MV-104 attachment must be a PDF.',true);return}
  const total=[...db.incidents,...db.cases,...db.arrests].flatMap(x=>x.attachments||[]).reduce((sum,a)=>sum+a.size,0);
  if(total+file.size>maxTotalAttachmentBytes){flash('The demo attachment total would exceed 1 MB. Remove an attachment first.',true);return}
  let encoded;const dialog=$('dialog-form'),submit=dialog.querySelector('[type="submit"]'),uploader=actor();submit.disabled=true;
  try{const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));encoded=btoa(binary)}catch(error){flash('Could not read attachment: '+error.message,true);return}finally{submit.disabled=false}
  if($('modal').hidden||$('dialog-form')!==dialog||actor()!==uploader){flash('Attachment was not saved because the dialog or demo role changed.',true);return}
  const target=reportRecord(kind,id);if(!target)return;
  if((kind==='case'&&!requireCaseEdit(id))||(kind==='incident'&&!requireIncidentEdit(id)))return;
  const currentTotal=[...db.incidents,...db.cases,...db.arrests].flatMap(x=>x.attachments||[]).reduce((sum,a)=>sum+a.size,0);
  if(currentTotal+file.size>maxTotalAttachmentBytes){flash('The demo attachment total would exceed 1 MB.',true);return}
  const before=copy(db);target.attachments=target.attachments||[];target.attachments.push({name:file.name,type:file.type,size:file.size,category,author:uploader,at:new Date().toISOString(),data:encoded});record('Added attachment to '+kind+' '+id);
  if(!persist()){db=before;return}closeDialog();show(kind,id);flash('Fictional attachment saved.')
 })
}
function attachmentAction(kind,id,index,remove){
 const item=reportRecord(kind,id),n=Number(index);if(!item)return;
 const a=Number.isInteger(n)&&n>=0?(item.attachments||[])[n]:null;if(!a){flash('Attachment not found.',true);return}
 if(remove){if((kind==='case'&&!requireCaseEdit(id))||(kind==='incident'&&!requireIncidentEdit(id)))return;if(!confirm('Remove this attachment?'))return;const before=copy(db);item.attachments.splice(n,1);record('Removed attachment from '+kind+' '+id);if(!persist()){db=before;return}render();flash('Attachment removed.');return}
 const bytes=Uint8Array.from(atob(a.data),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),anchor=document.createElement('a');anchor.href=url;anchor.download=a.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
