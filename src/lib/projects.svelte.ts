import { browser } from '$app/environment';
import { pb } from './pocketbase';
import { ALL_PROJECTS } from './projects';

const KEY = 'trackmypendap:project';

// One scope shared by the sidebar switcher and every page that narrows by it.
// An object, not an exported `let`: a module can export reactive state only if
// the binding itself never gets reassigned.
export const projectScope = $state({
	/** ALL_PROJECTS, NO_PROJECT, or a project id. */
	id: (browser && localStorage.getItem(KEY)) || ALL_PROJECTS,
	list: [] as any[],
	/** False until the `projects` collection exists in PocketBase. Pages read
	 *  this to hide the feature rather than show a 404 nobody can act on. */
	available: false,
	loaded: false
});

export function setProject(id: string) {
	projectScope.id = id;
	if (browser) localStorage.setItem(KEY, id);
}

export async function loadProjects() {
	try {
		projectScope.list = await pb.collection('projects').getFullList({ sort: 'name' });
		projectScope.available = true;
	} catch {
		// 404 means the collection has not been created yet; anything else (403,
		// offline) is also nothing a viewer can fix from here.
		projectScope.list = [];
		projectScope.available = false;
	} finally {
		projectScope.loaded = true;
	}
}

/** The project a new task should default to, or '' at All/No project. */
export function defaultProjectId(): string {
	return projectScope.list.some((p) => p.id === projectScope.id) ? projectScope.id : '';
}

export function projectName(id: string): string {
	return projectScope.list.find((p) => p.id === id)?.name ?? '';
}
