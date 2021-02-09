import log from 'loglevel';
import promiseRetry from 'promise-retry';
import {promises as fs} from "fs";
import {
	addBlueprint,
	createService as fluenceCreateService,
	generatePeerId, peerIdToSeed,
	seedToPeerId,
	uploadModule
} from "@fluencelabs/fluence";
import {FluenceClientImpl} from "@fluencelabs/fluence/dist/internal/FluenceClientImpl";
import {v4 as uuidv4} from 'uuid';
import {Node} from "@fluencelabs/fluence-network-environment";
import {ModuleConfig} from "@fluencelabs/fluence/dist/internal/moduleConfig";

export const TTL = 20000;

type Module = {
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
		config = createConfig({ name })
	} else {
		throw new Error(`either --config or --name must be specified`)
	}
	return { base64: await loadModule(path), config: config}
}

export async function getFileContent(path: string): Promise<string> {
	const data = await fs.readFile(path);
	return data.toString();
}

type Blueprint = {
	id: string;
	name: string;
	dependencies: string[];
};

type ConfigArgs = {
	name: string;
	mountedBinaries?: any;
	preopenedFiles?: string[];
	mappedDirs?: any;
};

function createConfig(args: ConfigArgs): ModuleConfig {
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
	innerClient?: FluenceClientImpl;
	// Seed of the private key of the used PeerId
	seed?: string;

	constructor(nodes: Node[], seed?: string) {
		this.nodes = nodes;
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
				config: createConfig({ name: 'curl_adapter', mountedBinaries: { curl: '/usr/bin/curl' }, preopenedFiles: ['/tmp'] }),
			},
			{
				base64: await loadModule('./src/artifacts/url-downloader/local_storage.wasm'),
				config: createConfig({ name: 'local_storage', preopenedFiles: ['/tmp'], mappedDirs: { sites: '/tmp' } }),
			},
			{
				base64: await loadModule('./src/artifacts/url-downloader/facade.wasm'),
				config: createConfig({ name: 'facade_url_downloader' }),
			},
			{ base64: await loadModule('./src/artifacts/sqlite3.wasm'), config: createConfig({ name: 'sqlite3' }) },
			{ base64: await loadModule('./src/artifacts/user-list.wasm'), config: createConfig({ name: 'userlist' }) },
			{ base64: await loadModule('./src/artifacts/history.wasm'), config: createConfig({ name: 'history' }) },
			{ base64: await loadModule('./src/artifacts/redis.wasm'), config: createConfig({ name: 'redis' }) },
		];
	}

	async makeClient(node: Node): Promise<FluenceClientImpl> {
		let peerId;
		if (this.seed) {
			peerId = await seedToPeerId(this.seed)
		} else {
			peerId = await generatePeerId();
			this.seed = peerIdToSeed(peerId);
		}
		if (typeof this.innerClient == 'undefined' || this.innerClient.relayPeerId != node.peerId) {
			console.log("client seed: " + this.seed);
			console.log("client peerId: " + peerId.toB58String());
			console.log("node peerId: " + node.peerId);
			this.innerClient = new FluenceClientImpl(peerId);
			await this.innerClient.connect(node.multiaddr);
		}
		return this.innerClient;
	}

	async uploadModuleToNode(node: Node, module: Module) {
		const client = await this.makeClient(node);
		log.warn(
			`uploading module ${module.config.name} to node ${
				node.peerId
			} via client ${client.selfPeerId} with config:`,
		);
		log.warn(JSON.stringify(module.config, undefined, 2))

		await uploadModule(client, module.config.name, module.base64, module.config);
	}

	async uploadBlueprint(node: Node, bp: Blueprint): Promise<Blueprint> {
		const client = await this.makeClient(node);
		log.warn(`uploading blueprint ${bp.name} to node ${node.peerId} via client ${client.selfPeerId}`);

		const blueprintId = await addBlueprint(client, bp.name, bp.dependencies, bp.id, node.peerId, TTL);
		if (blueprintId !== bp.id) {
			log.error(
				`NON-CONSTANT BLUEPRINT ID: Expected blueprint id to be predefined as ${bp.id}, but it was generated by node as ${blueprintId}`,
			);
			return { ...bp, id: blueprintId };
		}

		return bp;
	}

	async createService(node: Node, bpId: string): Promise<string> {
		const client = await this.makeClient(node);
		log.warn(`creating service ${bpId}`);
		return await fluenceCreateService(client, bpId, node.peerId, TTL)
	}

	async runAir(node: Node, air: string, data: Map<string, any>): Promise<string> {
		const client = await this.makeClient(node);
		let returnService = uuidv4()

		data.set("returnService", returnService);
		data.set("relay", node.peerId);

		client.registerCallback(returnService, "run", (args, tetraplets) => {
			console.log("===================")
			console.log(JSON.stringify(args, undefined, 2))
			console.log(tetraplets)
			console.log("===================")
			return {}
		})

		let particleId = await client.sendScript(air, data)
		log.warn(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`)
		return particleId
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
				return blueprint;
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
				let serviceId = await this.createService(node, bp.id);
				log.warn(
					`service created ${serviceId} as instance of ${bp.name}@${
						bp.id
					}`
				);
			}
		}
	}
}
