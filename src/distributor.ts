import log from 'loglevel';
import { promises as fs } from 'fs';
import {
	addBlueprint,
	createService as fluenceCreateService,
	generatePeerId,
	getInterfaces as getInter,
	getModules as getMod,
	Particle,
	peerIdToSeed,
	seedToPeerId,
	sendParticleAsFetch,
	FluenceClient,
	createClient,
} from '@fluencelabs/fluence';
import { Node } from '@fluencelabs/fluence-network-environment';
import { RequestFlowBuilder } from '@fluencelabs/fluence/dist/api.unstable';
import { ModuleConfig } from '@fluencelabs/fluence/dist/internal/moduleConfig';
import { Context } from './types';

export type Module = {
	base64: string;
	config: ModuleConfig;
};

export async function loadModule(path: string): Promise<string> {
	const data = await fs.readFile(path);
	return data.toString('base64');
}

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

export async function getFileContent(path: string): Promise<string> {
	const data = await fs.readFile(path);
	return data.toString();
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

type Blueprint = {
	id?: string;
	name: string;
	dependencies: string[];
};

export class Distributor {
	blueprints: Blueprint[];

	nodes: Node[];

	modules: Module[];

	client: FluenceClient;

	ttl: number;

	static create = async (context: Context): Promise<Distributor> => {
		let peerId;
		let seed = context.seed;
		if (seed) {
			peerId = await seedToPeerId(seed);
		} else {
			peerId = await generatePeerId();
			seed = peerIdToSeed(peerId);
		}

		if (context.verbose) {
			console.log(`client seed: ${seed}`);
			console.log(`client peerId: ${peerId.toB58String()}`);
			console.log(`relay peerId: ${context.relay.peerId}`);
		}

		const client = await createClient(context.relay, context.seed);
		return new Distributor(context.nodes, context.ttl, client);
	};

	constructor(nodes: Node[], ttl: number, client: FluenceClient) {
		this.nodes = nodes;
		this.ttl = ttl;
		this.client = client;

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

	async closeClient(): Promise<void> {
		if (!this.client) {
			return;
		}

		await this.client.disconnect();
	}

	async uploadModuleToNode(node: string, module: Module): Promise<string> {
		const [req, promise] = new RequestFlowBuilder()
			.withRawScript(
				`
	(seq
		(call init_relay ("op" "identity") [])
		(seq
			(call node ("dist" "add_module") [module_bytes module_config] result)
			(seq 
				(call init_relay ("op" "identity") [])
        		(call %init_peer_id% ("callback" "callback") [result])
			)
		)
    )`,
			)
			.withVariable('module_bytes', module.base64)
			.withVariable('module_config', module.config)
			.withVariable('node', node)
			.withTTL(this.ttl)
			.buildAsFetch<[string]>('callback', 'callback');

		await this.client.initiateFlow(req);
		const [res] = await promise;
		return res;
	}

	async uploadBlueprint(node: string, bp: Blueprint): Promise<string> {
		log.warn(`uploading blueprint ${bp.name} to node ${node} via client ${this.client.selfPeerId}`);

		return addBlueprint(this.client, bp.name, bp.dependencies, undefined, node, this.ttl);
	}

	async createService(node: string, bpId: string): Promise<string> {
		return fluenceCreateService(this.client, bpId, node, this.ttl);
	}

	async createAlias(node: string, serviceId: string, alias: string): Promise<void> {
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
			.withVariable('node', node)
			.withVariables({ alias, serviceId })
			.buildAsFetch<void>('callback', 'callback');

		await this.client.initiateFlow(request);
		return promise;
	}

	async getModules(_node: string): Promise<string[]> {
		return getMod(this.client, this.ttl);
	}

	async getInterfaces(_node: string): Promise<string[]> {
		console.log(this.ttl);
		return getInter(this.client, this.ttl);
	}

	async getInterface(serviceId: string, node: string): Promise<string[]> {
		const callbackFn = 'getInterface';
		const script = `
            (seq
				(call init_relay ("op" "identity") [])
				(seq 
                	(call node ("srv" "get_interface") [serviceId] interface)
					(seq
						(call init_relay ("op" "identity") [])
                		(call myPeerId ("_callback" "${callbackFn}") [interface])
					)
				)
            )
        `;
		const data = {
			node: node,
			myPeerId: this.client.selfPeerId,
			serviceId: serviceId,
		};
		const particle = new Particle(script, data, this.ttl);

		const [res] = await sendParticleAsFetch<[string[]]>(this.client, particle, callbackFn);
		return res;
	}

	async runAir(
		air: string,
		callback: (args, tetraplets) => void,
		data?: Map<string, any> | Record<string, any>,
		multipleResults = false,
	): Promise<[string, Promise<void>]> {
		let request;
		const operationPromise = new Promise<void>((resolve, reject) => {
			const b = new RequestFlowBuilder()
				.withDefaults()
				.withTTL(this.ttl)
				.withRawScript(air)
				.withVariable('relay', this.client.relayPeerId)
				.withVariable('returnService', 'returnService')
				.withVariables(data || new Map())
				.configHandler((h) => {
					h.onEvent('returnService', 'run', (args, tetraplets) => {
						callback(args, tetraplets);
						if (!multipleResults) {
							resolve();
						}
					});
				})
				.handleScriptError(reject)
				.handleTimeout(multipleResults ? resolve : reject);

			request = b.build();
		});

		await this.client.initiateFlow(request);
		return [request.id, operationPromise];
	}

	async addScript(node: string, script: string, interval?: number): Promise<string> {
		const intervalToUse = interval || 3;

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
			.withVariable('node', node)
			.withVariable('script', script)
			.withVariable('interval', intervalToUse.toString())
			.withTTL(this.ttl)
			.buildAsFetch<[string]>('callback', 'callback');

		await this.client.initiateFlow(request);
		const [res] = await promise;
		return res;
	}

	async removeScript(node: string, scriptId: string): Promise<void> {
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
			.withVariable('node', node)
			.withVariable('scriptId', scriptId)
			.withTTL(this.ttl)
			.buildAsFetch<[]>('callback', 'callback');

		await this.client.initiateFlow(request);
		await promise;
	}
}
