// Which project a task belongs to, and whether it belongs in the view you are
// looking at. Kept free of Svelte and PocketBase so it stays testable with
// `node --test` - see projects.test.ts.

export const ALL_PROJECTS = 'all';
export const NO_PROJECT = 'none';

// A task with an empty `project` relation is not "wrong", it is company-wide
// work. ALL_PROJECTS shows it alongside everything else; NO_PROJECT isolates it
// so nothing quietly falls out of every view.
export function inScope(task: { project?: string }, scope: string): boolean {
	if (scope === ALL_PROJECTS) return true;
	if (scope === NO_PROJECT) return !task.project;
	return task.project === scope;
}
