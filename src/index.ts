#!/usr/bin/env node

import Fluence from 'fluence';
import log from 'loglevel';

// NodeJS imports
import {promises as fs} from 'fs';
import {faasDev, faasNetHttps} from './environments';
import {Distributor, getModule, TTL} from './distributor';
import {args} from "./args";
import {seedToPeerId} from "fluence/dist/seed";

const DEFAULT_NODE = faasDev[2];

export async function addBlueprint(name: string, id: string, deps: string[], seed?: string): Promise<string> {
    const distributor = new Distributor([], seed);
    let bp = await distributor.uploadBlueprint(DEFAULT_NODE, {name, id: id, dependencies: deps})
    return bp.id
}

export async function createService(id: string, seed?: string): Promise<void> {
    const node = DEFAULT_NODE;

    let peerId = undefined;
    if (seed) {
        peerId = await seedToPeerId(seed)
    }
    const client = await Fluence.connect(node.multiaddr, peerId);
    let serviceId = await client.createService(id, node.peerId, TTL)
    console.log("service id: " + serviceId)
}

export async function runAir(path: string, data: Map<string, any>, seed?: string): Promise<void> {
    const distributor = new Distributor([], seed);

    const fileData = await fs.readFile(path);
    const air = fileData.toString('utf-8');

    await distributor.runAir(DEFAULT_NODE, air, data)
}

export async function uploadModule(name: string, path: string, seed?: string): Promise<void> {
    let module = await getModule(name, path)
    const distributor = new Distributor([], seed);
    await distributor.uploadModule(DEFAULT_NODE, module)
}

export async function getModules(peerId?: string, seed?: string): Promise<void> {
    const distributor = new Distributor([], seed);
    let client = await distributor.makeClient(DEFAULT_NODE)
    if (!peerId) {
        peerId = DEFAULT_NODE.peerId
    }
    let modules = await client.getAvailableModules(peerId);
    console.log(modules)
}

export async function distribute(seed?: string): Promise<void> {
    const distributor = new Distributor(faasNetHttps, seed);
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
