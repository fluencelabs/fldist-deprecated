import { KeyPair } from '@fluencelabs/fluence';
import * as base64 from 'base64-js';

export default {
	command: 'create_keypair',
	describe: 'Generates a random keypair',
	builder: (yargs) => {
		return yargs;
	},
	handler: async (_): Promise<void> => {
		const keypair = await KeyPair.randomEd25519();
		console.log({
			peerId: keypair.Libp2pPeerId.toB58String(),
			secretKey: base64.fromByteArray(keypair.toEd25519PrivateKey()),
			publicKey: base64.fromByteArray(keypair.Libp2pPeerId.pubKey.bytes),
		});
		process.exit(0);
	},
};
