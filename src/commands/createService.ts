import { Context } from 'src/args';
import { Distributor } from 'src/distributor';

export default {
	command: 'create_service',
	describe: 'Create a service from existing blueprint',
	builder: (yargs) => {
		return yargs.option('i', {
			alias: 'id',
			demandOption: true,
			describe: 'blueprint id',
			type: 'string',
		});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor = new Distributor(context.nodes, context.ttl, context.seed);
		const serviceId = await distributor.createService(context.node, argv.id);
		console.log(`service id: ${serviceId}`);
		console.log('service created successfully');
		process.exit(0);
	},
};
