'use strict';

import Fluence from 'fluence';
// import {FluenceSender} from "./fluenceSender";
// import {getPageType} from "./index";
import {curl} from './artifacts/curl';
import {SQLITE_BS64} from './artifacts/sqliteBs64';
import {USER_LIST_BS64} from './artifacts/userListBs64';
import {local_storage} from './artifacts/local_storage';
import {facade as url_downloader_facade} from './artifacts/facade';
import {Node, stage, faasNetHttps} from './environments';
import {FluenceClient} from 'fluence/dist/fluenceClient';
import log from 'loglevel';
import promiseRetry from 'promise-retry';

const TTL = 20000;

type Config = {
	logger_enabled: boolean;
	module: { mounted_binaries: any };
	wasi: { preopened_files: string[] };
	name: string;
	mem_pages_count: number
};

type ModuleName = 'curl' | 'sqlite' | 'history' | 'userlist' | 'url_downloader' | 'local_storage';
type BlueprintName = ModuleName | 'chat';
type Module = { name: ModuleName, base64: string };
type Blueprint = {
	uuid: string,
	name: BlueprintName,
	dependencies: ModuleName[],
};

class Distributor {
	blueprints: Blueprint[];
	nodes: Node[];
	modules: Module[];

	// If innerClient is set, it will be used for all requests. Otherwise, a new client will be generated on each request.
	innerClient?: FluenceClient;

	constructor(nodes: Node[], optionalClient?: FluenceClient) {
		this.nodes = nodes;
		this.innerClient = optionalClient;

		this.blueprints = [
			{
				name: 'sqlite',
				uuid: '623c6d14-2204-43c4-84d5-a237bcd19874',
				dependencies: ['sqlite']
			},
			{
				name: 'userlist',
				uuid: '1cc9f08d-eaf2-4d27-a273-a52cb294a055',
				dependencies: ['sqlite', 'userlist']
			},
			{
				name: 'history',
				uuid: 'bbe13303-48c9-407f-ac74-88f26dc4bfa7',
				dependencies: ['sqlite', 'history']
			},
			{
				name: 'url_downloader',
				uuid: 'f247e046-7d09-497d-8330-9a41d6c23756',
				dependencies: ['local_storage', 'curl', 'url_downloader']
			},
		];

		this.modules = [
			{name: 'curl', base64: curl},
			{name: 'sqlite', base64: SQLITE_BS64},
			{name: 'userlist', base64: USER_LIST_BS64},
			{name: 'url_downloader', base64: url_downloader_facade},
			{name: 'local_storage', base64: local_storage},
			{name: 'curl', base64: curl},
			// { name: 'history', base64: history },
		];
	}

	async makeClient(node: Node): Promise<FluenceClient> {
		if (typeof this.innerClient !== 'undefined') {
			return this.innerClient;
		} else {
			return await Fluence.connect(node.multiaddr);
		}
	}

	async uploadModule(node: Node, module: Module) {
		const client = await this.makeClient(node);
		log.info(`uploading module ${module.name} to node ${node.peerId} via client ${client.selfPeerId.toB58String()}`);

		const cfg = config(module.name);
		await client.addModule(module.name, module.base64, cfg, node.peerId, TTL);

		// const modules = await client.getAvailableModules(node.peerId, 20000);
		// console.log(`modules: ${JSON.stringify(modules)}`);
	}

	async uploadBlueprint(node: Node, bp: Blueprint): Promise<Blueprint> {
		const client = await this.makeClient(node);
		log.info(`uploading blueprint ${bp.name} to node ${node.peerId} via client ${client.selfPeerId.toB58String()}`);

		const blueprintId = await client.addBlueprint(bp.name, bp.dependencies, bp.uuid, node.peerId, TTL);
		if (blueprintId !== bp.uuid) {
			log.error(`NON-CONSTANT BLUEPRINT ID: Expected blueprint id to be predefined as ${bp.uuid}, but it was generated by node as ${blueprintId}`);
			return { ...bp, uuid: blueprintId };
		}

		return bp;
	}

	async createService(node: Node, bp: Blueprint): Promise<string> {
		const client = await this.makeClient(node);
		log.info(`creating service ${bp.name}@${bp.uuid} via client ${client.selfPeerId.toB58String()}`);

		const serviceId = await client.createService(bp.uuid, node.peerId, TTL);
		log.info(`service created ${serviceId} as instance of ${bp.name}@${bp.uuid} via client ${client.selfPeerId.toB58String()}`);

		return serviceId;
	}

	async uploadAllModules(node: Node) {
		for (const module of this.modules) {
			await this.uploadModule(node, module);
		}
	}

	async uploadAllModulesToAllNodes() {
		for (const node of this.nodes) {
			await this.uploadAllModules(node);
		}
	}

	async uploadAllBlueprints(node: Node) {
		for (const bp of this.blueprints) {
			await this.uploadBlueprint(node, bp);
		}
	}

	async uploadAllBlueprintsToAllNodes() {
		for (const node of this.nodes) {
			await this.uploadAllBlueprints(node);
		}
	}

	async distributeServices(relay: Node, distribution: Map<BlueprintName, number[]>) {
		this.innerClient = await this.makeClient(relay);

		// Cache information about uploaded modules & blueprints to avoid uploading them several times
		const uploadedModules = new Set<[Node, ModuleName]>();
		const uploadedBlueprints = new Set<[Node, BlueprintName]>();
		async function uploadM(d: Distributor, node: Node, module: Module) {
			const already = uploadedModules.has([node, module.name]);
			if (!already) {
				await promiseRetry({retries: 3}, () => d.uploadModule(node, module));
			}
			uploadedModules.add([node, module.name]);
		}
		async function uploadB(d: Distributor, node: Node, bp: Blueprint): Promise<Blueprint> {
			const already = uploadedBlueprints.has([node, bp.name]);
			if (!already) {
				const blueprint = await promiseRetry({retries: 3}, () => d.uploadBlueprint(node, bp));
				uploadedBlueprints.add([node, bp.name]);
				return blueprint;
			}

			return bp;
		}

		for (const [name, nodes] of distribution.entries()) {
			const blueprint = this.blueprints.find(bp => bp.name === name);
			if (!blueprint) {
				continue;
			}

			const modules = blueprint.dependencies.map((moduleName) => this.modules.find(m => m.name === moduleName));

			for (const idx of nodes) {
				const node = this.nodes[idx];
				for (const module of modules) {
					if (module) {
						await uploadM(this, node, module);
					}
				}
				const bp = await uploadB(this, node, blueprint);
				await this.createService(node, bp);
			}
		}
	}
}

function config(name: string): Config {
	return {
		name,
		mem_pages_count: 100,
		logger_enabled: true,
		module: {
			mounted_binaries: {
				curl: '/usr/bin/curl'
			}
		},
		wasi: {
			preopened_files: ['/tmp'],
		}
	};
}

// @ts-ignore
export async function distribute() {
	Fluence.setLogLevel('warn');
	const nodes = faasNetHttps;
	const distributor = new Distributor(nodes);
// distributor.uploadAllModulesToAllNodes();
	await distributor.distributeServices(nodes[0], new Map([
		['sqlite', [1, 2, 3, 4]],
		['userlist', [1, 2, 3, 4]],
		['history', [1, 2, 3, 4]],
		['url_downloader', [1, 2, 3, 4]]
	])).then(_ => console.log('finished'));
}

// For use in browser
interface MyNamespacedWindow extends Window {
	distribute: (() => Promise<void>);
}

declare var window: MyNamespacedWindow;
window.distribute = distribute;
