import yargs from "yargs";
import {
    addBlueprint,
    createService,
    runAir,
    distribute,
    uploadModule,
    getModules,
    getInterfaces,
    newService
} from "./index";
import {generatePeerId, peerIdToSeed} from "@fluencelabs/fluence";

const {hideBin} = require('yargs/helpers')

export function args() {
    return yargs(hideBin(process.argv))
        .usage('Usage: $0 <cmd> [options]') // usage string of application.
        .option('s', {
            alias: 'seed',
            demandOption: false,
            describe: 'Client seed',
            type: 'string'
        })
        .command({
            command: 'distribute',
            describe: 'Create services according to the distribution specified in the code',
            handler: async (argv) => {
                await distribute(argv.seed as string);
                process.exit(0);
            }
        })
        .command({
            command: 'upload',
            describe: 'Upload selected wasm',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'path',
                        demandOption: true,
                        describe: 'Path to wasm file',
                        type: 'string'
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
                        type: 'string'
                    })
                    .option('n', {
                        alias: 'name',
                        demandOption: false,
                        describe: 'A name of a wasm module',
                        type: 'string'
                    })
                    .conflicts('config', 'name')
            },
            handler: async (argv) => {
                await uploadModule(argv.path as string, argv.name as string, argv.config as string, argv.seed as string)
                console.log("module uploaded successfully")
                process.exit(0);
            }
        })
        .command({
            command: 'get_modules',
            describe: 'Print all modules on a node',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'peer',
                        demandOption: false,
                        describe: 'nodes peer id',
                        type: 'string'
                    })
                    .option('pretty', {
                        demandOption: false,
                        describe: 'whether to pretty json output',
                        type: 'boolean'
                    })
            },
            handler: async (argv) => {
                let modules = await getModules(argv.peerId as string, argv.seed as string);
                if (argv.pretty) {
                    console.log(JSON.stringify(modules, undefined, 2))
                } else {
                    console.log(JSON.stringify(modules))
                }
                process.exit(0);
            }
        })
        .command({
            command: 'get_interfaces',
            describe: 'Print all services on a node',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'peer',
                        demandOption: false,
                        describe: 'nodes peer id',
                        type: 'string'
                    })
                    .option('expand', {
                        demandOption: false,
                        describe: 'expand interfaces. default is minified',
                        type: 'boolean'
                    })
            },
            handler: async (argv) => {
                await getInterfaces(argv.peerId as string, argv.seed as string, argv.expand as boolean);
                process.exit(0);
            }
        })
        .command({
                command: 'add_blueprint',
                describe: 'Add a blueprint',
                builder: (yargs) => {
                    return yargs
                        .option('d', {
                            alias: 'deps',
                            demandOption: true,
                            describe: 'Dependencies',
                            type: 'array'
                        })
                        .option('n', {
                            alias: 'name',
                            demandOption: true,
                            describe: 'a name of a blueprint',
                            type: 'string'
                        })
                        .option('i', {
                            alias: 'id',
                            demandOption: false,
                            describe: 'an id of a blueprint',
                            type: 'string'
                        })
                },
                handler: async (argv) => {
                    let id = await addBlueprint(argv.name as string, argv.id as string, argv.deps as string[], argv.seed as string)
                    console.log(`blueprint '${id}' added successfully`)
                    process.exit(0);
                }
            }
        )
        .command({
            command: 'create_service',
            describe: 'Create a service from existing blueprint',
            builder: (yargs) => {
                return yargs
                    .option('i', {
                        alias: 'id',
                        demandOption: true,
                        describe: 'blueprint id',
                        type: 'string'
                    })

            },
            handler: async (argv) => {
                await createService(argv.id as string, argv.seed as string);
                console.log("service created successfully");
                process.exit(0);

            }
        })
        .command({
            command: 'new_service',
            describe: 'Create service from a list of modules',
            builder: (yargs) => {
                return yargs
                    .option('ms', {
                        alias: 'modules',
                        demandOption: true,
                        describe: 'array of path:config pairs; meaning <path to wasm module>:<path to config>',
                        type: 'array'
                    })
                    .coerce('modules', (arg: string[]) => {
                        return arg.map(s => {
                            const [wasm_path, config_path] = s.split(':');
                            return { wasm_path, config_path };
                        });
                    })
                    .option('n', {
                        alias: 'name',
                        demandOption: true,
                        describe: 'name of the service; will be set in the blueprint',
                        type: 'string'
                    })
            },
            handler: async (argv) => {
                await newService(argv.name as string, argv.modules as any[], argv.seed as string);
                console.log("service created successfully");
                process.exit(0);
            }
        })
        .command({
            command: 'create_keypair',
            describe: 'Generates a random keypair',
            builder: (yargs) => {
                return yargs
            },
            handler: async (argv) => {
                let peerId = await generatePeerId();
                console.log({
                    ...peerId.toJSON(),
                    seed: peerIdToSeed(peerId),
                })
                process.exit(0);
            }
        })
        .command({
            command: 'run_air',
            describe: 'Send an air script from a file. Send arguments to "returnService" back to the client to print them in the console. More examples in "scripts_examples" directory.',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'path',
                        demandOption: true,
                        describe: 'Path to air script',
                        type: 'string'
                    })
                    .option('d', {
                        alias: 'data',
                        demandOption: true,
                        describe: 'Data for air script in json',
                        type: 'string'
                    })
                    .coerce("data", function (arg) {
                        const dataJson = JSON.parse(arg);
                        return new Map(Object.entries(dataJson));
                    })
            },
            handler: async (argv) => {
                await runAir(argv.path as string, argv.data as Map<string, any>, argv.seed as string);
            }
        })
        .parse();
}
