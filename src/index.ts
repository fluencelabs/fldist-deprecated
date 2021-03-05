#!/usr/bin/env node

import log from 'loglevel';
import {promises as fs} from 'fs';
import {Node, testNet} from '@fluencelabs/fluence-network-environment';
import {v4 as uuidv4} from 'uuid';
import {args} from './args';
import {Distributor, getModule} from './distributor';

const DEFAULT_NODE_IDX = 3;

export class CliApi {
	distributor: Distributor;
	node: Node;

	constructor(nodes: Node[], ttl: number, seed?: string, selected_node?: Node) {
		this.distributor = new Distributor(nodes, ttl, seed);
		this.node = selected_node ? selected_node : nodes[DEFAULT_NODE_IDX];
	}

	async addBlueprint(name: string, deps: string[]): Promise<string> {
		return await this.distributor.uploadBlueprint(this.node, {name, dependencies: deps});
	}

	async createService(blueprint_id: string): Promise<void> {
		const node = this.node;

		const serviceId = await this.distributor.createService(node, blueprint_id);
		console.log(`service id: ${serviceId}`);
	}

	async newService(
		blueprint_name: string,
		module_configs: { config_path?: string; wasm_path: string }[],
	): Promise<void> {
		const node = this.node;

		// upload modules
		const modules = await Promise.all(module_configs.map(m => getModule(m.wasm_path, undefined, m.config_path)));
		for (const module of modules) {
			await this.distributor.uploadModuleToNode(node, module);
		}

		// create blueprints
		const dependencies = modules.map((m) => m.config.name);
		const blueprintId = await this.distributor.uploadBlueprint(node, {name: blueprint_name, id: uuidv4(), dependencies});

		// create service
		const serviceId = await this.distributor.createService(node, blueprintId);
		console.log(`service id: ${serviceId}`);
	}

	async runAir(path: string, data: Map<string, any>): Promise<void> {

		const fileData = await fs.readFile(path);
		const air = fileData.toString('utf-8');

		await this.distributor.runAir(this.node, air, data);
	}

	async uploadModule(path: string, name?: string, configPath?: string): Promise<void> {
		const module = await getModule(path, name, configPath);
		await this.distributor.uploadModuleToNode(this.node, module);
	}

	async getModules(): Promise<string[]> {
		return await this.distributor.getModules(this.node)
	}

	async getInterfaces(expand?: boolean): Promise<void> {
		const interfaces = await this.distributor.getInterfaces(this.node);
		if (expand) {
			console.log(JSON.stringify(interfaces, undefined, 2));
		} else {
			console.log(interfaces);
			console.log('to expand interfaces, use get_interfaces --expand');
		}
	}

	async getInterface(serviceId: string, expand?: boolean): Promise<void> {
		const interfaceS = await this.distributor.getInterface(serviceId, this.node);
		if (expand) {
			console.log(JSON.stringify(interfaceS, undefined, 2));
		} else {
			console.log(interfaceS);
			console.log('to expand interfaces, use get_interfaces --expand');
		}
	}

	async distribute(): Promise<void> {
		await this.distributor.load_modules();
		await this.distributor
			.distributeServices(
				// TODO make it configurable
				testNet[0],
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
}

if (typeof process === 'object') {
	args();
}
