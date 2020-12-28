import Fluence from 'fluence';
import log from 'loglevel';

// NodeJS imports
import {promises as fs} from 'fs';
import {faasDev, faasNetHttps} from './environments';
import {Distributor, getModule, TTL} from './distributor';
import {args} from "./args";

export async function addBlueprint(name: string, id: string, deps: string[]): Promise<void> {
    const distributor = new Distributor([]);
    await distributor.uploadBlueprint(faasDev[2], {name, uuid: id, dependencies: deps})
}

export async function createService(id: string): Promise<void> {
    const node = faasDev[2];
    const client = await Fluence.connect(node.multiaddr);
    await client.createService(id, node.peerId, TTL)
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

export async function distribute(): Promise<void> {
    const distributor = new Distributor(faasNetHttps);
    await distributor.load_modules();
    await distributor
        .distributeServices(
            faasNetHttps[0],
            new Map([
                // ['SQLite 3', [1, 2, 3, 4]],
                // ['User List', [1, 1]],
                // ['Message History', [1, 1, 1]],
                // ['Redis', [5,6,7,8]]
                ['URL Downloader', [4]]
            ]),
        )
        .then((_) => log.warn('finished'));
}

if (typeof process === 'object') {
    Fluence.setLogLevel('warn');
    log.setLevel('warn');

    args()
}
