export default {
	command: 'new_service',
	describe: 'Create service from a list of modules',
	builder: (yargs) => {
		return yargs
			.option('ms', {
				alias: 'modules',
				demandOption: true,
				describe: 'array of path:config pairs; meaning <path to wasm module>:<path to config>',
				type: 'array',
			})
			.coerce('modules', (arg: string[]) => {
				return arg.map((s) => {
					const [wasm_path, config_path] = s.split(':');
					return { wasm_path, config_path };
				});
			})
			.option('n', {
				alias: 'name',
				demandOption: true,
				describe: 'name of the service; will be set in the blueprint',
				type: 'string',
			});
	},
	handler: async (argv) => {
		await (argv.api as CliApi).newService(argv.name as string, argv.modules as any[]);
		console.log('service created successfully');
		process.exit(0);
	},
};
