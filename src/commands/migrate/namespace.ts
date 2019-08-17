
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
 * Migration Tool for Namespaces
 *
 * @description This migration tool serves the migration of NIS1 Namespaces
 *              ownerships to Catapult. It will query the registered/owned
 *              namespaces of your account and provide with a Transaction
 *              Payload that will register the namespace on Catapult network(s).
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
@command({
    description: 'Migration Tool for Namespaces',
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

        // STEP 2: Read namespaces owned by account on NIS1
        //XXX namespaces list may have more than 1 page
        const endpoint = NIS_SDK.model.objects.create('endpoint')(this.nisUrl.replace(/:[0-9]+/, ''), 7890);
        const namespaces = await NIS_SDK.com.requests.account.namespaces.owned(endpoint, nisAddress);

        console.log('List of Namespaces Owned');
        console.log('');

        namespaces.data.map((namespace) => {
            console.log('Name:   ' + chalk.green(namespace.fqn));
            console.log('Height: ' + chalk.green(namespace.height));
            console.log('');
        });

        //XXX
    }

}
