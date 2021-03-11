import { CliApi } from 'src';

export default {
	command: 'env',
	describe: 'show nodes in currently selected environment',
	builder: (yargs) => {
		return yargs.option('json', {
			demandOption: false,
			describe: 'if specified, output environment as JSON',
			type: 'boolean',
			default: false,
		});
	},
	handler: (argv) => {
		let api = argv.api as CliApi;
		if (argv.json) {
			console.log(JSON.stringify(api.distributor.nodes, undefined, 2));
		} else {
			let env = api.distributor.nodes.map((n) => n.multiaddr).join('\n');
			console.log(env);
		}
		process.exit(0);
	},
};
