const http = require('http');

function api(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 4000,
      path: '/api/v1' + path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const j = JSON.parse(data);
        if (res.statusCode >= 400) reject(new Error(res.statusCode + ' ' + path + ' :: ' + (j.message || data)));
        else resolve(j);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(m, p) {
  const r = await api('/auth/login', 'POST', { mobile: m, password: p });
  return r.data;
}

async function main() {
  const admin = await login('09120000001', 'Admin@123456');
  const emp = await login('09120000004', 'Employee@123456');
  const sup = await login('09120000003', 'Supervisor@123456');
  const empId = emp.user.employeeProfile.id;

  const date = new Date().toISOString().split('T')[0];
  const items = { "item1": "YES", "item2": "YES", "item3": "YES", "item4": "NO", "item5": "NA" };
  const cl = await api('/checklists/daily/' + empId, 'POST', { date, items }, emp.accessToken);
  console.log('PASS daily checklist completion=' + cl.completionRate + '%');

  const wkStart = new Date(); wkStart.setDate(wkStart.getDate() - wkStart.getDay());
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 6);
  const wc = await api('/checklists/weekly/' + empId, 'POST', { weekStart: wkStart.toISOString().split('T')[0], weekEnd: wkEnd.toISOString().split('T')[0], items: {a:"YES",b:"YES",c:"YES"}, performanceScore: 82 }, emp.accessToken);
  console.log('PASS weekly checklist completion=' + wc.completionRate + '%');

  const tasks = await api('/tasks?status=APPROVED&limit=1', 'GET', null, sup.accessToken);
  if (tasks.data.length > 0) {
    const tid = tasks.data[0].id;
    const scores = { scientific_accuracy:5, analysis_correctness:4, interpretation_quality:4, personalization:4, protocol_compliance:5, writing_quality:4, documentation:4, timeliness:3, independence:4, professional_ethics:5 };
    const ev = await api('/evaluations', 'POST', { taskAssignmentId: tid, scores, result: 'APPROVED', comment: 'good' }, sup.accessToken);
    console.log('PASS evaluation score100=' + ev.score100 + ' result=' + ev.result);
    const qc = await api('/quality-control', 'POST', { taskAssignmentId: tid, outputType: 'report', qualityScore: 88, result: 'APPROVED' }, sup.accessToken);
    console.log('PASS QC result=' + qc.result + ' score=' + qc.qualityScore);
  }

  const psCode = 'CASE-TEST-' + Date.now();
  const ps = await api('/psychometric', 'POST', { caseCode: psCode, employeeId: empId, assessmentType: 'type-a', tool: 'SCL-90' }, emp.accessToken);
  console.log('PASS psychometric created: ' + ps.caseCode);
  const pu = await api('/psychometric/' + ps.id + '/status', 'PATCH', { assessmentStatus: 'COMPLETED', analysisStatus: 'IN_PROGRESS' }, emp.accessToken);
  console.log('PASS psychometric status: ' + pu.assessmentStatus);

  const tr = await api('/training', 'POST', { employeeId: empId, title: 'Training test', type: 'ONLINE', status: 'COMPLETED', examScore: 90, supervisorScore: 85 }, sup.accessToken);
  console.log('PASS training: ' + tr.title);

  const kpi = await api('/kpi/recalculate/' + empId, 'POST', null, admin.accessToken);
  console.log('PASS KPI: finalScore=' + kpi.finalScore + ' classification=' + kpi.classification + ' (scores breakdown: ' + JSON.stringify(kpi.scores) + ')');

  const period = new Date().toISOString().slice(0, 7);
  const mr = await api('/monthly-reviews/generate?period=' + period + '&employeeId=' + empId, 'POST', null, admin.accessToken);
  console.log('PASS monthly-review: kpiScore=' + mr.kpiScore + ' rank=' + mr.performanceRank + ' tasks=' + mr.totalTasks);

  const dash = await api('/dashboard/executive', 'GET', null, admin.accessToken);
  console.log('PASS dashboard: employees=' + dash.cards.totalEmployees + ' tasks=' + dash.cards.totalTasks + ' completion=' + dash.cards.completionRate + '%');

  const charts = await api('/dashboard/charts', 'GET', null, admin.accessToken);
  console.log('PASS charts: employeeComparison=' + charts.employeeComparison.length + ' weeklyTrend=' + charts.weeklyTrend.length + ' revisionRate=' + charts.revisionRate + '%');

  const notifs = await api('/notifications', 'GET', null, emp.accessToken);
  console.log('PASS notifications: count=' + notifs.data.length + ' unread=' + notifs.unreadCount);

  const notifsAdmin = await api('/notifications', 'GET', null, admin.accessToken);
  console.log('PASS admin notifications: count=' + notifsAdmin.data.length + ' unread=' + notifsAdmin.unreadCount);

  console.log('\n=== ALL PHASE 3-4-5 INTEGRATION TESTS PASSED ===');
}

main().catch(e => { console.error('FAIL: ' + e.message); process.exit(1); });