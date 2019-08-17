
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
 * Migration Tool for Mosaics
 *
 * @description This migration tool serves the migration of NIS1 Mosaics
 *              definitions to Catapult. It will query the registered/owned
 *              mosaics of your account and provide with a Transaction
 *              Payload that will define the Mosaic on Catapult network(s).
 *
 * @author Grégory Saive <greg@nem.foundation>
 * @license Apache-2.0
 */
@command({
    description: 'Migration Tool for Mosaics',
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

        // STEP 2: Read mosaic definitions owned by account on NIS1
        //XXX mosaic definition list may have more than 1 page
        const endpoint = NIS_SDK.model.objects.create('endpoint')(this.nisUrl.replace(/:[0-9]+/, ''), 7890);
        const mosaics = await NIS_SDK.com.requests.account.mosaics.definitions(endpoint, nisAddress);

        console.log('List of Mosaics Owned');
        console.log('---------------------');
        console.log('');

        mosaics.data.map(async (mosaic) => {
            const fqmn = mosaic.id.namespaceId + ':' + mosaic.id.name;

            console.log('Name:   ' + chalk.green(mosaic.id.namespaceId) + ':' + chalk.green(mosaic.id.name));

            if (mosaic.description.length) {
                console.log('Description: ');
                console.log('\t' + chalk.green(mosaic.description));
            }

            const isTransferable = mosaic.properties[3].value === 'true';
            const isMutableSupply = mosaic.properties[2].value === 'true';
            const initialSupply = parseInt(mosaic.properties[1].value);
            //XXX totalSupply

            console.log('');
            console.log('Divisibility:   ' + chalk.green(mosaic.properties[0].value));
            console.log('Transferable: ' + (isTransferable ? chalk.green('YES') : chalk.red('NO')));
            console.log('Mutable Supply: ' + (isMutableSupply ? chalk.green('YES') : chalk.red('NO')));
            console.log('Initial Supply: ' + chalk.green('' +   initialSupply));
            console.log('---------------------------');
            console.log('');
        });

        //XXX
    }

}
