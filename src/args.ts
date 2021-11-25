import log, { LogLevelDesc } from 'loglevel';
import yargs, { Arguments } from 'yargs';
import { KeyPair, setLogLevel } from '@fluencelabs/fluence';
import { testNet, Node, stage, krasnodar } from '@fluencelabs/fluence-network-environment';
import { hideBin } from 'yargs/helpers';
import * as PeerId from 'peer-id';
import * as base64 from 'base64-js';

import deployApp from './commands/deployApp';
import upload from './commands/upload';
import getModules from './commands/getModules';
import getInterfaces from './commands/getInterfaces';
import addBlueprint from './commands/addBlueprint';
import createService from './commands/createService';
import newService from './commands/newService';
import createKeyPair from './commands/createKeyPair';
import runAir from './commands/runAir';
import envCommand from './commands/env';
import getInterface from './commands/getInterface';
import { Distributor } from './distributor';
import { Context, Env } from './types';
import monitor from './commands/monitor';

export const DEFAULT_NODE_IDX = 3;

function isString(x: any): x is string {
	return typeof x === 'string';
}

function defined<T>(x: T | undefined): x is T {
	return typeof x !== 'undefined';
}

function maybeString(argv: Arguments<Record<string, unknown>>, key: string): string | undefined {
	const value = argv[key];
	if (isString(value)) {
		return value;
	}

	return undefined;
}

export function args() {
	return yargs(hideBin(process.argv))
		.usage('Usage: $0 <cmd> [options]') // usage string of application.
		.global(['seed', 'sk', 'env', 'node-id', 'node-addr', 'log', 'ttl', 'verbose'])
		.scriptName('fldist')
		.completion()
		.demandCommand()
		.strict()
		.middleware(async (argv) => {
			if (isString(argv.sk)) {
				try {
					// deserialize secret key from base64
					const bytes = base64.toByteArray(argv.sk);
					argv.keypair = KeyPair.fromEd25519SK(bytes);
				} catch (e) {
					console.error('pk should be base64 encoding of secret and public keys concatenated');
					throw e;
				}
			} else {
				argv.keypair = KeyPair.randomEd25519();
			}

			argv.peerId = (argv.keypair as KeyPair).Libp2pPeerId;
		})
		.middleware((argv) => {
			const logLevel = argv.log as LogLevelDesc;
			log.setLevel(logLevel);
			setLogLevel(logLevel);

			const env = argv.env as Env;
			let nodes;
			switch (env) {
				case 'testnet':
					nodes = testNet;
					break;
				case 'stage':
					nodes = stage;
					break;
				case 'krasnodar':
					nodes = krasnodar;
					break;
				default:
					console.error('incorrect env', env);
					process.exit(1);
			}

			let node: Node | undefined;
			let nodeId = maybeString(argv, 'node-id');
			let nodeAddr = maybeString(argv, 'node-addr');
			if (defined(nodeAddr)) {
				const splitted = nodeAddr.split('/');
				const last = splitted[splitted.length - 1];
				// account for the leading slash
				const penult = splitted[splitted.length - 2];
				// if node_addr doesn't contain /p2p/<peerId>, then set it from --node-id
				if (!last.startsWith('12D3') && !penult.startsWith('12D3')) {
					if (defined(nodeId)) {
						// add node_id to multiaddr if there is no peer_id in multiaddr
						splitted.push('p2p');
						splitted.push(nodeId);
						nodeAddr = splitted.join('/');
					} else {
						console.error(`Error:\n Missing --node-id`);
						process.exit(1);
					}
				} else {
					// if node_addr contains peer id, ignore --node-id
					nodeId = last.startsWith('12D3') ? last : penult;
				}
				node = {
					peerId: nodeId,
					multiaddr: nodeAddr,
				};
			} else if (defined(nodeId)) {
				node = nodes.find((n) => n.peerId === nodeId);
				if (!defined(node)) {
					const environment = nodes.map((n) => n.peerId).join('\n\t');
					console.error(
						`Error:\n'--node ${nodeId}' doesn't belong to selected environment (${env}):\n\t${environment}`,
					);
					process.exit(1);
				}
			}

			const ttl = argv.ttl as number;

			const context: Context = {
				nodes: nodes,
				relay: node || nodes[DEFAULT_NODE_IDX] || nodes[0],
				peerId: argv.peerId as PeerId,
				env: env,
				ttl: ttl,
				verbose: argv.verbose as boolean,
				keypair: argv.keypair as KeyPair,
			};
			argv.context = context;
		})
		.middleware(async (argv) => {
			argv.getDistributor = async () => {
				if (!argv.distributor) {
					argv.distributor = await Distributor.create(argv.context as Context);
				}
				return argv.distributor;
			};
		})
		.option('v', {
			alias: 'verbose',
			demandOption: false,
			describe: 'Display verbose information such as created client seed + peer Id and relay peer id',
			type: 'boolean',
			default: false,
		})
		.option('sk', {
			alias: ['secret-key'],
			demandOption: false,
			describe: "Client's ed25519 private key in base64 (32 byte)",
			type: 'string',
		})
		.option('env', {
			demandOption: true,
			describe: 'Environment to use',
			choices: ['krasnodar', 'testnet', 'stage'],
			default: 'krasnodar',
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
			default: 'error',
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
		.command(monitor)
		.command(envCommand)
		.command({
			command: '*',
			handler: () => {
				yargs.showHelp();
			},
		})
		.fail((msg, err) => {
			console.error('Something went wrong!');
			if (msg) console.error(msg);
			console.error(err);
			process.exit(1);
		})
		.parse();
}
