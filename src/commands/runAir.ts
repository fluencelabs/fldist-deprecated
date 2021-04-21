import { promises as fs } from 'fs';
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
			.option('w', {
				alias: 'wait',
				demandOption: false,
				default: false,
				type: 'boolean',
				describe: 'Do not exit after the first particle',
			})
			.option('t', {
				alias: 'tetraplets',
				demandOption: false,
				default: false,
				type: 'boolean',
				describe: 'If passed, print tetraplets',
			})
			.coerce('data', (arg) => {
				return JSON.parse(arg);
			});
	},
	handler: async (argv): Promise<void> => {
		const distributor: Distributor = await argv.getDistributor();

		const fileData = await fs.readFile(argv.path);
		const air = fileData.toString('utf-8');

		const callback = (args, tetraplets) => {
			const strResult = JSON.stringify(args, undefined, 2);
			if (argv.tetraplets) {
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

		const fn = argv.aqua ? distributor.runAirAqua : distributor.runAir;
		const [particleId, particleTimeout] = await fn(air, callback, argv.data, argv.wait);
		if (argv.wait && argv.verbose) {
			console.log(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`);
		}
		// Wait for timeout and exit
		await particleTimeout;
		if (argv.verbose) {
			console.warn('Particle timed out, exiting');
		}
		process.exit(0);
	},
};
