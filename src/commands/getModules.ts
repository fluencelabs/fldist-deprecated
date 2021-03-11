export default {
	command: 'get_modules',
	describe: 'Print all modules on a node',
	builder: (yargs) => {
		return yargs.option('pretty', {
			demandOption: false,
			describe: 'whether to pretty json output',
			type: 'boolean',
		});
	},
	handler: async (argv) => {
		let modules = await (argv.api as CliApi).getModules();
		if (argv.pretty) {
			console.log(JSON.stringify(modules, undefined, 2));
		} else {
			console.log(JSON.stringify(modules));
		}
		process.exit(0);
	},
};
