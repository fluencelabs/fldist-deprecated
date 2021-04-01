import { promises as fs } from 'fs';
import log from 'loglevel';
import { Distributor } from '../distributor';

export default {
	command: 'run_air',
	describe:
		'Send an air script from a file. Send arguments to "returnService" back to the client to print them in the console. More examples in "scripts_examples" directory.',
	builder: (yargs) => {
		return yargs
			.option('p', {
				alias: 'path',
				demandOption: true,
				describe: 'Path to air script',
				type: 'string',
			})
			.option('d', {
				alias: 'data',
				demandOption: true,
				default: '{}',
				describe: 'Data for air script in json',
				type: 'string',
			})
			.coerce('data', (arg) => {
				const dataJson = JSON.parse(arg);
				return new Map(Object.entries(dataJson));
			});
	},
	handler: async (argv): Promise<void> => {
		const distributor: Distributor = await argv.getDistributor();

		const fileData = await fs.readFile(argv.path);
		const air = fileData.toString('utf-8');

		const callback = (args, tetraplets) => {
			console.log('===================');
			console.log(JSON.stringify(args, undefined, 2));
			console.log(tetraplets);
			console.log('===================');
			return {};
		};

		const [particleId, promise] = await distributor.runAir(air, callback, argv.data);
		log.warn(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`);
		await promise;
		process.exit(0);
	},
};
