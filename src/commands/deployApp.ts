import { promises as fs } from 'fs';
import Joi from 'joi';
import { Context } from 'src/args';

const serviceSchema = Joi.object({
	name: Joi.string().required(),
	alias: Joi.string().optional(),
	dependencies: Joi.array().items(Joi.string()),
});

const moduleSchema = Joi.object({
	name: Joi.string().required(),
	file: Joi.string(),
	url: Joi.string().uri(),
	config: Joi.object({
		name: Joi.string().optional(),
		mem_pages_count: Joi.number().optional(),
		logger_enabled: Joi.boolean().optional(),
		wasi: Joi.any(),
		mounted_binaries: Joi.object().optional(),
	}),
});

const scriptStorageSchema = Joi.object({
	name: Joi.string().required(),
	file: Joi.string(),
	url: Joi.string().uri(),
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
	const inputRaw = await fs.readFile(input, 'utf-8');
	const inputObj = JSON.parse(inputRaw);
	const res = appConfigSchema.validate(inputObj);
	if (res.error) {
		console.log(res.error);
		return;
	}

	for (let module of inputObj.modules) {
		console.log(module);
	}

	for (let service of inputObj.services) {
		console.log(service);
	}

	for (let script of inputObj.scripts) {
		console.log(script);
	}

	for (let script of inputObj.script_storage) {
		console.log(script);
	}

	console.log(inputObj);
	await fs.writeFile(output, JSON.stringify(inputObj, undefined, 4), 'utf-8');
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
