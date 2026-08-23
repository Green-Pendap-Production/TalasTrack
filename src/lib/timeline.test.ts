// run: node --test src/lib/timeline.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timelineRange, spanPercent, ticks } from './timeline.ts';

const DAY = 24 * 60 * 60 * 1000;
const range = { start: 0, end: 100 * DAY };

test('span: a bar in the middle of the window', () => {
	const { left, width, visible } = spanPercent(25 * DAY, 50 * DAY, range);
	assert.equal(visible, true);
	assert.equal(left, 25);
	assert.equal(width, 25);
});

test('span: bars are clamped to the window, never overflow it', () => {
	const { left, width } = spanPercent(-40 * DAY, 140 * DAY, range);
	assert.equal(left, 0);
	assert.equal(width, 100);

	const late = spanPercent(90 * DAY, 300 * DAY, range);
	assert.equal(late.left, 90);
	assert.equal(late.left + late.width, 100); // stops at the right edge
});

test('span: a bar entirely outside the window is not visible', () => {
	assert.equal(spanPercent(200 * DAY, 210 * DAY, range).visible, false);
	assert.equal(spanPercent(-20 * DAY, -10 * DAY, range).visible, false);
});

test('span: a same-day task still gets a visible sliver', () => {
	const { width } = spanPercent(50 * DAY, 50 * DAY, range);
	assert.ok(width >= 1.5, `expected a minimum width, got ${width}`);
});

test('span: a due date before the start date draws forwards, not backwards', () => {
	const backwards = spanPercent(60 * DAY, 40 * DAY, range);
	assert.equal(backwards.left, 40);
	assert.equal(backwards.width, 20);
});

test('span: an empty window does not divide by zero', () => {
	const { left, width } = spanPercent(0, 0, { start: 5, end: 5 });
	assert.equal(left, 0);
	assert.equal(width, 100);
});

test('range: pads a narrow spread out to the minimum', () => {
	const now = 50 * DAY;
	const { start, end } = timelineRange(
		[{ created: new Date(50 * DAY).toISOString(), due_date: new Date(51 * DAY).toISOString() }],
		14,
		now
	);
	assert.equal((end - start) / DAY, 14);
});

test('range: always contains today, even with only old tasks', () => {
	const now = 90 * DAY;
	const { start, end } = timelineRange([{ created: new Date(0).toISOString() }], 14, now);
	assert.ok(start <= now && now <= end);
});

test('range: no tasks at all still yields a usable window', () => {
	const now = 10 * DAY;
	const { start, end } = timelineRange([], 14, now);
	assert.equal((end - start) / DAY, 14);
	assert.ok(start <= now && now <= end);
});

test('ticks: span the window end to end', () => {
	const t = ticks(range, 5);
	assert.equal(t.length, 5);
	assert.equal(t[0].pct, 0);
	assert.equal(t[4].pct, 100);
	assert.equal(+t[2].date, 50 * DAY);
	assert.deepEqual(ticks({ start: 5, end: 5 }), []);
});
