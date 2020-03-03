
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
import { command, metadata, option } from 'clime';
import * as readlineSync from 'readline-sync';

// internal dependencies
import {
    MigrationCommand,
    MigrationOptions,
} from '../../../migration-command';
import { OptinDataReader, OptinRequest } from '../../../services/OptinDataReader';
import { OptionsResolver } from '../../../options-resolver';
import { Address } from 'symbol-sdk';

export class CommandOptions extends MigrationOptions {
    @option({
        flag: 'o',
        description: 'Opt-In Account Address',
    })
    optinAccount: string;
}

/**
 * Catapult Opt-In Migration Reader
 *
 * @description This migration tool serves the collection of NIS1 opt-in
 *              requests. Collected data includes signed transaction payloads
 *              with multi-signature account modification transactions and
 *              namespace registration transactions.
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
@command({
    description: 'Migration Tool for reading Opt-In Requests',
})
export default class extends MigrationCommand {

    protected isAuthenticatedCommand: boolean = false

    constructor() {
        super();
    }

    @metadata
    async execute(options: MigrationOptions) 
    {
        const params = await this.readParameters(options);
        if (params === false) {
            return ;
        }

        // read opt-in configuration
        let optinAccount: string
        let optinAddress: Address
        try {
            optinAccount = OptionsResolver(options,
                'optinAccount',
                () => { return ''; },
                'Enter the opt-in account address: ');
            optinAddress = Address.createFromRawAddress(optinAccount)
        } 
        catch (err) {
            throw new Error('The Account Private Key input provided is invalid.');
        }

        // read opt-in requests on NIS1

        this.spinner.start();
        const requests: OptinRequest[] = await this.optinReader
                                                   .getOptinRequests(optinAddress.plain());
        this.spinner.stop(true);

        console.log(chalk.green(`Found ${requests.length} opt-in requests.`));

        if (! requests.length) {
            return ;
        }

        const accounts = await this.optinReader.extractAccountsWithSnapshotBalance(requests)
        const namespaces = this.optinReader.collectNamespaceOptinRequests(requests)
        const multisig = this.optinReader.collectMultisigOptinRequests(accounts, requests)

        console.log('')
        console.log(accounts)
        console.log(namespaces)
        console.log(multisig)
    }

}
