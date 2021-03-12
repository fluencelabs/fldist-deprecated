import { Context } from '../args';
import { Distributor } from '../distributor';

export default {
	command: 'get_interfaces',
	describe: 'Print all services on a node',
	builder: (yargs) => {
		return yargs.option('expand', {
			demandOption: false,
			describe: 'expand interfaces. default is minified',
			type: 'boolean',
		});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor = new Distributor(context.nodes, context.ttl, context.seed);

		const interfaces = await distributor.getInterfaces(context.node);
		if (Boolean(argv.expand)) {
			console.log(JSON.stringify(interfaces, undefined, 2));
		} else {
			console.log(interfaces);
			console.log('to expand interfaces, use get_interfaces --expand');
		}
		process.exit(0);
	},
};
