// Export the tasks currently on screen. Both formats take the already-filtered
// list, so whatever the page shows is exactly what comes out.
// No PDF library: the browser's own print-to-PDF renders the styled HTML below.

const COLUMNS = [
	'Title',
	'Status',
	'Project',
	'Department',
	'Assignees',
	'Due date',
	'Created'
] as const;

const STATUS_LABEL: Record<string, string> = {
	todo: 'To Do',
	in_progress: 'In Progress',
	done: 'Completed'
};

const date = (v: any) => (v ? new Date(v).toLocaleDateString() : '');

export function isOverdue(task: any): boolean {
	return (
		!!task.due_date &&
		task.status !== 'done' &&
		new Date(task.due_date) < new Date(new Date().toDateString())
	);
}

/** One task as the row both formats print. Pure - see taskExport.test.ts. */
export function taskRow(task: any): string[] {
	return [
		task.title ?? '',
		STATUS_LABEL[task.status] ?? task.status ?? '',
		task.expand?.project?.name ?? '',
		task.expand?.department?.name ?? '',
		(task.expand?.assignees ?? []).map((a: any) => a.name).join(', '),
		date(task.due_date),
		date(task.created)
	];
}

// A leading =, +, - or @ makes Excel treat the cell as a formula, so a task
// title is enough to run something on open. Prefix it out.
const csvCell = (v: string) => {
	const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
	return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(tasks: any[]): string {
	return [COLUMNS, ...tasks.map(taskRow)].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function save(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = Object.assign(document.createElement('a'), { href: url, download: filename });
	a.click();
	URL.revokeObjectURL(url);
}

export function exportCsv(tasks: any[], filename = 'tasks') {
	// Without the BOM, Excel reads the UTF-8 as latin-1 and mangles every accent.
	save(new Blob(['\ufeff' + toCsv(tasks)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

const escapeHtml = (v: string) =>
	v.replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
	);

/** Opens a print-ready report; the browser's print dialog saves it as PDF. */
export function exportPdf(
	tasks: any[],
	opts: { title?: string; scope?: string; filters?: string }
) {
	const title = opts.title ?? 'Tasks';
	const count = (s: string) => tasks.filter((t) => t.status === s).length;
	const stats = [
		['Total', tasks.length],
		['To Do', count('todo')],
		['In Progress', count('in_progress')],
		['Completed', count('done')],
		['Overdue', tasks.filter(isOverdue).length]
	] as const;

	const rows = tasks
		.map((task) => {
			const [t, status, project, dept, assignees, due, created] = taskRow(task).map(escapeHtml);
			return `<tr>
				<td class="t"><b>${t}</b>${project ? `<span class="tag">${project}</span>` : ''}</td>
				<td><span class="pill ${task.status}">${status}</span></td>
				<td>${dept || '<i>—</i>'}</td>
				<td>${assignees || '<i>Unassigned</i>'}</td>
				<td class="${isOverdue(task) ? 'due' : ''}">${due || '<i>—</i>'}</td>
				<td>${created}</td>
			</tr>`;
		})
		.join('');

	const origin = typeof location === 'undefined' ? '' : location.origin;
	const html = `<!doctype html><html><head><meta charset="utf-8">
<base href="${origin}/">
<title>${escapeHtml(title)}</title>
<style>
	@page { size: A4 landscape; margin: 14mm; }
	* { box-sizing: border-box; }
	body { margin: 0; font: 11px/1.5 ui-sans-serif, system-ui, sans-serif; color: #38392f; }
	header { display: flex; align-items: center; gap: 14px;
	         border-bottom: 2px solid #947a2c; padding-bottom: 12px; margin-bottom: 16px; }
	header img { height: 34px; width: auto; }
	.titles { flex: 1; min-width: 0; }
	h1 { margin: 0; font-size: 22px; letter-spacing: -0.02em; color: #525344; }
	.sub { margin: 4px 0 0; color: #7b7c6d; }
	.meta { text-align: right; color: #7b7c6d; white-space: nowrap; }
	.stats { display: flex; gap: 8px; margin-bottom: 16px; }
	.stat { flex: 1; border: 1px solid #e6e2d7; background: #f7f5f0; border-radius: 8px; padding: 8px 12px; }
	.stat b { display: block; font-size: 20px; color: #525344; }
	.stat span { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a8b7b; }
	table { width: 100%; border-collapse: collapse; }
	thead { display: table-header-group; }
	th { text-align: left; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
	     color: #8a8b7b; border-bottom: 1px solid #d8d3c6; padding: 0 8px 6px; }
	td { padding: 7px 8px; border-bottom: 1px solid #efebe2; vertical-align: top; }
	tr { break-inside: avoid; }
	tbody tr:nth-child(even) { background: #faf9f5; }
	.t { width: 34%; }
	.tag { margin-left: 6px; font-size: 9px; padding: 1px 5px; border-radius: 4px;
	       background: #efebe2; color: #6e5a1f; white-space: nowrap; }
	.pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 9px; font-weight: 600; }
	.pill.todo { background: #ececeb; color: #6b6c5e; }
	.pill.in_progress { background: #efebe2; color: #6e5a1f; }
	.pill.done { background: #e7f3ea; color: #2f6b42; }
	.due { color: #c02626; font-weight: 600; }
	i { color: #b5b6aa; font-style: normal; }
	footer { display: flex; align-items: center; justify-content: space-between; gap: 12px;
	         margin-top: 14px; border-top: 1px solid #efebe2; padding-top: 8px;
	         color: #9a9b8c; font-size: 9px; }
	/* gpp.svg is ~51% artwork inside its viewBox, so it needs about double the box. */
	footer img { height: 30px; width: auto; }
	footer .by { display: flex; align-items: center; gap: 6px; }
</style></head><body>
<header>
	<img src="logo.svg" alt="TrackMyPendap">
	<div class="titles">
		<h1>${escapeHtml(title)}</h1>
		<p class="sub">${escapeHtml(opts.scope ?? '')}${opts.filters ? ` &middot; ${escapeHtml(opts.filters)}` : ''}</p>
	</div>
	<div class="meta">${escapeHtml(new Date().toLocaleString())}<br>${tasks.length} task${tasks.length === 1 ? '' : 's'}</div>
</header>
<div class="stats">${stats.map(([label, n]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('')}</div>
<table>
	<thead><tr><th>Task</th><th>Status</th><th>Department</th><th>Assignees</th><th>Due</th><th>Created</th></tr></thead>
	<tbody>${rows || `<tr><td colspan="6"><i>No tasks match the current filters.</i></td></tr>`}</tbody>
</table>
<footer>
	<span>Generated from the filters active at export time.</span>
	<span class="by">A product by <img src="gpp.svg" alt="Green Pendap"></span>
</footer>
</body></html>`;

	const w = window.open('', '_blank');
	if (!w) return false; // popup blocked - the caller says so
	w.document.write(html);
	w.document.close();
	// The logos are the only external assets; printing before they decode gives
	// a report with two empty boxes at the top.
	Promise.all(
		[...w.document.images].map(
			(img: any) =>
				img.complete || new Promise((done) => ((img.onload = done), (img.onerror = done)))
		)
	).then(() => {
		w.focus();
		w.print();
	});
	return true;
}
