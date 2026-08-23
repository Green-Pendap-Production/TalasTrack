// Geometry for the task timeline. Percentages, so the bars are pure CSS and the
// chart resizes with the container - no measuring, no redraw on resize.

const DAY = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Window covering every task, padded out to at least `minDays` so one task
 *  due tomorrow does not produce a one-pixel-wide chart. */
export function timelineRange(
	tasks: { created?: string; due_date?: string }[],
	minDays = 14,
	now = Date.now()
) {
	const stamps = tasks
		.flatMap((t) => [t.created, t.due_date])
		.filter(Boolean)
		.map((d) => +new Date(d as string))
		.filter((n) => Number.isFinite(n));

	// Always include today, so the "now" marker is on the chart.
	stamps.push(now);

	let start = Math.min(...stamps);
	let end = Math.max(...stamps);

	const short = minDays * DAY - (end - start);
	if (short > 0) {
		start -= short / 2;
		end += short / 2;
	}
	return { start, end };
}

/** Left offset and width as percentages, clamped to the window. Bars that fall
 *  entirely outside it collapse to zero width so they can be skipped. */
export function spanPercent(
	from: string | number | Date,
	to: string | number | Date,
	range: { start: number; end: number },
	minWidth = 1.5
) {
	const total = range.end - range.start;
	if (total <= 0) return { left: 0, width: 100, visible: true };

	const rawFrom = +new Date(from);
	const rawTo = +new Date(to);
	// Tolerate a due date earlier than the start date rather than drawing backwards.
	const lo = Math.min(rawFrom, rawTo);
	const hi = Math.max(rawFrom, rawTo);

	if (hi < range.start || lo > range.end) return { left: 0, width: 0, visible: false };

	const s = clamp(lo, range.start, range.end);
	const e = clamp(hi, range.start, range.end);
	const left = ((s - range.start) / total) * 100;
	const width = Math.min(Math.max(((e - s) / total) * 100, minWidth), 100 - left);
	return { left, width, visible: true };
}

/** Evenly spaced date ticks for the axis. */
export function ticks(range: { start: number; end: number }, count = 5) {
	if (count < 2 || range.end <= range.start) return [];
	return Array.from({ length: count }, (_, i) => {
		const pct = (i / (count - 1)) * 100;
		return { pct, date: new Date(range.start + ((range.end - range.start) * i) / (count - 1)) };
	});
}
