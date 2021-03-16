import log from 'loglevel';
import promiseRetry from 'promise-retry';
import { promises as fs } from 'fs';
import {
	addBlueprint,
	createClient,
	createService as fluenceCreateService,
	generatePeerId,
	getInterfaces as getInter,
	getModules as getMod,
	Particle,
	peerIdToSeed,
	seedToPeerId,
	sendParticleAsFetch,
	subscribeToEvent,
	uploadModule,
	FluenceClient,
	sendParticle,
	addScript as fluenceAddScript,
	removeScript as fluenceRemoveScript,
} from '@fluencelabs/fluence';
import { v4 as uuidv4 } from 'uuid';
import { Node } from '@fluencelabs/fluence-network-environment';
import { RequestFlowBuilder } from '@fluencelabs/fluence/dist/api.unstable';
import { ModuleConfig } from '@fluencelabs/fluence/dist/internal/moduleConfig';

export type Module = {
	base64: string;
	config: ModuleConfig;
};

export async function loadModule(path: string): Promise<string> {
	const data = await fs.readFile(path);
	return data.toString('base64');
}

export async function getModule(path: string, name?: string, configPath?: string): Promise<Module> {
	let config;
	if (configPath) {
		config = createConfig(JSON.parse(await getFileContent(configPath)) as ConfigArgs);
	} else if (name) {
		config = createConfig({ name });
	} else {
		throw new Error(`either --config or --name must be specified`);
	}
	return { base64: await loadModule(path), config: config };
}

export async function getFileContent(path: string): Promise<string> {
	const data = await fs.readFile(path);
	return data.toString();
}

type Blueprint = {
	id?: string;
	name: string;
	dependencies: string[];
};

type ConfigArgs = {
	name: string;
	mountedBinaries?: any;
	preopenedFiles?: string[];
	mappedDirs?: any;
};

export function createConfig(args: ConfigArgs): ModuleConfig {
	return {
		name: args.name,
		mem_pages_count: 100,
		logger_enabled: true,
		mounted_binaries: args.mountedBinaries,
		wasi: {
			preopened_files: args.preopenedFiles || [],
			mapped_dirs: args.mappedDirs,
		},
	};
}

export class Distributor {
	blueprints: Blueprint[];

	nodes: Node[];

	modules: Module[];

	// If innerClient is set, it will be used for all requests. Otherwise, a new client will be generated on each request.
	innerClient?: FluenceClient;
	// Seed of the private key of the used PeerId
	seed?: string;

	ttl: number;

	constructor(nodes: Node[], ttl: number, seed?: string) {
		this.nodes = nodes;
		this.ttl = ttl;
		this.seed = seed;

		this.blueprints = [
			{
				name: 'SQLite 3',
				id: '623c6d14-2204-43c4-84d5-a237bcd19874',
				dependencies: ['sqlite3'],
			},
			{
				name: 'User List',
				id: '1cc9f08d-eaf2-4d27-a273-a52cb294a055',
				dependencies: ['sqlite3', 'userlist'],
			},
			{
				name: 'Message History',
				id: 'bbe13303-48c9-407f-ac74-88f26dc4bfa7',
				dependencies: ['sqlite3', 'history'],
			},
			{
				name: 'URL Downloader',
				id: 'f247e046-7d09-497d-8330-9a41d6c23756',
				dependencies: ['local_storage', 'curl_adapter', 'facade_url_downloader'],
			},
			{
				name: 'Redis',
				id: 'b3a22bb4-4ba9-4517-90b1-45cc97f7a610',
				dependencies: ['redis'],
			},
		];

		this.modules = [];
	}

	async load_modules() {
		this.modules = [
			{
				base64: await loadModule('./src/artifacts/url-downloader/curl.wasm'),
				config: createConfig({
					name: 'curl_adapter',
					mountedBinaries: { curl: '/usr/bin/curl' },
					preopenedFiles: ['/tmp'],
				}),
			},
			{
				base64: await loadModule('./src/artifacts/url-downloader/local_storage.wasm'),
				config: createConfig({
					name: 'local_storage',
					preopenedFiles: ['/tmp'],
					mappedDirs: { sites: '/tmp' },
				}),
			},
			{
				base64: await loadModule('./src/artifacts/url-downloader/facade.wasm'),
				config: createConfig({ name: 'facade_url_downloader' }),
			},
			{
				base64: await loadModule('./src/artifacts/sqlite3.wasm'),
				config: createConfig({ name: 'sqlite3' }),
			},
			{
				base64: await loadModule('./src/artifacts/user-list.wasm'),
				config: createConfig({ name: 'userlist' }),
			},
			{
				base64: await loadModule('./src/artifacts/history.wasm'),
				config: createConfig({ name: 'history' }),
			},
			{
				base64: await loadModule('./src/artifacts/redis.wasm'),
				config: createConfig({ name: 'redis' }),
			},
		];
	}

