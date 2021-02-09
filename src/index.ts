#!/usr/bin/env bash

import log from 'loglevel';
import { promises as fs } from 'fs';
import { getInterfaces as getInter, getModules as getMod } from '@fluencelabs/fluence';
import { dev } from '@fluencelabs/fluence-network-environment';
import { v4 as uuidv4 } from 'uuid';
import { args } from './args';
import { Distributor, getModule } from './distributor';

const DEFAULT_NODE = dev[2];

export async function addBlueprint(name: string, id: string, deps: string[], seed?: string): Promise<string> {
	const distributor = new Distributor([], seed);
	const bp = await distributor.uploadBlueprint(DEFAULT_NODE, { name, id, dependencies: deps });
	return bp.id;
}

export async function createService(blueprint_id: string, seed?: string): Promise<void> {
	const node = DEFAULT_NODE;

	const distributor = new Distributor([], seed);
	const serviceId = await distributor.createService(node, blueprint_id);
	console.log(`service id: ${serviceId}`);
}

export async function newService(
	blueprint_name: string,
	module_configs: { config_path?: string; wasm_path: string }[],
	seed?: string,
): Promise<void> {
	const node = DEFAULT_NODE;

	const distributor = new Distributor([], seed);

	// upload modules
	const modules = await Promise.all(module_configs.map(m => getModule(m.wasm_path, undefined, m.config_path)));
	for (const module of modules) {
		await distributor.uploadModuleToNode(node, module);
	}

	// create blueprints
	const dependencies = modules.map((m) => m.config.name);
	const blueprint = await distributor.uploadBlueprint(node, { name: blueprint_name, id: uuidv4(), dependencies });

	// create service
	const serviceId = await distributor.createService(node, blueprint.id);
	console.log(`service id: ${serviceId}`);
}

export async function runAir(path: string, data: Map<string, any>, seed?: string): Promise<void> {
	const distributor = new Distributor([], seed);

	const fileData = await fs.readFile(path);
	const air = fileData.toString('utf-8');

	await distributor.runAir(DEFAULT_NODE, air, data);
}

export async function uploadModule(path: string, name?: string, configPath?: string, seed?: string): Promise<void> {
	const module = await getModule(path, name, configPath);
	const distributor = new Distributor([], seed);
	await distributor.uploadModuleToNode(DEFAULT_NODE, module);
}

export async function getModules(peerId?: string, seed?: string): Promise<string[]> {
	const distributor = new Distributor([], seed);
	const client = await distributor.makeClient(DEFAULT_NODE);
	if (!peerId) {
		peerId = DEFAULT_NODE.peerId;
	}
	return await getMod(client);
}

export async function getInterfaces(peerId?: string, seed?: string, expand?: boolean): Promise<void> {
	const distributor = new Distributor([], seed);
	const client = await distributor.makeClient(DEFAULT_NODE);

	const interfaces = await getInter(client);
	if (expand) {
		console.log(JSON.stringify(interfaces, undefined, 2));
	} else {
		console.log(interfaces);
		console.log('to expand interfaces, use get_interfaces --expand');
	}
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
				['URL Downloader', [1, 2, 3, 4, 5]],
			]),
		)
		.then((_) => log.warn('finished'));
}

if (typeof process === 'object') {
	log.setLevel('warn');

	args();
}
