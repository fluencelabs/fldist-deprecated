import { promises as fs } from 'fs';
import Joi from 'joi';

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
}).or('file', 'url');

const appConfigSchema = Joi.object({
	services: Joi.array().items(serviceSchema).required(),
	modules: Joi.array().items(moduleSchema).required(),
	scripts: Joi.array().items(scriptsSchema).optional(),
	script_storage: Joi.array().items(scriptStorageSchema).optional(),
});

const deployApp = async (args: any): Promise<void> => {
	const input = await fs.readFile(args.input, 'utf-8');
	const inputObj = JSON.parse(input);
	console.log(inputObj);
	await fs.writeFile(args.output, JSON.stringify(inputObj, undefined, 4), 'utf-8');
};

const deployModule = () => {};

const deployService = () => {};

const deployScript = () => {};

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
		await deployApp(argv);
		console.log('Application deployed successfully');
		process.exit(0);
	},
};
