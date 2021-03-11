import log, {LogLevelDesc} from 'loglevel';
import yargs, {Arguments} from "yargs";
import {
	CliApi
} from "./index";
import {generatePeerId, peerIdToSeed, setLogLevel} from "@fluencelabs/fluence";
import {testNet, dev, Node} from '@fluencelabs/fluence-network-environment';
import deployApp from './deployApp';

const {hideBin} = require('yargs/helpers')

function isString(x: any): x is string {
	return typeof x === "string";
}

function defined<T>(x: T | undefined): x is T {
	return typeof x != "undefined";
}

function maybeString(argv: Arguments<{}>, key: string): string | undefined {
	let value = argv[key];
	if (isString(value)) {
		return value;
	}

	return undefined;
}

/* to run node in the local docker container
docker run --rm -e RUST_LOG="info" -p 1210:1210 -p 4310:4310 fluencelabs/fluence -t 1210 -w 4310 -k gKdiCSUr1TFGFEgu2t8Ch1XEUsrN5A2UfBLjSZvfci9SPR3NvZpACfcpPGC3eY4zma1pk7UvYv5zb1VjvPHwCjj
*/
const local = [
	{
		multiaddr: '/ip4/127.0.0.1/tcp/4310/ws/p2p/12D3KooWKEprYXUXqoV5xSBeyqrWLpQLLH4PXfvVkDJtmcqmh5V3',
		peerId: '12D3KooWKEprYXUXqoV5xSBeyqrWLpQLLH4PXfvVkDJtmcqmh5V3',
	},
];

