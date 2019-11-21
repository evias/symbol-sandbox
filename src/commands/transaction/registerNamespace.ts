
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
    NamespaceId,
    Deadline,
    TransactionHttp,
    NamespaceRegistrationTransaction,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Namespace name',
    })
    name: string;
    @option({
        flag: 'p',
        description: 'Parent Namespace name',
    })
    parent?: string;
    @option({
        flag: 'd',
        description: 'Block Duration',
    })
    duration?: number;
}

@command({
    description: 'Prepare and broadcast RegisterNamespace',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();
        let name;
        let parentName;
        try {
            name = OptionsResolver(options,
                'name',
                () => { return ''; },
                'Enter a namespace name: ');

            parentName = OptionsResolver(options,
                'parentName',
                () => { return ''; },
                'Enter a namespace parent name: ');

        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid namespace name');
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.registerNamespace(options, name, parentName);
    }

    public async registerNamespace(options: CommandOptions, name: string, parentName: string): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send register namespace transaction
        const parent = parentName.length ? parentName : new NamespaceId([0, 0]);

        let registerTx;
        if (parentName.length) {
            registerTx = NamespaceRegistrationTransaction.createSubNamespace(
                Deadline.create(),
                name,
                parentName,
                this.networkType,
                UInt64.fromUint(1000000), // 1 XEM fee
            );
        }
        else {

            let duration: number;

            duration = parseInt(OptionsResolver(options,
                'duration',
                () => { return ''; },
                'Enter a block duration: '));

            if (isNaN(duration) || duration <= 0) {
                duration = 1000; // 1000 blocks default
            }

            registerTx = NamespaceRegistrationTransaction.createRootNamespace(
                Deadline.create(),
                name,
                UInt64.fromUint(duration), // 100'000 blocks
                this.networkType,
                UInt64.fromUint(1000000), // 1 XEM fee
            );
        }

        const signedTransaction = account.sign(registerTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('NamespaceRegistrationTransaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
            console.log("");
        }, (err) => {
            let text = '';
            text += 'registerNamespace() NamespaceRegistrationTransaction - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
