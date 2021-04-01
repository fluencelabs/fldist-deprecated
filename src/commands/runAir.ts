import { promises as fs } from 'fs';
import { Distributor } from '../distributor';

export default {
	command: 'run_air',
	describe:
		'Send an air script from a file. Send arguments to "returnService" back to the client to print them in the console. More examples in "scripts_examples" directory.',
	builder: (yargs) => {
		return yargs
			.option('e', {
				alias: 'expand',
				demandOption: false,
				describe: 'Show expanded information from network interaction such as particle tetraplets',
				type: 'boolean',
				default: false,
			})
			.option('m', {
				alias: 'multiple-results',
				demandOption: false,
				describe: 'Continiously await for multiple results instead of returning a single one',
				type: 'boolean',
				default: false,
			})
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
			const strResult = JSON.stringify(args, undefined, 2);
			if (argv.e) {
				console.log('===================');
				console.log(strResult);
				console.log('===================');
				console.log(tetraplets);
				console.log('===================');
			} else {
				console.log(strResult);
			}
			return {};
		};

		const [particleId, promise] = await distributor.runAir(air, callback, argv.data, argv.m);
		if (argv.e) {
			console.log(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`);
		}
		await promise;
		process.exit(0);
	},
};
