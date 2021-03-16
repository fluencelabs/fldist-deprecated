import { Context } from '../args';
import { Distributor } from '../distributor';

export default {
	command: 'get_interface',
	describe: 'Print a service interface',
	builder: (yargs) => {
		return yargs
			.option('i', {
				alias: 'id',
				demandOption: true,
				describe: 'Service id',
				type: 'string',
			})
			.option('expand', {
				demandOption: false,
				describe: 'expand interfaces. default is minified',
				type: 'boolean',
			});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor: Distributor = argv.distributor;

		const interfaces = await distributor.getInterface(argv.id, context.relay);
		if (Boolean(argv.expand)) {
			console.log(JSON.stringify(interfaces, undefined, 2));
		} else {
			console.log(interfaces);
			console.log('to expand interfaces, use get_interfaces --expand');
		}
		process.exit(0);
	},
};
