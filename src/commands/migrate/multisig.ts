
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
import { command, metadata } from 'clime';
import {
    MigrationCommand,
    MigrationOptions,
    NIS_SDK,
} from '../../migration-command';

/**
 * Migration Tool for Multi-Signature Recovery
 *
 * @description This migration tool serves the migration of NIS1 Multi-Signature
 *              accounts to Catapult. It will query the configuration of your
 *              multi-signature account and provide with a Transaction Payload
 *              that will re-create the configuration on Catapult network(s).
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
@command({
    description: 'Migration Tool for Multi-Signature Accounts',
})
export default class extends MigrationCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: MigrationOptions) 
    {
        const params = this.readParameters(options);

        // STEP 1: Create addresses from keypair
        const catapultAddress = this.catapultAccount.address.plain();
        const nisAddress = NIS_SDK.model.address.toAddress(this.nisAccount.publicKey.toString(), this.nisNetworkId);

        console.log('');
        console.log('Catapult Address: ' + chalk.green(catapultAddress));
        console.log('NIS1 Address:     ' + chalk.green(nisAddress));
        console.log('');

        // STEP 2: Read account information on NIS1
        const endpoint = NIS_SDK.model.objects.create('endpoint')(this.nisUrl.replace(/:[0-9]+/, ''), 7890);
        const accountInfo = await NIS_SDK.com.requests.account.data(endpoint, nisAddress);
        const multisigInfo = accountInfo.account.multisigInfo;
        const cosignatories = accountInfo.meta.cosignatories;

        if (! multisigInfo.hasOwnProperty('cosignatoriesCount')) {
            console.log(chalk.red('This account is not a multi-signature account. Aborting.'));
            console.log('');
            return ;
        }

        console.log('Multi-Signature Account Details');
        console.log('');

        console.log('Co-Signatories Count:    ' + chalk.green(multisigInfo.cosignatoriesCount));
        console.log('Co-Signatories Required: ' + chalk.green(multisigInfo.minCosignatories));
        console.log('Definition: ' + chalk.green(multisigInfo.minCosignatories + ' of ' + multisigInfo.cosignatoriesCount));
        console.log('');

        console.log('List of Co-Signatories');
        console.log('');

        cosignatories.map((cosigner, i) => {
            console.log((i+1) + ': ' + chalk.green(cosigner.address));
        });
        console.log('');

        //XXX
    }

}
