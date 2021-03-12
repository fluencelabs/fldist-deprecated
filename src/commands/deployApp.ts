import { promises as fs } from 'fs';
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

	const inputRaw = await fs.readFile(input, 'utf-8');
	const inputObj = JSON.parse(inputRaw);
	const res = appConfigSchema.validate(inputObj);
	if (res.error) {
		console.log(res.error);
		return;
	}

	for (let module of res.value.modules) {
		console.log(module);
		const base64 = await loadModule(module.file);
		const config = createConfig({
			name: module.name,
			mountedBinaries: module.config.mounted_binaries,
			preopenedFiles: module.config.preopened_files,
			mappedDirs: module.config.mapped_dirs,
		});
		await distributor.uploadModuleToNode(context.node, {
			base64: base64,
			config: config,
		});
	}

	for (let service of res.value.services) {
		console.log(service);
		const bpId = await distributor.uploadBlueprint(context.node, {
			name: service.name,
			dependencies: service.dependencies,
		});

		const serviceId = await distributor.createService(context.node, bpId);

		if (service.alias) {
			await distributor.createAlias(context.node, serviceId, service.alias);
		}
	}

	for (let script of res.value.scripts) {
		const text = fs.readFile(script.file, 'utf-8');
		console.log(text);
		// await distributor.runAir()
	}

	for (let script of res.value.script_storage) {
		const text = await fs.readFile(script.file, 'utf-8');
		console.log(text);

		await distributor.addScript(context.node, text, script.interval);
	}

	console.log(res.value);
	await fs.writeFile(output, JSON.stringify(res.value, undefined, 4), 'utf-8');
	console.log('Application deployed successfully');
};

// const deployModule = () => {};

// const deployService = () => {};

// const deployScript = () => {};

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
