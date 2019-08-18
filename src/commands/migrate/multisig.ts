
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
import * as readlineSync from 'readline-sync';

// internal dependencies
import {
    MigrationCommand,
    MigrationOptions,
} from '../../migration-command';
import { TransactionSigner } from '../../services/TransactionSigner';
import { TransactionFactory } from '../../services/TransactionFactory';
import { PayloadPrinter } from '../../services/PayloadPrinter';

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
        const params = await this.readParameters(options);

        // read mosaic definitions owned by account on NIS1
        this.spinner.start();
        const multisigInfo = await this.nisReader.getMultisigInfo(this.nisAddress);
        this.spinner.stop(true);

        if (multisigInfo === false) {
            console.log(chalk.red('This account is not a multi-signature account. Aborting.'));
            console.log('');
            return ;
        }

        console.log(chalk.green(
            `This account is a ${multisigInfo.minCosignatories}-of-${multisigInfo.cosignatoriesCount} multi-signature account.`));

        // create Catapult transactions
        const factory = new TransactionFactory(this.catapultReader);
        const transactions = factory.getMultisigTransactions(multisigInfo.cosignatories);

        // initialize transaction signer
        const signer = new TransactionSigner(
            this.catapultReader,
            this.catapultAccount,
            transactions,
        );

        // whether to aggregate transactions or not
        console.log('');
        const doAggregate = readlineSync.keyInYN(
            'Do you want to merge ' + transactions.length + ' transactions into 1 aggregate transaction? ');
        console.log('');

        // sign transactions
        const uris = signer.getSignedTransactions(doAggregate);
        this.printer = new PayloadPrinter(uris);
        this.printer.toConsole();
    }

}
