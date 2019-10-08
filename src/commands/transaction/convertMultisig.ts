
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
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'p',
        description: 'Private key of the account to convert',
    })
    @option({
        flag: 'n',
        description: 'Number of cosignatories (1-4)',
    })
    @option({
        flag: 'm',
        description: 'Required number of cosignatories (1-4)',
    })
    privateKey: string;
    numCosig: number;
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

        const account = Account.createFromPrivateKey(privateKey, NetworkType.MIJIN_TEST);

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
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(modifTx, this.generationHash);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('ModifyMultisigAccount announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
            console.log("");

        }, (err) => {
            let text = '';
            text += 'createModifyMultisigAccount() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
