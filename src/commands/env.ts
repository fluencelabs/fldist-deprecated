import { Context } from 'src/args';

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
		const context: Context = argv.context;
		if (argv.json) {
			console.log(JSON.stringify(context.nodes, undefined, 2));
		} else {
			let env = context.nodes.map((n) => n.multiaddr).join('\n');
			console.log(env);
		}
		process.exit(0);
	},
};
