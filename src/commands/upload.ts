import { Context } from '../args';
import { Distributor, getModule } from '../distributor';

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
		const context: Context = argv.context;
		const distributor = new Distributor(context.nodes, context.ttl, context.seed);

		const module = await getModule(argv.path, argv.name, argv.configPath);
		await distributor.uploadModuleToNode(context.node, module);
		console.log('module uploaded successfully');
		process.exit(0);
	},
};
