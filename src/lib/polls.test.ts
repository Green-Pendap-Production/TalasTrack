// run: node --test src/lib/polls.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tally, donutSegments, ringPositions, seriesColor, SERIES } from './polls.ts';

test('no votes: zero counts, no divide-by-zero', () => {
	const { total, results, winners } = tally([], ['a', 'b']);
	assert.equal(total, 0);
	assert.deepEqual(results, [
		{ option: 'a', count: 0, pct: 0 },
		{ option: 'b', count: 0, pct: 0 }
	]);
	assert.deepEqual(winners, []);
});

test('counts, percentages and winner', () => {
	const votes = [{ option: 'a' }, { option: 'a' }, { option: 'b' }, { option: 'a' }];
	const { total, results, winners } = tally(votes, ['a', 'b']);
	assert.equal(total, 4);
	assert.deepEqual(results, [
		{ option: 'a', count: 3, pct: 75 },
		{ option: 'b', count: 1, pct: 25 }
	]);
	assert.deepEqual(
		winners.map((w) => w.option),
		['a']
	);
});

test('a tie reports every tied option', () => {
	const { winners } = tally([{ option: 'a' }, { option: 'b' }], ['a', 'b']);
	assert.deepEqual(
		winners.map((w) => w.option),
		['a', 'b']
	);
});

test('votes for an option since removed still show up', () => {
	const { results, total } = tally([{ option: 'gone' }], ['a']);
	assert.equal(total, 1);
	assert.deepEqual(
		results.map((r) => r.option),
		['a', 'gone']
	);
});

test('donut: no votes draws nothing', () => {
	const segs = donutSegments([{ option: 'a', count: 0 }], 10);
	assert.equal(segs[0].empty, true);
	assert.equal(segs[0].dashArray.split(' ')[0], '0');
});

test('donut: halves sit back to back with a gap between them', () => {
	const r = 10;
	const c = 2 * Math.PI * r;
	const [first, second] = donutSegments(
		[
			{ option: 'a', count: 1 },
			{ option: 'b', count: 1 }
		],
		r
	);
	assert.equal(Number(first.dashArray.split(' ')[0]).toFixed(3), (c / 2 - 2).toFixed(3));
	assert.equal(first.dashOffset, 0);
	assert.equal(Number(second.dashOffset).toFixed(3), (-c / 2).toFixed(3));
});

test('donut: a lone option fills the whole ring', () => {
	const r = 10;
	const c = 2 * Math.PI * r;
	const [only] = donutSegments([{ option: 'a', count: 5 }], r);
	assert.equal(Number(only.dashArray.split(' ')[0]).toFixed(3), (c - 2).toFixed(3));
});

test('colours are fixed per slot, never cycled', () => {
	assert.equal(seriesColor(0), SERIES[0]);
	assert.equal(seriesColor(7), SERIES[7]);
	assert.notEqual(seriesColor(8), SERIES[0]); // a 9th option must not reuse slot 1
});

test('ring: first dot is at twelve o clock, points are evenly spaced', () => {
	assert.deepEqual(ringPositions(0, 10), []);
	const [top] = ringPositions(1, 10);
	assert.equal(top.x.toFixed(6), '0.000000');
	assert.equal(top.y, -10);
	const four = ringPositions(4, 10);
	assert.equal(four.length, 4);
	assert.equal(four[1].x.toFixed(3), '10.000'); // quarter turn clockwise
	assert.equal(four[1].y.toFixed(6), '0.000000');
});
