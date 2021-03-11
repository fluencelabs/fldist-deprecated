import log, { LogLevelDesc } from 'loglevel';
import yargs, { Arguments } from 'yargs';
import { CliApi } from './index';
import { generatePeerId, peerIdToSeed, setLogLevel } from '@fluencelabs/fluence';
import { testNet, dev, Node } from '@fluencelabs/fluence-network-environment';
import deployApp from './commands/deployApp';
import upload from './commands/upload';
import getModules from './commands/getModules';
import getInterfaces from './commands/getInterfaces';
import addBlueprint from './commands/addBlueprint';
import createService from './commands/createService';
import newService from './commands/newService';
import createKeyPair from './commands/createKeyPair';
import runAir from './commands/runAir';
import env from './commands/env';

const { hideBin } = require('yargs/helpers');

function isString(x: any): x is string {
	return typeof x === 'string';
}

function defined<T>(x: T | undefined): x is T {
	return typeof x != 'undefined';
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
			let node_id = maybeString(argv, 'node-id');
			let node_addr = maybeString(argv, 'node-addr');
			if (defined(node_id) && defined(node_addr)) {
				let splitted = node_addr.split('/');
				let last = splitted[splitted.length - 1];
				let penult = splitted[splitted.length - 2];
				if (!last.startsWith('12D3') && !penult.startsWith('12D3')) {
					// add node_id to multiaddr if there is no peer_id in multiaddr
					splitted.push('p2p');
					splitted.push(node_id);
					node_addr = splitted.join('/');
				}
				node = {
					peerId: node_id,
					multiaddr: node_addr,
				};
			} else if (defined(node_id)) {
				node = nodes.find((n) => n.peerId === node_id);
				if (!defined(node)) {
					let environment = nodes.map((n) => n.peerId).join('\n\t');
					console.error(
						`Error:\n'--node ${node_id}' doesn't belong to selected environment (${env}):\n\t${environment}`,
					);
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
			type: 'string',
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
			describe: 'Multiaddr of the node to use',
		})
		.option('log', {
			demandOption: true,
			describe: 'log level',
			choices: ['trace', 'debug', 'info', 'warn', 'error'],
			default: 'info',
		})
		.option('ttl', {
			demandOption: true,
			describe: 'particle time to live in ms',
			type: 'number',
			default: 60000,
		})
		.command(upload)
		.command(getModules)
		.command(getInterfaces)
		.command(getInterface)
		.command(addBlueprint)
		.command(createService)
		.command(newService)
		.command(deployApp)
		.command(createKeyPair)
		.command(runAir)
		.command(env)
		.command({
			command: '*',
			handler() {
				yargs.showHelp();
			},
		})
		.fail(function (msg, err) {
			console.error('Something went wrong!');
			if (msg) console.error(msg);
			console.error(err);
			process.exit(1);
		})
		.parse();
}
