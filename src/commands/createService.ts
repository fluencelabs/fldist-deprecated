export default {
	command: 'create_service',
	describe: 'Create a service from existing blueprint',
	builder: (yargs) => {
		return yargs.option('i', {
			alias: 'id',
			demandOption: true,
			describe: 'blueprint id',
			type: 'string',
		});
	},
	handler: async (argv) => {
		await (argv.api as CliApi).createService(argv.id as string);
		console.log('service created successfully');
		process.exit(0);
	},
};
