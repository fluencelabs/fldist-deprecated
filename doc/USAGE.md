# fldist

## Install

```sh
$ npm i fldist -g
```

## Usage

```sh
$ fldist --help
```

Help output:

```
Usage: fldist <cmd> [options]

Commands:
  fldist completion      generate completion script
  fldist upload          Upload selected wasm
  fldist get_modules     Print all modules on a node
  fldist get_interfaces  Print all services on a node
  fldist get_interface   Print a service interface
  fldist add_blueprint   Add a blueprint
  fldist create_service  Create a service from existing blueprint
  fldist new_service     Create service from a list of modules
  fldist deploy_app      Deploy application
  fldist create_keypair  Generates a random keypair
  fldist run_air         Send an air script from a file. Send arguments to
                         "returnService" back to the client to print them in the
                         console. More examples in "scripts_examples" directory.
  fldist env             show nodes in currently selected environment

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
```

## Available commands

* [completion](#completion)
* [upload](#upload)
* [get_modules](#get_modules)
* [get_interfaces](#get_interfaces)
* [get_interface](#get_interface)
* [add_blueprint](#add_blueprint)
* [create_service](#create_service)
* [new_service](#new_service)
* [deploy_app](#deploy_app)
* [create_keypair](#create_keypair)
* [run_air](#run_air)
* [env](#env)

### completion

```sh
$ fldist completion --help
```

Help output:

```
###-begin-fldist-completions-###
#
# yargs command completion script
#
# Installation: fldist completion >> ~/.bashrc
#    or fldist completion >> ~/.bash_profile on OSX.
#
_yargs_completions()
{
    local cur_word args type_list

    cur_word="${COMP_WORDS[COMP_CWORD]}"
    args=("${COMP_WORDS[@]}")

    # ask yargs to generate completions.
    type_list=$(fldist --get-yargs-completions "${args[@]}")

    COMPREPLY=( $(compgen -W "${type_list}" -- ${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ ${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o default -F _yargs_completions fldist
###-end-fldist-completions-###

```

### upload

```sh
$ fldist upload --help
```

Help output:

```
fldist upload

Upload selected wasm

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
  -p, --path             Path to wasm file                   [string] [required]
  -c, --config           Path to config in this format:
                         type ConfigArgs = {
                         name: string;
                         mountedBinaries?: any;
                         preopenedFiles?: string[];
                         mappedDirs?: any;
                         };                                             [string]
  -n, --name             A name of a wasm module                        [string]
```

### get_modules

```sh
$ fldist get_modules --help
```

Help output:

```
fldist get_modules

Print all modules on a node

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
      --pretty           whether to pretty json output                 [boolean]
```

### get_interfaces

```sh
$ fldist get_interfaces --help
```

Help output:

```
fldist get_interfaces

Print all services on a node

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
      --expand           expand interfaces. default is minified        [boolean]
```

### get_interface

```sh
$ fldist get_interface --help
```

Help output:

```
fldist get_interface

Print a service interface

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
  -i, --id               Service id                          [string] [required]
      --expand           expand interfaces. default is minified        [boolean]
```

### add_blueprint

```sh
$ fldist add_blueprint --help
```

Help output:

```
fldist add_blueprint

Add a blueprint

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
  -d, --deps             Dependencies                         [array] [required]
  -n, --name             a name of a blueprint               [string] [required]
```

### create_service

```sh
$ fldist create_service --help
```

Help output:

```
fldist create_service

Create a service from existing blueprint

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
  -i, --id               blueprint id                        [string] [required]
```

### new_service

```sh
$ fldist new_service --help
```

Help output:

```
fldist new_service

Create service from a list of modules

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
      --ms, --modules    array of path:config pairs; meaning <path to wasm
                         module>:<path to config>             [array] [required]
  -n, --name             name of the service; will be set in the blueprint
                                                             [string] [required]
```

### deploy_app

```sh
$ fldist deploy_app --help
```

Help output:

```
fldist deploy_app

Deploy application

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
  -i, --input            path to deployment config file      [string] [required]
  -o, --output           path to the file where application config should be
                         written                             [string] [required]
```

### create_keypair

```sh
$ fldist create_keypair --help
```

Help output:

```
fldist create_keypair

Generates a random keypair

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
```

### run_air

```sh
$ fldist run_air --help
```

Help output:

```
fldist run_air

Send an air script from a file. Send arguments to "returnService" back to the
client to print them in the console. More examples in "scripts_examples"
directory.

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
  -p, --path             Path to air script                  [string] [required]
  -d, --data             Data for air script in json
                                             [string] [required] [default: "{}"]
```

### env

```sh
$ fldist env --help
```

Help output:

```
fldist env

show nodes in currently selected environment

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -s, --seed             Client seed                                    [string]
      --env              Environment to use
            [required] [choices: "dev", "testnet", "local"] [default: "testnet"]
      --node-id, --node  PeerId of the node to use
      --node-addr        Multiaddr of the node to use
      --log              log level
       [required] [choices: "trace", "debug", "info", "warn", "error"] [default:
                                                                        "error"]
      --ttl              particle time to live in ms
                                            [number] [required] [default: 60000]
      --json             if specified, output environment as JSON
                                                      [boolean] [default: false]
```

## License

MIT.