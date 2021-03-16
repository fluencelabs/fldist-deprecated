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
				describe: 'Data for air script in json',
				type: 'string',
			})
			.coerce('data', function (arg) {
				const dataJson = JSON.parse(arg);
				return new Map(Object.entries(dataJson));
			});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor: Distributor = argv.distributor;

		const fileData = await fs.readFile(argv.path);
		const air = fileData.toString('utf-8');

		const callback = (args, tetraplets) => {
			console.log('===================');
			console.log(JSON.stringify(args, undefined, 2));
			console.log(tetraplets);
			console.log('===================');
			return {};
		};

		const [particleId, _promise] = await distributor.runAir(air, callback, argv.data);
		log.warn(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`);
	},
};
