
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
    Deadline,
    TransactionHttp,
    MultisigAccountModificationTransaction,
    CosignatoryModificationAction,
    MultisigCosignatoryModification,
    UInt64,
    AggregateTransaction,
    Mosaic,
    NamespaceId,
    LockFundsTransaction,
    CosignatureSignedTransaction,
    CosignatureTransaction,
    AccountHttp,
    Listener,
    BlockHttp,
} from 'nem2-sdk';
import {from as observableFrom} from 'rxjs';
import {filter, map, mergeMap, first} from 'rxjs/operators';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';
import { SandboxConstants } from '../../constants';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'p',
        description: 'Private key of the account to convert',
    })
    privateKey: string;
    @option({
        flag: 'n',
        description: 'Number of cosignatories (1-4)',
    })
    numCosig: number;
    @option({
        flag: 'm',
        description: 'Required number of cosignatories (1-4)',
    })
    reqCosig: number;
}

@command({
    description: 'Send a MultisigAccountModificationTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        let privateKey;
        try {
            privateKey = OptionsResolver(options, 'privateKey', () => { return ''; },
                'Enter the privateKey of the account to convert: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid privateKey');
        }

        let numCosig;
        try {
            numCosig = OptionsResolver(options, 'numCosig', () => { return ''; },
                'Enter a maximum number of cosignatories: ');
            numCosig = parseInt(numCosig);
        } catch (err) {
            throw new ExpectedError('Enter a valid maximum number of cosignatories');
        }

        let reqCosig;
        try {
            reqCosig = OptionsResolver(options, 'reqCosig', () => { return ''; },
                'Enter a number of required cosignatories: ');
            reqCosig = parseInt(reqCosig);
        } catch (err) {
            throw new ExpectedError('Enter a valid number of require cosignatories');
        }

        const account = Account.createFromPrivateKey(privateKey, this.networkType);

        console.log('')
        console.log('Converting Account to Multisig')
        console.log('Private Key: ', privateKey)
        console.log(' Public Key: ', account.publicKey)
        console.log('    Address: ', account.address.plain())
        console.log('')

        // add a block monitor
        this.monitorBlocks();
        this.monitorAddress(account.address.plain());

        return await this.createModifyMultisigAccount(account, numCosig, reqCosig);
    }

    public async createModifyMultisigAccount(
        account: Account,
        numCosig: number,
        reqCosig: number
    ): Promise<Object>
    {
        // prepare cosigners
        const cosignatories = {
            "cosig1": this.getAccount("tester1").publicAccount,
            "cosig2": this.getAccount("tester2").publicAccount,
            "cosig3": this.getAccount("tester3").publicAccount,
            "cosig4": this.getAccount("tester4").publicAccount
        };

        // add modification for each cosigner needed
        let modifications = [];
        for (let i = 0; i < numCosig; i++) {
            const key = 'cosig' + (i+1);
            modifications.push(new MultisigCosignatoryModification(
                CosignatoryModificationAction.Add,
                cosignatories[key],
            ));
        }

        const modifType  = CosignatoryModificationAction.Add;
        const modifTx = MultisigAccountModificationTransaction.create(
            Deadline.create(),
            reqCosig, // 2 minimum cosignatories
            reqCosig, // 2 cosignatories needed for removal of cosignatory
            modifications,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        // MultisigAccountModificationTransaction must be announce in aggregate bonded
        const aggregateTx = AggregateTransaction.createBonded(
            Deadline.create(),
            [modifTx.toAggregate(account.publicAccount)],
            this.networkType, [], UInt64.fromUint(1000000));

        // sign aggregate *but do not announce yet.* (SPAM protection)
        const signedAggregateTx = account.sign(aggregateTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedAggregateTx.payload))

        // create lock funds of 10 "cat.currency" for the aggregate transaction
        const lockFundsTransaction = LockFundsTransaction.create(
            Deadline.create(),
            new Mosaic(new NamespaceId(SandboxConstants.CURRENCY_MOSAIC_NAME), UInt64.fromUint(10000000)), // 10 XEM
            UInt64.fromUint(1000),
            signedAggregateTx,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedLockFundsTx = account.sign(lockFundsTransaction, this.generationHash);

        // -------------------------------------
        // Step 1: Announce LockFundsTransaction
        // -------------------------------------

        const transactionHttp = new TransactionHttp(this.endpointUrl);
        transactionHttp.announce(signedLockFundsTx).subscribe(() => {
            console.log('Announced lock funds transaction');
            console.log('Hash:   ', signedLockFundsTx.hash);
            console.log('Signer: ', signedLockFundsTx.signerPublicKey, '\n');
        }, (err) => {
            let text = '';
            text += 'createModifyMultisigAccount() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });

        // ----------------------------------------------------------------------------
        // Step 2: Announce AggregateBonded with MultisigAccountModificationTransaction
        // ----------------------------------------------------------------------------

        const blockListener = new Listener(this.endpointUrl)
        const blockHttp = new BlockHttp(this.endpointUrl)
        const lockFundsHash = signedLockFundsTx.hash

        // This step should only happen after the lock funds got confirmed.
        return blockListener.open().then(() => {
            return blockListener.newBlock().pipe(
                mergeMap(_ => blockHttp.getBlockTransactions(_.height.compact())),
                filter(txes => txes.find(tx => tx.transactionInfo.hash === lockFundsHash) !== undefined)
            ).subscribe(block => {
                transactionHttp.announceAggregateBonded(signedAggregateTx).subscribe(() => {
                    console.log('Announced aggregate bonded transaction with multisig account modification');
                    console.log('Hash:   ', signedAggregateTx.hash);
                    console.log('Signer: ', signedAggregateTx.signerPublicKey, '\n');
                }, (err) => {
                    let text = '';
                    text += 'createModifyMultisigAccount() - Error';
                    console.log(text, err.response !== undefined ? err.response.text : err);
                });
            });
        })        
    }

}
