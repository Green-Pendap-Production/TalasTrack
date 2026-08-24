// run: node --test src/lib/projects.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inScope, ALL_PROJECTS, NO_PROJECT } from './projects.ts';

test('all projects shows everything, including unassigned tasks', () => {
	assert.equal(inScope({ project: 'p1' }, ALL_PROJECTS), true);
	assert.equal(inScope({}, ALL_PROJECTS), true);
});

test('a project shows only its own tasks', () => {
	assert.equal(inScope({ project: 'p1' }, 'p1'), true);
	assert.equal(inScope({ project: 'p2' }, 'p1'), false);
	assert.equal(inScope({}, 'p1'), false);
});

test('no project catches tasks with an empty or missing relation', () => {
	assert.equal(inScope({}, NO_PROJECT), true);
	assert.equal(inScope({ project: '' }, NO_PROJECT), true);
	assert.equal(inScope({ project: 'p1' }, NO_PROJECT), false);
});
