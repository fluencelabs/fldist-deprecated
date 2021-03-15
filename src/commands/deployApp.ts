import { promises as fs } from 'fs';
import path from 'path';
import Joi from 'joi';
import { createConfig, Distributor, loadModule, Module } from '../distributor';
import { Context } from '../args';

const serviceSchema = Joi.object({
	name: Joi.string().required(),
	alias: Joi.string().optional(),
	dependencies: Joi.array().items(Joi.string()).default([]),
});

const moduleSchema = Joi.object({
	name: Joi.string().required(),
	file: Joi.string(),
	url: Joi.string().uri(),
	config: Joi.object({
		mapped_dirs: Joi.array().items(Joi.string()).optional(),
		mounted_binaries: Joi.object().optional(),
		preopened_files: Joi.object().optional(),
	}),
});

const scriptStorageSchema = Joi.object({
	name: Joi.string().required(),
	file: Joi.string(),
	url: Joi.string().uri(),
	interval: Joi.number().min(3).optional().default(3),
}).or('file', 'url');

const scriptsSchema = Joi.object({
	name: Joi.string().required(),
	file: Joi.string(),
	url: Joi.string().uri(),
	variables: Joi.object().optional(),
}).or('file', 'url');

const appConfigSchema = Joi.object({
	services: Joi.array().items(serviceSchema).required(),
	modules: Joi.array().items(moduleSchema).required(),
	scripts: Joi.array().items(scriptsSchema).optional(),
	script_storage: Joi.array().items(scriptStorageSchema).optional(),
});

const deployApp = async (context: Context, input: string, output: string): Promise<void> => {
	const distributor = new Distributor(context.nodes, context.ttl, context.seed);

	const root = path.dirname(input);

	const inputRaw = await fs.readFile(input, 'utf-8');
	const inputObj = JSON.parse(inputRaw);
	const res = appConfigSchema.validate(inputObj);
	if (res.error) {
		console.log(res.error);
		return;
	}

	for (let module of res.value.modules) {
		console.log('Creating module: ', module.name);
		const base64 = await loadModule(path.join(root, module.file));
		const config = createConfig({
			name: module.name,
			mountedBinaries: module.config.mounted_binaries,
			preopenedFiles: module.config.preopened_files,
			mappedDirs: module.config.mapped_dirs,
		});

		const id = await distributor.uploadModuleToNode(context.node, {
			base64: base64,
			config: config,
		});
		module.id = id;
	}

	for (let service of res.value.services) {
		console.log('Creating blueprint for service: ', service.name);
		const bpId = await distributor.uploadBlueprint(context.node, {
			name: service.name,
			dependencies: service.dependencies,
		});
		service.blueprint_id = bpId;

		console.log('Creating service: ', service.name);
		const serviceId = await distributor.createService(context.node, bpId);
		service.id = serviceId;

		if (service.alias) {
			console.log('Setting alias: ', service.alias);
			await distributor.createAlias(context.node, serviceId, service.alias);
		}
	}

	for (let script of res.value.scripts) {
		console.log('Running script: ', script.name);
		const scriptText = await fs.readFile(path.join(root, script.file), 'utf-8');
		const vars = new Map();
		for (let k in script.variables) {
			if (script.variables[k] === '$relay') {
				vars.set(k, context.node.peerId);
				continue;
			}

			if (script.variables[k] === '$node') {
				vars.set(k, context.node.peerId);
				continue;
			}

			vars.set(k, script.variables[k]);
		}

		const [particle, promise] = await distributor.runAir(context.node, scriptText, () => {}, vars);
		await promise;
	}

	for (let script of res.value.script_storage) {
		const text = await fs.readFile(path.join(root, script.file), 'utf-8');
		const id = await distributor.addScript(context.node, text, script.interval);
		script.id = id;
	}

	await fs.writeFile(output, JSON.stringify(res.value, undefined, 4), 'utf-8');
	console.log('Application deployed successfully');
};

export default {
	command: 'deploy_app',
	describe: 'Deploy application',
	builder: (yargs: any) => {
		return yargs
			.option('i', {
				alias: 'input',
				demandOption: true,
				describe: 'path to deployment config file',
				type: 'string',
			})
			.option('o', {
				alias: 'output',
				demandOption: true,
				describe: 'path to the file where application config should be written',
				type: 'string',
			});
	},
	handler: async (argv: any) => {
		const input: string = argv.i;
		const output: string = argv.o;
		await deployApp(argv.context, input, output);
		process.exit(0);
	},
};
