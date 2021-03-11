import { CliApi } from 'src';

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
		await (argv.api as CliApi).runAir(argv.path as string, argv.data as Map<string, any>);
	},
};
