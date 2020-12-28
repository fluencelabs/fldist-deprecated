import Fluence from 'fluence';
import log from 'loglevel';

// NodeJS imports
import {promises as fs} from 'fs';
import {faasDev, Node} from './environments';
import {Distributor, getModule} from './distributor';
import {args} from "./args";

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

export async function addBlueprint(name: string, id: string, deps: string[]): Promise<void> {

    const distributor = new Distributor([]);
    await distributor.uploadBlueprint(faasDev[2], {name, uuid: id, dependencies: deps})
}

export async function createService(id: string): Promise<void> {
    const distributor = new Distributor([]);
    await distributor.createService(faasDev[2], id)
}

export async function runAir(path: string, data: Map<string, any>): Promise<void> {
    const distributor = new Distributor([]);

    const fileData = await fs.readFile(path);
    const air = fileData.toString('utf-8');

    await distributor.runAir(faasDev[2], air, data)
}

export async function uploadModule(name: string, path: string): Promise<void> {
    let module = await getModule(name, path)
    const distributor = new Distributor([]);
    await distributor.uploadModule(faasDev[2], module)
}

export async function uploadAll(): Promise<void> {
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
}

if (typeof process === 'object') {
    Fluence.setLogLevel('warn');
    log.setLevel('warn');

    console.log(`log level is ${log.getLevel()}`);

    // we're running in Node.js
    log.warn('hello, node!');

    args()
}
