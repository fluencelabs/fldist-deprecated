import { Context } from '../args';
import { Distributor } from '../distributor';

export default {
	command: 'get_modules',
	describe: 'Print all modules on a node',
	builder: (yargs) => {
		return yargs.option('pretty', {
			demandOption: false,
			describe: 'whether to pretty json output',
			type: 'boolean',
		});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor = new Distributor(context.nodes, context.ttl, context.seed);
		let modules = await distributor.getModules(context.node);

		if (argv.pretty) {
			console.log(JSON.stringify(modules, undefined, 2));
		} else {
			console.log(JSON.stringify(modules));
		}
		process.exit(0);
	},
};
