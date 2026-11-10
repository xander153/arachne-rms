'use strict';
function dashboard(){
 const metrics=[['Incidents',db.incidents.length,'incidents'],['Open cases',db.cases.filter(x=>x.status==='Open').length,'cases'],['Arrests',db.arrests.length,'arrests'],['Awaiting review',db.cases.filter(x=>caseReviewState(x)==='Pending review').length,'review'],['Open tasks',db.tasks.filter(x=>x.status==='Open').length,'tasks'],['Evidence items',db.evidence.length,'evidence'],['Listed warrants',db.warrants.length,'warrants']];
 return head('Dashboard','A connected, fictional RMS workflow')+`<div class="stack"><div class="grid metrics">${metrics.map(([name,count,page])=>`<div class="card metric"><button data-action="navigate" data-page="${page}"><span class="muted">${name}</span><strong>${count}</strong><span class="small">View records &rarr;</span></button></div>`).join('')}</div><div class="grid columns">${panel('Start the sample scenario',`<p class="muted" style="margin:10px 0">Follow the Market Street burglary from incident through evidence, review and investigation.</p>${link('incident','INC-2026-891','Open sample incident →')}`)}${panel('Recent demo activity',listEvents(db.audit.slice(0,5)),btn('navigate','View all','data-page="audit"'))}</div></div>`
}
function workload(){
 const name=actor();
 const supervisor=role==='Supervisor'||role==='Administrator';
 const incidentRows=items=>table(['Incident','Type','Date','Assigned to'],items.map(i=>`<tr><td>${link('incident',i.id,i.id)}</td><td>${esc(i.type)}</td><td>${esc(i.date)}</td><td>${esc(i.assignee||'Unassigned')}</td></tr>`));
 const caseRows=items=>table(['Case','Title','Status','Assigned to'],items.map(c=>`<tr><td>${link('case',c.id,c.id)}</td><td>${esc(c.title)}</td><td>${badge(c.status)}</td><td>${esc(c.assignee||'Unassigned')}</td></tr>`));
 const groups=[
  {id:'incidents',title:'Assigned incidents',items:db.incidents.filter(i=>i.assignee===name),rows:incidentRows,kind:'incident'},
  {id:'cases',title:'Cases needing work',items:db.cases.filter(c=>c.assignee===name&&(c.status==='Open'||['Returned','Follow-up'].includes(caseReviewState(c)))),rows:caseRows,kind:'case'},
  {id:'arrests',title:'Open arrests',items:db.arrests.filter(a=>a.assignee===name&&(a.workStatus||'Open')==='Open'),rows:arrestTable,kind:'arrest'},
  {id:'tasks',title:'Open follow-up tasks',items:db.tasks.filter(t=>t.assignee===name&&t.status==='Open'&&(!t.caseId||canViewInvestigation(find('cases',t.caseId)))),rows:taskTable}
 ];
 if(role==='Supervisor')groups.push({id:'reviews',title:'Assigned reviews',items:db.cases.filter(c=>caseReviewState(c)==='Pending review'&&c.reviewAssignee===name),rows:reviewTable,kind:'case'});
 if(supervisor)groups.push({id:'unassigned-cases',title:'Unassigned open cases',items:db.cases.filter(c=>!c.assignee&&c.status==='Open'),rows:caseRows,kind:'case'},{id:'unassigned-arrests',title:'Unassigned open arrests',items:db.arrests.filter(a=>!a.assignee&&(a.workStatus||'Open')==='Open'),rows:arrestTable,kind:'arrest'});
 const selected=groups.find(g=>g.id===workloadTab)||groups[0];
 if(selected.kind)sequence(selected.kind,selected.items);
 return head('My work','Assignments for '+name+' · demo identity')+`<div class="stack"><div class="tabs" aria-label="Work categories">${groups.map(g=>`<button class="${g===selected?'primary':'secondary'}" data-action="work-tab" data-tab="${g.id}" ${g===selected?'aria-current="true"':''}>${esc(g.title)} (${g.items.length})</button>`).join('')}</div>${panel(selected.title,paginate('work-'+selected.id,selected.items,selected.rows))}<p class="muted small">Incidents are optional assignments. Closing one record does not close linked records. Role and access controls are simulations only.</p></div>`;
}
function daily(){
 const incidents=db.incidents.filter(i=>i.attention&&i.date===dailyDate);
 const cases=db.cases.filter(c=>c.openedDate===dailyDate);
 sequence('incident',incidents);sequence('case',cases);
 return head('Daily attention','Flagged incidents by incident date and cases by date opened')+`<div class="stack"><form id="daily-filter" class="card fields no-print">${field('date','Date',dailyDate,'date')}<div class="actions"><button type="submit" class="primary">Show date</button></div></form>${panel('Flagged incidents',paginate('daily-incidents',incidents,items=>table(['Incident','Type','Location','Assigned to'],items.map(i=>`<tr><td>${link('incident',i.id,i.id)}</td><td>${esc(i.type)}</td><td>${esc(i.location)}</td><td>${esc(i.assignee||'Unassigned')}</td></tr>`))))}${panel('Cases opened',paginate('daily-cases',cases,items=>table(['Case','Title','Status','Assigned to'],items.map(c=>`<tr><td>${link('case',c.id,c.id)}</td><td>${esc(c.title)}</td><td>${badge(c.status)}</td><td>${esc(c.assignee||'Unassigned')}</td></tr>`))))}<p class="small muted">Older demo cases without a recorded opening date cannot appear in the case list until a date is added.</p></div>`;
}
