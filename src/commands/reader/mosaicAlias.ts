
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
    MosaicId,
    NamespaceHttp,
    NamespaceId
} from 'nem2-sdk';

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
        description: 'Namespace Name',
    })
    namespaceName: string;
}

@command({
    description: 'Read mosaic alias',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let peerUrl;
        let namespaceName;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');

            namespaceName = OptionsResolver(options,
                'namespaceName',
                () => { return ''; },
                'Enter a namespaceName: (Ex.: evias)');

            if (!namespaceName.length) {
                throw new Error("Namespace name is obligatory");
            }
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }
        await this.setupConfig();

        const namespaceHttp = new NamespaceHttp(this.endpointUrl);

        let text = '';
        text += chalk.green('Peer:\t') + chalk.bold(this.endpointUrl) + '\n';
        text += '-'.repeat(20) + '\n\n';

        const namespaceId = new NamespaceId(namespaceName);
        const observer = namespaceHttp.getLinkedMosaicId(namespaceId).subscribe((apiResponses) => {

            let mosaicId = apiResponses as MosaicId;

            text += 'Namespace:\t' + chalk.bold(namespaceId.fullName)+ '\n';
            text += 'NamespaceId:\t' + chalk.bold(namespaceId.toHex())+ '\n';
            text += 'MosaicId:\t'  + chalk.bold(mosaicId.id.toHex()) + ' [' + mosaicId.id.lower + ', ' + mosaicId.id.higher + ']' + '\n';

            console.log(text);
        }, 
        err => console.log("API Message: ", err));

    }

}
