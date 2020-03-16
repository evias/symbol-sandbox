
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
    Account,
    NetworkType,
    AccountHttp,
    MultisigHttp,
    TransactionHttp,
    AggregateTransaction,
    CosignatureSignedTransaction,
    CosignatureTransaction,
    MultisigAccountInfo,
    PublicAccount,
} from 'symbol-sdk';

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
        await this.setupConfig();

        let privateKey;
        let cosignatory;
        try {
            privateKey = OptionsResolver(options, 'privateKey', () => { return ''; },
                'Enter the cosignatory private key: ');
            cosignatory = Account.createFromPrivateKey(privateKey, this.networkType);
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
        const multisigHttp = new MultisigHttp(this.endpointUrl);
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

            console.log("fetching partial transactions for cosignatory: " + cosignatory.address.plain() + "...")

            // read aggregate-bonded transactions
            let unsignedTxes = await accountHttp
                                        .getAccountPartialTransactions(cosignatory.address)
                                        .toPromise();

            if (! unsignedTxes.length) {
                console.error('None found.')
                console.log()

                // try fetch by multisig account
                let multisigInfo: MultisigAccountInfo
                try {
                    multisigInfo = await multisigHttp.getMultisigAccountInfo(cosignatory.address).toPromise()

                    if (!multisigInfo.multisigAccounts.length) {
                        console.error("This account is not part of a multi-signature account.");
                        return reject(false);
                    }
                }
                catch (e) { 
                    console.error("Error with multisig: ", e);
                    return reject(false);
                }

                for (let i = 0, m = multisigInfo.multisigAccounts.length; i < m; i++) { 
                    const multisig = multisigInfo.multisigAccounts[i]

                    console.log("fetching partial transactions for multisig: " + multisig.address.plain() + "...")
                    accountHttp.getAccountPartialTransactions(multisig.address).subscribe(
                        (transactions: AggregateTransaction[]) => {
                            return observableFrom(transactions).pipe(
                                filter((_) => !_.signedByAccount(cosignatory.publicAccount)),
                                map(transaction => cosignHelper(transaction, cosignatory)),
                                mergeMap(signedSignature => {
                                    console.log('Signed cosignature transaction');
                                    console.log('Parent Hash: ', signedSignature.parentHash);
                                    console.log('Signer:      ', signedSignature.signerPublicKey, '\n');
                
                                    // announce cosignature
                                    return transactionHttp.announceAggregateBondedCosignature(signedSignature);
                                })
                            ).subscribe((announcedTransaction) => {
                                console.log(chalk.green('Announced cosignature transaction'), '\n');
                                return resolve(announcedTransaction);
                            }, err => console.error(err));
                        }
                    , (err) => reject(err))
                }
            }
        });
    }

}
