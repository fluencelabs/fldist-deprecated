import Fluence from 'fluence';
import log from 'loglevel';

// NodeJS imports
import { promises as fs } from 'fs';
import { faasDev, Node } from './environments';
import { Distributor } from './distributor';

export const TTL = 20000;

// For use in browser
interface MyNamespacedWindow extends Window {
	nodes: Node[];
	distributor: Distributor;
	distribute: () => Promise<void>;
}

declare let window: MyNamespacedWindow;
try {
	window.nodes = faasDev;
	window.distribute = distribute;
	window.distributor = new Distributor(window.nodes);
} catch (e) {
	//
}

// @ts-ignore
export async function distribute() {
	const nodes = faasDev;
	const distributor = new Distributor(nodes);
	await distributor
		.distributeServices(
			nodes[0],
			new Map([
				// ['SQLite 3', [1, 2, 3, 4]],
				['User List', [1, 1]],
				['Message History', [1, 1, 1]],
				// ['Redis', [5,6,7,8]]
			]),
		)
		.then((_) => log.warn('finished'));
}

export async function loadWasmModule(name: string): Promise<string> {
	const data = await fs.readFile(`./src/artifacts/${name}`);
	const base64data = data.toString('base64');
	return base64data;
}

if (typeof process === 'object') {
	Fluence.setLogLevel('warn');
	log.setLevel('warn');

	console.log(`log level is ${log.getLevel()}`);

	// we're running in Node.js
	log.warn('hello, node!');

	(async () => {
		const distributor = new Distributor(faasDev);
		await distributor.load_modules();
		await distributor
			.distributeServices(
				faasDev[0],
				new Map([
					// ['SQLite 3', [1, 2, 3, 4]],
					['User List', [1, 1]],
					['Message History', [1, 1, 1]],
					// ['Redis', [5,6,7,8]]
				]),
			)
			.then((_) => log.warn('finished'));
		// await log.warn(await loadWasmModule('history.wasm'));
	})();
}
