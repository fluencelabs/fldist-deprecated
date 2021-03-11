export default {
	command: 'get_interface',
	describe: 'Print a service interface',
	builder: (yargs) => {
		return yargs
			.option('i', {
				alias: 'id',
				demandOption: true,
				describe: 'Service id',
				type: 'string',
			})
			.option('expand', {
				demandOption: false,
				describe: 'expand interfaces. default is minified',
				type: 'boolean',
			});
	},
	handler: async (argv) => {
		await (argv.api as CliApi).getInterface(argv.id as string, argv.expand as boolean);
		process.exit(0);
	},
};
