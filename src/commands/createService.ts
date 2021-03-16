import { Context } from '../args';
import { Distributor } from '../distributor';

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
		const distributor: Distributor = argv.distributor;
		const serviceId = await distributor.createService(context.relay.peerId, argv.id);
		console.log(`service id: ${serviceId}`);
		console.log('service created successfully');
		process.exit(0);
	},
};