export function args() {
	return yargs(hideBin(process.argv))
		.usage('Usage: $0 <cmd> [options]') // usage string of application.
		.global(['seed', 'env', 'node-id', 'node-addr', 'log', 'ttl'])
		.scriptName('fldist')
		.completion()
		.demandCommand()
		.strict()
		.middleware((argv) => {
			let logLevel = argv.log as LogLevelDesc;
			log.setLevel(logLevel);
			setLogLevel(logLevel);

			let env = argv.env as 'dev' | 'testnet' | 'local';
			let nodes;
			switch (env) {
				case 'local':
					nodes = local;
					break;
				case 'dev':
					nodes = dev;
					break;
				case 'testnet':
					nodes = testNet;
					break;
			}

			let node: Node | undefined = undefined;
			let node_id = maybeString(argv, "node-id");
			let node_addr = maybeString(argv, "node-addr");
			if (defined(node_id) && defined(node_addr)) {
				let splitted = node_addr.split("/");
				let last = splitted[splitted.length - 1];
				let penult = splitted[splitted.length - 2];
				if (!last.startsWith("12D3") && !penult.startsWith("12D3")) {
					// add node_id to multiaddr if there is no peer_id in multiaddr
					splitted.push("p2p");
					splitted.push(node_id);
					node_addr = splitted.join("/");
				}
				node = {
					peerId: node_id,
					multiaddr: node_addr,
				};
			} else if (defined(node_id)) {
				node = nodes.find(n => n.peerId === node_id)
				if (!defined(node)) {
					let environment = nodes.map(n => n.peerId).join("\n\t");
					console.error(`Error:\n'--node ${node_id}' doesn't belong to selected environment (${env}):\n\t${environment}`);
					process.exit(1);
				}
			}

			let ttl = argv.ttl as number;
			argv.api = new CliApi(nodes, ttl, argv.seed as string, node);
		})
		.option('s', {
			alias: 'seed',
			demandOption: false,
			describe: 'Client seed',
			type: 'string'
		})
		.option('env', {
			demandOption: true,
			describe: 'Environment to use',
			choices: ['dev', 'testnet'],
			default: 'testnet',
		})
		.option('node-id', {
			alias: 'node',
			demandOption: false,
			describe: 'PeerId of the node to use',
		})
		.option('node-addr', {
			demandOption: false,
			describe: 'Multiaddr of the node to use'
		})
		.option('log', {
			demandOption: true,
			describe: 'log level',
			choices: ['trace', 'debug', 'info', 'warn', 'error'],
			default: 'info'
		})
		.option('ttl', {
			demandOption: true,
			describe: 'particle time to live in ms',
			type: 'number',
			default: 60000
		})
		.command({
			command: 'upload',
			describe: 'Upload selected wasm',
			builder: (yargs) => {
				return yargs
					.option('p', {
						alias: 'path',
						demandOption: true,
						describe: 'Path to wasm file',
						type: 'string'
					})
					.option('c', {
						alias: 'config',
						demandOption: false,
						describe: `Path to config in this format:
type ConfigArgs = {
\tname: string;
\tmountedBinaries?: any;
\tpreopenedFiles?: string[];
\tmappedDirs?: any;
};`,
						type: 'string'
					})
					.option('n', {
						alias: 'name',
						demandOption: false,
						describe: 'A name of a wasm module',
						type: 'string'
					})
					.conflicts('config', 'name')
			},
			handler: async (argv) => {
				await (argv.api as CliApi).uploadModule(argv.path as string, argv.name as string, argv.config as string)
				console.log("module uploaded successfully")
				process.exit(0);
			}
		})
		.command({
			command: 'get_modules',
			describe: 'Print all modules on a node',
			builder: (yargs) => {
				return yargs
					.option('pretty', {
						demandOption: false,
						describe: 'whether to pretty json output',
						type: 'boolean'
					})
			},
			handler: async (argv) => {
				let modules = await (argv.api as CliApi).getModules();
				if (argv.pretty) {
					console.log(JSON.stringify(modules, undefined, 2))
				} else {
					console.log(JSON.stringify(modules))
				}
				process.exit(0);
			}
		})
		.command({
			command: 'get_interfaces',
			describe: 'Print all services on a node',
			builder: (yargs) => {
				return yargs
					.option('expand', {
						demandOption: false,
						describe: 'expand interfaces. default is minified',
						type: 'boolean'
					})
			},
			handler: async (argv) => {
				await (argv.api as CliApi).getInterfaces(argv.expand as boolean);
				process.exit(0);
			}
		})
		.command({
			command: 'get_interface',
			describe: 'Print a service interface',
			builder: (yargs) => {
				return yargs
					.option('i', {
						alias: 'id',
						demandOption: true,
						describe: 'Service id',
						type: 'string'
					})
					.option('expand', {
						demandOption: false,
						describe: 'expand interfaces. default is minified',
						type: 'boolean'
					})
			},
			handler: async (argv) => {
				await (argv.api as CliApi).getInterface(argv.id as string, argv.expand as boolean);
				process.exit(0);
			}
		})
		.command({
				command: 'add_blueprint',
				describe: 'Add a blueprint',
				builder: (yargs) => {
					return yargs
						.option('d', {
							alias: 'deps',
							demandOption: true,
							describe: 'Dependencies',
							type: 'array'
						})
						.option('n', {
							alias: 'name',
							demandOption: true,
							describe: 'a name of a blueprint',
							type: 'string'
						})
				},
				handler: async (argv) => {
					let id = await (argv.api as CliApi)
						.addBlueprint(argv.name as string, argv.deps as string[])
					console.log(`blueprint '${id}' added successfully`)
					process.exit(0);
				}
			}
		)
		.command({
			command: 'create_service',
			describe: 'Create a service from existing blueprint',
			builder: (yargs) => {
				return yargs
					.option('i', {
						alias: 'id',
						demandOption: true,
						describe: 'blueprint id',
						type: 'string'
					})

			},
			handler: async (argv) => {
				await (argv.api as CliApi).createService(argv.id as string);
				console.log("service created successfully");
				process.exit(0);

			}
		})
		.command({
			command: 'new_service',
			describe: 'Create service from a list of modules',
			builder: (yargs) => {
				return yargs
					.option('ms', {
						alias: 'modules',
						demandOption: true,
						describe: 'array of path:config pairs; meaning <path to wasm module>:<path to config>',
						type: 'array'
					})
					.coerce('modules', (arg: string[]) => {
						return arg.map(s => {
							const [wasm_path, config_path] = s.split(':');
							return {wasm_path, config_path};
						});
					})
					.option('n', {
						alias: 'name',
						demandOption: true,
						describe: 'name of the service; will be set in the blueprint',
						type: 'string'
					})
			},
			handler: async (argv) => {
				await (argv.api as CliApi).newService(argv.name as string, argv.modules as any[]);
				console.log("service created successfully");
				process.exit(0);
			}
		})
		.command(deployApp)
		.command({
			command: 'create_keypair',
			describe: 'Generates a random keypair',
			builder: (yargs) => {
				return yargs
			},
			handler: async _ => {
				let peerId = await generatePeerId();
				console.log({
					...peerId.toJSON(),
					seed: peerIdToSeed(peerId),
				})
				process.exit(0);
			}
		})
		.command({
			command: 'run_air',
			describe: 'Send an air script from a file. Send arguments to "returnService" back to the client to print them in the console. More examples in "scripts_examples" directory.',
			builder: (yargs) => {
				return yargs
					.option('p', {
						alias: 'path',
						demandOption: true,
						describe: 'Path to air script',
						type: 'string'
					})
					.option('d', {
						alias: 'data',
						demandOption: true,
						describe: 'Data for air script in json',
						type: 'string'
					})
					.coerce("data", function (arg) {
						const dataJson = JSON.parse(arg);
						return new Map(Object.entries(dataJson));
					})
			},
			handler: async (argv) => {
				await (argv.api as CliApi).runAir(argv.path as string, argv.data as Map<string, any>);
			}
		})
		.command({
			command: 'env',
			describe: 'show nodes in currently selected environment',
			builder: (yargs) => {
				return yargs
					.option('json', {
						demandOption: false,
						describe: 'if specified, output environment as JSON',
						type: 'boolean',
						default: false
					})
			},
			handler: (argv) => {
				let api = argv.api as CliApi;
				if (argv.json) {
					console.log(JSON.stringify(api.distributor.nodes, undefined, 2));
				} else {
					let env = api.distributor.nodes.map(n => n.multiaddr).join("\n");
					console.log(env)
				}
				process.exit(0);
			}
		})
		.command({
			command: '*',
			handler() {
			  yargs.showHelp()
			}
		})
		.fail(function (msg, err) {
			console.error('Something went wrong!')
			if (msg) console.error(msg)
			console.error(err)
			process.exit(1)
		})
		.parse();
}
