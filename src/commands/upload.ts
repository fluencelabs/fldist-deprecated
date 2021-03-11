export default {
	command: 'upload',
	describe: 'Upload selected wasm',
	builder: (yargs) => {
		return yargs
			.option('p', {
				alias: 'path',
				demandOption: true,
				describe: 'Path to wasm file',
				type: 'string',
			})
			.option('c', {
				alias: 'config',
				demandOption: false,
				describe: `Path to config in this format:
type ConfigArgs = {
\tname: string;
\tmountedBinaries?: any;
\tpreopenedFiles?: string[];
\tmappedDirs?: any;
};`,
				type: 'string',
			})
			.option('n', {
				alias: 'name',
				demandOption: false,
				describe: 'A name of a wasm module',
				type: 'string',
			})
			.conflicts('config', 'name');
	},
	handler: async (argv) => {
		await (argv.api as CliApi).uploadModule(argv.path as string, argv.name as string, argv.config as string);
		console.log('module uploaded successfully');
		process.exit(0);
	},
};
