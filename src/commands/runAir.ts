import { promises as fs } from 'fs';
import log from 'loglevel';
import { Context } from '../args';
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
			.coerce('data', function (arg) {
				const dataJson = JSON.parse(arg);
				return new Map(Object.entries(dataJson));
			});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor: Distributor = await argv.getDistributor();

		const fileData = await fs.readFile(argv.path);
		const air = fileData.toString('utf-8');

		const callback = (args, tetraplets) => {
			if (argv.tetraplets === true) {
				let result = {
					result: args,
					tetraplets: tetraplets
				};
				console.log(JSON.stringify(result, undefined, 2));
			} else {
				console.log(JSON.stringify(args, undefined, 2));
			}
			return {};
		};

		const [particleId, promise] = await distributor.runAir(air, callback, argv.data);
		log.warn(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`);
		await promise;
		if (argv.wait === false) {
			process.exit(0);
		}
	},
};
