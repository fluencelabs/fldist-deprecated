export default {
	command: 'get_interfaces',
	describe: 'Print all services on a node',
	builder: (yargs) => {
		return yargs.option('expand', {
			demandOption: false,
			describe: 'expand interfaces. default is minified',
			type: 'boolean',
		});
	},
	handler: async (argv) => {
		await (argv.api as CliApi).getInterfaces(argv.expand as boolean);
		process.exit(0);
	},
};
