#!/usr/bin/env -S bash

import log from 'loglevel';
import {promises as fs} from 'fs';
import {Distributor, getModule} from './distributor';
import {args} from "./args";
import {getInterfaces as getInter, getModules as getMod} from "@fluencelabs/fluence";
import {dev} from "@fluencelabs/fluence-network-environment";

const DEFAULT_NODE = dev[2];

export async function addBlueprint(name: string, id: string, deps: string[], seed?: string): Promise<string> {
    const distributor = new Distributor([], seed);
    let bp = await distributor.uploadBlueprint(DEFAULT_NODE, {name, id: id, dependencies: deps})
    return bp.id
}

export async function createService(id: string, seed?: string): Promise<void> {
    const node = DEFAULT_NODE;

    const distributor = new Distributor([], seed);
    let serviceId = distributor.createService(node, id);
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
    await distributor.uploadModuleToNode(DEFAULT_NODE, module)
}

export async function getModules(peerId?: string, seed?: string): Promise<string[]> {
    const distributor = new Distributor([], seed);
    let client = await distributor.makeClient(DEFAULT_NODE)
    if (!peerId) {
        peerId = DEFAULT_NODE.peerId
    }
    return await getMod(client);
}

export async function getInterfaces(peerId?: string, seed?: string): Promise<void> {
    const distributor = new Distributor([], seed);
    let client = await distributor.makeClient(DEFAULT_NODE)

    let modules = await getInter(client);
    console.log(modules)
}

export async function distribute(seed?: string): Promise<void> {
    const distributor = new Distributor(dev, seed);
    await distributor.load_modules();
    await distributor
        .distributeServices(
            // TODO make it configurable
            dev[0],
            new Map([
                ['SQLite 3', [1, 2, 3, 4, 5]],
                ['User List', [1, 2, 3, 4, 5]],
                ['Message History', [1, 2, 3, 4, 5]],
                // ['Redis', [5,6,7,8]]
                ['URL Downloader', [1, 2, 3, 4, 5]]
            ]),
        )
        .then((_) => log.warn('finished'));
}

if (typeof process === 'object') {
    log.setLevel('warn');

    args()
}
