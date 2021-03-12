import { Context } from '../args';
import { Distributor, getModule } from '../distributor';
import { v4 as uuidv4 } from 'uuid';

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
					const [wasmPath, configPath] = s.split(':');
					return { wasmPath, configPath };
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
		const context: Context = argv.context;
		const distributor = new Distributor(context.nodes, context.ttl, context.seed);

		const node = context.node;
		const blueprintName = argv.name as string;
		const moduleConfigs = argv.modules as Array<{ wasmPath: string; configPath?: string }>;

		// upload modules
		const modules = await Promise.all(moduleConfigs.map((m) => getModule(m.wasmPath, undefined, m.configPath)));
		for (const module of modules) {
			await distributor.uploadModuleToNode(node, module);
		}

		// create blueprints
		const dependencies = modules.map((m) => m.config.name);
		const blueprintId = await distributor.uploadBlueprint(node, {
			name: blueprintName,
			id: uuidv4(),
			dependencies,
		});

		// create service
		const serviceId = await distributor.createService(node, blueprintId);
		console.log(`service id: ${serviceId}`);
		console.log('service created successfully');
		process.exit(0);
	},
};
