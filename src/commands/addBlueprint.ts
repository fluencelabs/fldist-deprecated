import { Context } from '../types';
import { Distributor } from '../distributor';

export default {
	command: 'add_blueprint',
	describe: 'Add a blueprint',
	builder: (yargs) => {
		return yargs
			.option('d', {
				alias: 'deps',
				demandOption: true,
				describe: 'Dependencies',
				type: 'array',
			})
			.option('n', {
				alias: 'name',
				demandOption: true,
				describe: 'a name of a blueprint',
				type: 'string',
			});
	},
	handler: async (argv): Promise<void> => {
		const context = argv.context as Context;
		const distributor: Distributor = await argv.getDistributor();
		const id = await distributor.uploadBlueprint(context.relay.peerId, {
			name: argv.name,
			dependencies: argv.deps,
		});
		console.log(`blueprint '${id}' added successfully`);
		process.exit(0);
	},
};
