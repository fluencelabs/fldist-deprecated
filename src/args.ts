import log, {LogLevelDesc} from 'loglevel';
import yargs from "yargs";
import {
	CliApi
} from "./index";
import {generatePeerId, peerIdToSeed} from "@fluencelabs/fluence";
import {testNet, dev} from '@fluencelabs/fluence-network-environment';

const {hideBin} = require('yargs/helpers')

export function args() {
	return yargs(hideBin(process.argv))
		.usage('Usage: $0 <cmd> [options]') // usage string of application.
		.global(['seed', 'env', 'node-id', 'node-addr', 'log'])
		.middleware((argv) => {
			let logLevel = argv.log as LogLevelDesc;
			log.setLevel(logLevel);
			log.trace("test trace");

			let env = argv.env as 'dev' | 'testnet';
			let nodes;
			switch (env) {
				case 'dev':
					nodes = dev;
					break;
				case 'testnet':
					nodes = testNet;
					break;
			}
			let node = undefined;
			if (argv["node-id"] && argv["node-addr"]) {
				node = {
					peerId: argv["node-id"] as string,
					multiaddr: argv["node-addr"] as string,
				};
			}
			argv.api = new CliApi(nodes, argv.seed as string, node);
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
		.implies('node-id', 'node-addr')
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
						.option('i', {
							alias: 'id',
							demandOption: false,
							describe: 'an id of a blueprint',
							type: 'string'
						})
				},
				handler: async (argv) => {
					let id = await (argv.api as CliApi).addBlueprint(argv.name as string, argv.id as string, argv.deps as string[])
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
		.command({
			command: 'create_keypair',
			describe: 'Generates a random keypair',
			builder: (yargs) => {
				return yargs
			},
			handler: async (argv) => {
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
		.parse();
}
