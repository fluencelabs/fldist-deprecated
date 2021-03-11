import { generatePeerId, peerIdToSeed } from '@fluencelabs/fluence';

export default {
	command: 'create_keypair',
	describe: 'Generates a random keypair',
	builder: (yargs) => {
		return yargs;
	},
	handler: async (_) => {
		let peerId = await generatePeerId();
		console.log({
			...peerId.toJSON(),
			seed: peerIdToSeed(peerId),
		});
		process.exit(0);
	},
};