	async makeClient(node: Node): Promise<FluenceClient> {
		let peerId;
		if (this.seed) {
			peerId = await seedToPeerId(this.seed);
		} else {
			peerId = await generatePeerId();
			this.seed = peerIdToSeed(peerId);
		}
		if (typeof this.innerClient == 'undefined' || this.innerClient.relayPeerId != node.peerId) {
			console.log('client seed: ' + this.seed);
			console.log('client peerId: ' + peerId.toB58String());
			console.log('node peerId: ' + node.peerId);
			this.innerClient = await createClient(node.multiaddr, peerId);
		}
		return this.innerClient;
	}

	async uploadModuleToNode(node: Node, module: Module): Promise<string> {
		const client = await this.makeClient(node);

		const [req, promise] = new RequestFlowBuilder()
			.withRawScript(
				`
	(seq
        (call init_relay ("dist" "add_module") [module_bytes module_config] result)
        (call %init_peer_id% ("callback" "callback") [result])

    )`,
			)
			.withVariable('module_bytes', module.base64)
			.withVariable('module_config', module.config)
			.withTTL(this.ttl)
			.buildAsFetch<[string]>('callback', 'callback');

		await client.initiateFlow(req);
		const [res] = await promise;
		return res;
	}

	async uploadBlueprint(node: Node, bp: Blueprint): Promise<string> {
		const client = await this.makeClient(node);
		log.warn(`uploading blueprint ${bp.name} to node ${node.peerId} via client ${client.selfPeerId}`);

		return await addBlueprint(client, bp.name, bp.dependencies, undefined, node.peerId, this.ttl);
	}

	async createService(node: Node, bpId: string): Promise<string> {
		const client = await this.makeClient(node);
		return await fluenceCreateService(client, bpId, node.peerId, this.ttl);
	}

	async createAlias(node: Node, serviceId: string, alias: string): Promise<void> {
		const client = await this.makeClient(node);

		const [request, promise] = new RequestFlowBuilder()
			.withRawScript(
				`
        (seq
			(call init_relay ("op" "identity") [])
			(seq 
				(call node ("srv" "add_alias") [alias serviceId])
				(seq
					(call init_relay ("op" "identity") [])
					(call %init_peer_id% ("callback" "callback") [])
				)
			)
        )
    `,
			)
			.withVariable('node', node.peerId)
			.withVariables({ alias, serviceId })
			.buildAsFetch('callback', 'callback');

		await client.initiateFlow(request);
		await promise;
		return;
	}

	async getModules(node: Node): Promise<string[]> {
		const client = await this.makeClient(node);
		return await getMod(client, this.ttl);
	}

	async getInterfaces(node: Node): Promise<string[]> {
		const client = await this.makeClient(node);
		console.log(this.ttl);
		return await getInter(client, this.ttl);
	}

	async getInterface(serviceId: string, node: Node): Promise<string[]> {
		const client = await this.makeClient(node);
		let callbackFn = 'getInterface';
		let script = `
            (seq
                (call relay ("srv" "get_interface") [serviceId] interface)
                (call myPeerId ("_callback" "${callbackFn}") [interface])
            )
        `;
		let data = {
			relay: client.relayPeerId,
			myPeerId: client.selfPeerId,
			serviceId: serviceId,
		};
		let particle = new Particle(script, data, this.ttl);

		const [res] = await sendParticleAsFetch<[string[]]>(client, particle, callbackFn);
		return res;
	}

	async runAir(
		node: Node,
		air: string,
		callback: (args, tetraplets) => void,
		data?: Map<string, any> | Record<string, any>,
	): Promise<[string, Promise<void>]> {
		data = data || new Map();
		const client = await this.makeClient(node);

		let request;
		const operationPromise = new Promise<void>((resolve, reject) => {
			const b = new RequestFlowBuilder()
				.withRawScript(air)
				.withVariable('relay', node.peerId)
				.withVariable('returnService', 'returnService')
				.configHandler((h) => {
					h.onEvent('returnService', 'run', callback);
					resolve();
				})
				.handleScriptError(reject);

			if (data) {
				b.withVariables(data);
			}

			request = b.build();
		});

		await client.initiateFlow(request);
		return [request.id, operationPromise];
	}

