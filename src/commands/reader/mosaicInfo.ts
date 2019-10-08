
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
    MosaicHttp,
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
        flag: 'm',
        description: 'Mosaic id or Namespace name',
    })
    mosaic: string;
}

@command({
    description: 'Read mosaic information',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let peerUrl;
        let mosaic;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');

            mosaic = OptionsResolver(options,
                'mosaic',
                () => { return ''; },
                'Enter a mosaicId or mosaic name: (Ex.: evias)');

            if (!mosaic.length) {
                throw new Error("Mosaic id or name is obligatory");
            }
        } catch (err) {
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }

        const namespaceHttp = new NamespaceHttp(this.endpointUrl);
        const mosaicHttp = new MosaicHttp(this.endpointUrl);

        let mosaicId;
        if (mosaic.indexOf('[') === 0) {
            mosaicId = new MosaicId(JSON.parse(mosaic)); 
        }
        else {
            mosaicId = await namespaceHttp.getLinkedMosaicId(new NamespaceId(mosaic)).toPromise();
        }

        let text = '';
        text += chalk.green('Peer:\t') + chalk.bold(this.endpointUrl) + '\n';
        text += chalk.green('mosaicId:\t') + chalk.bold(mosaicId.toHex()) + '\n';
        text += '-'.repeat(20) + '\n\n';

        return await mosaicHttp.getMosaic(mosaicId).subscribe(
            (mosaicInfo) => {

                text += 'JSON: ' + JSON.stringify(mosaicInfo) + '\n\n';
                text += chalk.yellow('MosaicId:       ') + mosaicInfo.id.toHex() + '\n';
                text += chalk.yellow('Supply:         ') + mosaicInfo.supply.compact() + '\n';
                text += chalk.yellow('Height:         ') + mosaicInfo.height.compact() + '\n';
                text += chalk.yellow('Owner:   ') + '\n';
                text += '    ' + chalk.yellow('Public Key: ') + mosaicInfo.owner.publicKey + '\n';
                text += '    ' + chalk.yellow('Address:    ') + mosaicInfo.owner.address.plain() + '\n';
                text += chalk.yellow('Properties:   ') + '\n';
                text += '    ' + chalk.yellow('Divisibility: ') + mosaicInfo.divisibility + '\n';
                text += '    ' + chalk.yellow('Duration: ') + mosaicInfo.duration.compact() + '\n';
                text += '    ' + chalk.yellow('Mutable Supply: ') + (mosaicInfo.isSupplyMutable() ? chalk.green('YES') : chalk.red('NO')) + '\n';
                text += '    ' + chalk.yellow('Transferable: ') + (mosaicInfo.isTransferable() ? chalk.green('YES') : chalk.red('NO')) + '\n';

                console.log(text);
            },
            (err) => {
                console.error(err);
            }
        );

    }

}
