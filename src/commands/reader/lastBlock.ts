
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
    NetworkType,
    BlockchainHttp,
    BlockchainScore
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    uint64 as uint64_t,
} from "nem2-library";

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
}

@command({
    description: 'Read latest block',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let peerUrl;
        try {
            peerUrl = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000)');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        if (peerUrl.length) {
            this.endpointUrl = peerUrl;
        }

        const blockchainHttp = new BlockchainHttp(this.endpointUrl);

        let text = '';
        text += chalk.green('Peer:\t') + chalk.bold(this.endpointUrl) + '\n';
        text += '-'.repeat(20) + '\n\n';

        const observer = observableFrom(blockchainHttp.getBlockchainHeight()).pipe(
            combineLatest(observableFrom(blockchainHttp.getBlockchainScore())),
            catchError(err => observableFrom('Blockchain Height Error: ' + err.toString())),
        );

        let counter = 1;
        observer.subscribe((apiResponses) => {
            const height = apiResponses[0] as UInt64;
            const score  = apiResponses[1] as BlockchainScore;

            text += 'Height:\t' + chalk.bold('' + height.compact()) + '\n';
            text += 'Score:\t' + chalk.bold(JSON.stringify({
                lower: score.scoreLow.compact(),
                higher: score.scoreHigh.compact()
            })) + '\n';

            console.log(text);
        });

    }

}
