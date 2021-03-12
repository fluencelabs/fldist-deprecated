import { Context } from 'src/args';
import { Distributor } from 'src/distributor';

export default {
	command: 'add_blueprint',
	describe: 'Add a blueprint',
	builder: (yargs) => {
		return yargs
			.option('d', {
				alias: 'deps',
				demandOption: true,
				describe: 'Dependencies',
				type: 'array',
			})
			.option('n', {
				alias: 'name',
				demandOption: true,
				describe: 'a name of a blueprint',
				type: 'string',
			});
	},
	handler: async (argv) => {
		const context: Context = argv.context;
		const distributor = new Distributor(context.nodes, context.ttl, context.seed);
		let id = await distributor.uploadBlueprint(context.node, {
			name: argv.name,
			dependencies: argv.deps,
		});
		console.log(`blueprint '${id}' added successfully`);
		process.exit(0);
	},
};
