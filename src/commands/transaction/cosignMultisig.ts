
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
    NetworkType,
    MosaicId,
    MosaicService,
    AccountHttp,
    MosaicHttp,
    NamespaceId,
    NamespaceHttp,
    MosaicView,
    MosaicInfo,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    LockFundsTransaction,
    NetworkCurrencyMosaic,
    PublicAccount,
    TransactionType,
    Listener,
    EmptyMessage,
    ModifyMultisigAccountTransaction,
    MultisigCosignatoryModificationType,
    MultisigCosignatoryModification,
    AggregateTransaction,
    CosignatureSignedTransaction,
    CosignatureTransaction,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';
import {from as observableFrom} from 'rxjs';
import {filter, map, mergeMap} from 'rxjs/operators';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'p',
        description: 'Private key of the cosignatory',
    })
    privateKey: string;
}

@command({
    description: 'Send a CosignatureTransaction an aggregate bonded',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let privateKey;
        let cosignatory;
        try {
            privateKey = OptionsResolver(options, 'privateKey', () => { return ''; },
                'Enter the cosignatory private key: ');
            cosignatory = Account.createFromPrivateKey(privateKey, NetworkType.MIJIN_TEST);
        } catch (err) {
            throw new ExpectedError('Enter a valid cosignatory private key');
        }

        // add a block monitor
        this.monitorBlocks();
        this.monitorAddress(this.getAddress("multisig1").plain());
        return await this.cosignMultisigTransaction(cosignatory);
    }

    public async cosignMultisigTransaction(
        cosignatory: Account
    ): Promise<Object>
    {
        const accountHttp = new AccountHttp(this.endpointUrl);
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        // create a cosignatory helper function to co-sign any aggregte
        const cosignHelper = (
            transaction: AggregateTransaction,
            account: Account
        ): CosignatureSignedTransaction => {
            const cosignatureTransaction = CosignatureTransaction.create(transaction);
            return account.signCosignatureTransaction(cosignatureTransaction);
        };
        
        return new Promise(async (resolve, reject) => {

            const multisig = this.getAccount("multisig1");

            // read aggregate-bonded transactions
            let unsignedTxes = await accountHttp
                                        .aggregateBondedTransactions(multisig.publicAccount)
                                        .toPromise();

            if (! unsignedTxes.length) {
                console.log("No transactions found to co-sign.");
                return reject(false);
            }

            // filter by unsigned
            return observableFrom(unsignedTxes).pipe(
                filter((_) => !_.signedByAccount(cosignatory.publicAccount)),
                map(transaction => cosignHelper(transaction, cosignatory)),
                mergeMap(signedSignature => {
                    console.log('Signed cosignature transaction');
                    console.log('Parent Hash: ', signedSignature.parentHash);
                    console.log('Signer:      ', signedSignature.signer, '\n');

                    // announce cosignature
                    return transactionHttp.announceAggregateBondedCosignature(signedSignature);
                })
            ).subscribe((announcedTransaction) => {
                console.log(chalk.green('Announced cosignature transaction'), '\n');
                return resolve(announcedTransaction);
            }, err => console.error(err));
        });
    }

}
