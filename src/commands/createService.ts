import { Context } from '../types';
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
	handler: async (argv): Promise<void> => {
		const context = argv.context as Context;
		const distributor: Distributor = await argv.getDistributor();
		const serviceId = await distributor.createService(context.relay.peerId, argv.id);
		console.log(`service id: ${serviceId}`);
		console.log('service created successfully');
		process.exit(0);
	},
};
