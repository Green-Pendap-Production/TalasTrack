// run: node --test src/lib/taskExport.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskRow, toCsv, isOverdue } from './taskExport.ts';

const task = {
	title: 'Fix the lights',
	status: 'in_progress',
	due_date: '2026-01-05 00:00:00Z',
	created: '2026-01-01 00:00:00Z',
	expand: {
		project: { name: 'Hall' },
		department: { name: 'Works' },
		assignees: [{ name: 'Ana' }, { name: 'Bo' }]
	}
};

test('a row reads the expanded relations and labels the status', () => {
	const [title, status, project, dept, assignees] = taskRow(task);
	assert.equal(title, 'Fix the lights');
	assert.equal(status, 'In Progress');
	assert.equal(project, 'Hall');
	assert.equal(dept, 'Works');
	assert.equal(assignees, 'Ana, Bo');
});

test('missing relations and dates come out empty, not undefined', () => {
	assert.deepEqual(taskRow({ title: 'Bare', status: 'todo' }), [
		'Bare',
		'To Do',
		'',
		'',
		'',
		'',
		''
	]);
});

test('commas, quotes and newlines survive the round trip', () => {
	const csv = toCsv([{ title: 'a,b "c"\nd', status: 'done' }]);
	assert.match(csv, /"a,b ""c""\nd"/);
});

test('a title that looks like a formula cannot run in Excel', () => {
	for (const title of ['=cmd|calc', '+1', '-1', '@SUM(A1)']) {
		const cell = toCsv([{ title, status: 'todo' }])
			.split('\r\n')[1]
			.split(',')[0];
		assert.ok(cell.startsWith("'") || cell.startsWith('"\''), `${title} -> ${cell}`);
	}
});

test('overdue means past due and not finished', () => {
	assert.equal(isOverdue({ due_date: '2000-01-01', status: 'todo' }), true);
	assert.equal(isOverdue({ due_date: '2000-01-01', status: 'done' }), false);
	assert.equal(isOverdue({ due_date: '2999-01-01', status: 'todo' }), false);
	assert.equal(isOverdue({ status: 'todo' }), false);
});
