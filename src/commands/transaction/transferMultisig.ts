
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
    AggregateTransaction
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';
import {from as observableFrom} from 'rxjs';
import {filter, mergeMap} from 'rxjs/operators';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Number of cosignatories',
    })
    numCosig: number;
}

@command({
    description: 'Send a ModifyMultisigAccountTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let numCosig;
        try {
            numCosig = OptionsResolver(options, 'numCosig', () => { return ''; },
                'Enter a maximum number of cosignatories: ');
            numCosig = parseInt(numCosig);
        } catch (err) {
            throw new ExpectedError('Enter a valid maximum number of cosignatories');
        }

        // add a block monitor
        this.monitorBlocks();
        return await this.createMultisigTransfer(numCosig);
    }

    public async createMultisigTransfer(
        numCosig: number
    ): Promise<Object>
    {
        // prepare cosigners
        const cosignatories = {
            cosig1: this.getAccount("tester1"),
            cosig2: this.getAccount("tester2"),
            cosig3: this.getAccount("tester3"),
            cosig4: this.getAccount("tester4")
        };

        const cosignatoryAccount = cosignatories.cosig1;
        const recipient = this.getAddress("tester1");

        // the actual inner transaction
        const transferTx = TransferTransaction.create(
            Deadline.create(),
            recipient,
            [NetworkCurrencyMosaic.createRelative(1)],
            PlainMessage.create('Hello from a multisig transaction!!'),
            NetworkType.MIJIN_TEST
        );

        // multisig on catapult is *bonded* AggregateTransaction
        const multisigAcct = this.getAccount("multisig1").publicAccount;
        const multisigTx = AggregateTransaction.createBonded(
            Deadline.create(),
            [transferTx.toAggregate(multisigAcct)],
            NetworkType.MIJIN_TEST);

        // cosignatory #1 initiates the transaction (first signature)
        const signedMultisigTx = cosignatoryAccount.sign(multisigTx, this.generationHash);

        //@FIX catapult-server@0.3.0.2 does not allow namespaceId for HashLockTransaction
        //@FIX we need to retrieve the `linked mosaicId` from the `/namespace/`  endpoint.
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);
        const namespaceId = NetworkCurrencyMosaic.NAMESPACE_ID;
        const mosaicId = await namespaceHttp.getLinkedMosaicId(namespaceId).toPromise();

        // multisig account must lock funds for aggregate-bonded
        const absoluteAmount = 10000000;
        const lockFundsTx = LockFundsTransaction.create(
            Deadline.create(),
            new Mosaic(mosaicId, UInt64.fromUint(absoluteAmount)),
            UInt64.fromUint(480), // ~2 hours
            signedMultisigTx,
            NetworkType.MIJIN_TEST);

        const signedLockFundsTx = cosignatoryAccount.sign(lockFundsTx, this.generationHash);

        // multi step listener with lock funds announce and aggregate-bonded announce
        // we must listen to the confirmed channel to be sure that our HashLockTransaction
        // is confirmed before we can announce the aggregate bonded.

        const listener = new Listener(this.endpointUrl);
        const connection = await listener.open();
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        return new Promise(async (resolve, reject) => {
            // announce lock funds and subscribe to errors
            transactionHttp
                .announce(signedLockFundsTx)
                .subscribe(x => {
                    console.log('Announced lock funds transaction');
                    console.log('Hash:   ', signedLockFundsTx.hash);
                    console.log('Signer: ', signedLockFundsTx.signer, '\n');
                    console.log('');
                    console.log('Waiting to be included in a block..');
                }, err => console.error(err));

            // when the lock funds is confirmed, send the aggregate-bonded
            return observableFrom(listener.confirmed(cosignatoryAccount.address)).pipe(
                filter((transaction) =>
                        transaction.transactionInfo !== undefined
                    && transaction.transactionInfo.hash === signedLockFundsTx.hash),
                mergeMap(ignored => {
                    let text = chalk.green('LockFunds Confirmed!');
                    console.log(text, '\n');

                    // add address monitor
                    this.monitorAddress(multisigAcct.address.plain());

                    // announce multisig transaction
                    return transactionHttp.announceAggregateBonded(signedMultisigTx);
                })
            )
            .subscribe(announcedAggregateBonded => {
                console.log('Announced aggregate bonded transaction');
                console.log('Hash:   ', signedMultisigTx.hash);
                console.log('Signer: ', signedMultisigTx.signer, '\n');

                return resolve(announcedAggregateBonded);
            }, err => console.error(err));
        });
    }

}
