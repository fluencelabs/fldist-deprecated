export default {
	command: 'add_blueprint',
	describe: 'Add a blueprint',
	builder: (yargs) => {
		return yargs
			.option('d', {
				alias: 'deps',
				demandOption: true,
				describe: 'Dependencies',
				type: 'array',
			})
			.option('n', {
				alias: 'name',
				demandOption: true,
				describe: 'a name of a blueprint',
				type: 'string',
			});
	},
	handler: async (argv) => {
		let id = await (argv.api as CliApi).addBlueprint(argv.name as string, argv.deps as string[]);
		console.log(`blueprint '${id}' added successfully`);
		process.exit(0);
	},
};
