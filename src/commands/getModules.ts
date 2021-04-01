import { Context } from '../types';
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
	handler: async (argv): Promise<void> => {
		const context = argv.context as Context;
		const distributor: Distributor = await argv.getDistributor();
		const modules = await distributor.getModules(context.relay.peerId);

		if (argv.pretty) {
			console.log(JSON.stringify(modules, undefined, 2));
		} else {
			console.log(JSON.stringify(modules));
		}
		process.exit(0);
	},
};
