
/**
 * 
 * Copyright 2019 Grégory Saive for NEM (github.com/nemtech)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import chalk from 'chalk';
import {command, ExpectedError, metadata, option} from 'clime';
import {
    UInt64,
    Account,
    Address,
    MosaicId,
    MosaicHttp,
    NetworkType,
    NamespaceHttp,
    NamespaceId
} from 'nem2-sdk';

import {from as observableFrom, Observable, merge} from 'rxjs';
import {combineLatest, catchError} from 'rxjs/operators';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'u',
        description: 'Endpoint URL (Ex.: "http://localhost:3000")',
    })
    peerUrl: string;
    @option({
        flag: 'n',
        description: 'Namespace name',
    })
    namespace: string;
}

@command({
    description: 'Read namespace information',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let peerUrl;
        let namespace;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');

            namespace = OptionsResolver(options,
                'namespace',
                () => { return ''; },
                'Enter a namespaceId or namespace name: (Ex.: evias)');

            if (!namespace.length) {
                throw new Error("Namespace name is obligatory");
            }
        } catch (err) {
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }

        const namespaceHttp = new NamespaceHttp(this.endpointUrl);

        let namespaceId;
        if (namespace.indexOf('[') === 0) {
            namespaceId = new NamespaceId(JSON.parse(namespace)); 
        }
        else {
            namespaceId = new NamespaceId(namespace);
        }

        let text = '';
        text += chalk.green('Peer:\t') + chalk.bold(this.endpointUrl) + '\n';
        text += chalk.green('Namespace Id:\t') + chalk.bold(namespaceId.toHex()) + '\n';
        text += '-'.repeat(20) + '\n\n';

        return await namespaceHttp.getNamespace(namespaceId).subscribe(
            (namespaceInfo) => {

                text += 'JSON: ' + JSON.stringify(namespaceInfo) + '\n\n';
                text += chalk.yellow('MetaId:         ') + namespaceInfo.metaId + '\n';
                text += chalk.yellow('Type:           ') + chalk.yellow((namespaceInfo.isRoot() ? "Root" : "Sub")) + '\n';
                text += chalk.yellow('Depth:          ') + namespaceInfo.depth + '\n';
                text += chalk.yellow('Start Height:   ') + namespaceInfo.startHeight.compact() + '\n';
                text += chalk.yellow('End Height:     ') + namespaceInfo.endHeight.compact() + '\n';

                if (namespaceInfo.isSubnamespace()) {
                    text += chalk.yellow('Parent:         ') + namespaceInfo.parentNamespaceId().toHex() + '\n';
                }

                text += chalk.yellow('Levels: ') + '\n';
                namespaceInfo.levels.map((level, i) => {
                    text += chalk.yellow('Level ' + (i+1) + ':      ') + level.toHex() + '\n';
                });

                text += chalk.yellow('Owner:   ') + '\n';
                text += '    ' + chalk.yellow('Public Key: ') + namespaceInfo.owner.publicKey + '\n';
                text += '    ' + chalk.yellow('Address:    ') + namespaceInfo.owner.address.plain() + '\n';

                if (namespaceInfo.alias.type === 0) {
                    text += chalk.yellow('Alias:         ') + chalk.red('None') + '\n';
                }
                else {
                    text += chalk.yellow('Alias:         ') + JSON.stringify(namespaceInfo.alias) + '\n';
                }

                console.log(text);
            },
            (err) => {
                console.error(err);
            }
        );

    }

}