	async addScript(node: Node, script: string, interval?: number): Promise<string> {
		const client = await this.makeClient(node);

		const intervalToUse = interval || 3;
		// const escaped = script.replace('"', '\\"');
		const escaped = script;

		const [request, promise] = new RequestFlowBuilder()
			.withRawScript(
				`
        (seq
			(call init_relay ("op" "identity") [])
			(seq
				(call node ("script" "add") [script interval] result)
				(seq
					(call init_relay ("op" "identity") [])
					(call %init_peer_id% ("callback" "callback") [result])
				)
			)
        )
    `,
			)
			.withVariable('node', node.peerId)
			.withVariable('script', escaped)
			.withVariable('interval', intervalToUse.toString())
			.withTTL(this.ttl)
			.buildAsFetch<[string]>('callback', 'callback');

		await client.initiateFlow(request);
		const [res] = await promise;
		return res;
	}

	async removeScript(node: Node, scriptId: string): Promise<void> {
		const client = await this.makeClient(node);

		const [request, promise] = new RequestFlowBuilder()
			.withRawScript(
				`
        (seq
			(call init_relay ("op" "identity") [])
			(seq
				(call node ("script" "remove") [scriptId])
				(seq
					(call init_relay ("op" "identity") [])
					(call %init_peer_id% ("callback" "callback") [])
				)
			)
        )
    `,
			)
			.withVariable('node', node.peerId)
			.withVariable('scriptId', scriptId)
			.withTTL(this.ttl)
			.buildAsFetch<[]>('callback', 'callback');

		await client.initiateFlow(request);
		await promise;
	}

	async uploadAllModules(node: Node) {
		for await (const module of this.modules) {
			await this.uploadModuleToNode(node, module);
		}
	}

	async uploadAllModulesToAllNodes() {
		for await (const node of this.nodes) {
			await this.uploadAllModules(node);
		}
	}

	async uploadAllBlueprints(node: Node) {
		for await (const bp of this.blueprints) {
			await this.uploadBlueprint(node, bp);
		}
	}

	async uploadAllBlueprintsToAllNodes() {
		for await (const node of this.nodes) {
			await this.uploadAllBlueprints(node);
		}
	}

	async distributeServices(relay: Node, distribution: Map<string, number[]>) {
		this.innerClient = await this.makeClient(relay);

		// Cache information about uploaded modules & blueprints to avoid uploading them several times
		const uploadedModules = new Set<[Node, string]>();
		const uploadedBlueprints = new Set<[Node, string]>();

		async function uploadM(d: Distributor, node: Node, module: Module) {
			const already = uploadedModules.has([node, module.config.name]);
			if (!already) {
				await promiseRetry({ retries: 3 }, () => d.uploadModuleToNode(node, module));
			}
			uploadedModules.add([node, module.config.name]);
		}

		async function uploadB(d: Distributor, node: Node, bp: Blueprint): Promise<Blueprint> {
			const already = uploadedBlueprints.has([node, bp.name]);
			if (!already) {
				const blueprint = await promiseRetry({ retries: 3 }, () => d.uploadBlueprint(node, bp));
				uploadedBlueprints.add([node, bp.name]);
				return { ...bp, id: blueprint };
			}

			return bp;
		}

		for await (const [name, nodes] of distribution.entries()) {
			const blueprint = this.blueprints.find((bp) => bp.name === name);
			if (!blueprint) {
				throw new Error(`can't find blueprint ${name}`);
			}

			const modules: [string, Module | undefined][] = blueprint.dependencies.map((moduleName) => [
				moduleName,
				this.modules.find((m) => m.config.name === moduleName),
			]);

			for await (const idx of nodes) {
				const node = this.nodes[idx];
				for await (const [nameM, module] of modules) {
					if (module) {
						await uploadM(this, node, module);
					} else {
						throw new Error(`can't find dependency ${nameM} for bluprint ${blueprint.name}`);
					}
				}
				const bp = await uploadB(this, node, blueprint);
				if (!bp.id) {
					throw new Error(`Blurptin should be with id to create a service`);
				}
				let serviceId = await this.createService(node, bp.id);
				log.warn(`service created ${serviceId} as instance of ${bp.name}@${bp.id}`);
			}
		}
	}
}
