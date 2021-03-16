import log from 'loglevel';
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
		const distributor: Distributor = argv.distributor;

		const module = await getModule(argv.path, argv.name, argv.configPath);
		log.debug(`uploading module ${module.config.name} to node ${context.relay.peerId} with config:`);
		log.debug(JSON.stringify(module.config, undefined, 2));
		await distributor.uploadModuleToNode(context.relay.peerId, module);
		console.log('module uploaded successfully');
		process.exit(0);
	},
};
