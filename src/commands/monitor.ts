import { Distributor } from '../distributor';

export default {
	command: 'monitor',
	describe: '',
	handler: async (argv): Promise<void> => {
		// we always want to dislpay peer id and relay of the current fldist instance
		argv.context.verbose = true;
		const distributor: Distributor = await argv.getDistributor();
		console.log('Waiting for external particles. Press ctr+c to exit');
		// distributor.monitor();
	},
};
