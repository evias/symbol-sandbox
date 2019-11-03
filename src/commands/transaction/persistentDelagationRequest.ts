
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
    NetworkType,
    NamespaceHttp,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    NamespaceId,
    PersistentDelegationRequestTransaction,
    PublicAccount,
    Account,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'd',
        description: 'Delegated Private Key',
    })
    delegatedPrivateKey: string;
    @option({
        flag: 'r',
        description: 'Recipient public key',
    })
    recipientPublicKey: number;
    @option({
        flag: 's',
        description: 'Sender private key',
    })
    senderPrivateKey: number;
}

@command({
    description: 'Send TransferTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        let delegatedPrivateKey: string
        let recipientPublicKey: string
        let senderPrivateKey: string

        let delegatedAccount: Account
        let recipientAccount: PublicAccount
        let senderAccount: Account

        try {
            delegatedPrivateKey = OptionsResolver(options,
                'delegatedPrivateKey',
                () => { return ''; },
                'Enter a delegated private key: ')
            delegatedAccount = Account.createFromPrivateKey(delegatedPrivateKey, this.networkType)
        } catch (err) {
            delegatedAccount = Account.generateNewAccount(this.networkType)
        }
        try {
            recipientPublicKey = OptionsResolver(options,
                'recipientPublicKey',
                () => { return ''; },
                'Enter a recipient public key: ')
            recipientAccount = PublicAccount.createFromPublicKey(recipientPublicKey, this.networkType)
        } catch (err) {
            recipientAccount = Account.generateNewAccount(this.networkType).publicAccount
        }

        try {
            senderPrivateKey = OptionsResolver(options,
                'senderPrivateKey',
                () => { return ''; },
                'Enter a sender private key: ')
            senderAccount = Account.createFromPrivateKey(senderPrivateKey, this.networkType)
        } catch (err) {
            senderAccount = Account.generateNewAccount(this.networkType)
        }

        // add a block monitor
        this.monitorBlocks();

        const address = senderAccount.address.plain()
        this.monitorAddress(address);

        return await this.sendDelegationRequest(
            delegatedAccount,
            recipientAccount,
            senderAccount
        );
    }

    public async sendDelegationRequest(
        delegatedAccount: Account,
        recipientAccount: PublicAccount,
        senderAccount: Account
    ): Promise<any> //Promise<Object>
    {
        console.log(chalk.yellow('Sending delegation request with: ' + JSON.stringify({
            delegatedPrivateKey: delegatedAccount.privateKey,
            remotePublicKey: recipientAccount.publicKey,
            senderAddress: senderAccount.address.plain()
        })))

        // prepare SDK transaction and sign it
        const delegationTx = PersistentDelegationRequestTransaction.createPersistentDelegationRequestTransaction(
            Deadline.create(),
            delegatedAccount.privateKey,
            recipientAccount.publicKey,
            senderAccount.privateKey,
            this.networkType,
            UInt64.fromUint(1000000)
        )
    
        const signedTransaction = senderAccount.sign(delegationTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Transaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
        }, (err) => {
            let text = '';
            text += 'testTransferAction() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
