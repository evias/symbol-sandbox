
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
import * as readlineSync from 'readline-sync';
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
    Account,
} from 'nem2-sdk';
import {
    ExtendedKey,
    MnemonicPassPhrase,
    Wallet,
} from 'nem2-hd-wallets';

import {SandboxConstants} from '../../constants';
import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'm',
        description: 'Mnemonic pass phrase',
    })
    mnemonic: number;
    @option({
        flag: 'd',
        description: 'Derivation path',
    })
    derivationPath: number;
    @option({
        flag: 'n',
        description: 'Network Type',
    })
    networkType: string;
}

@command({
    description: 'Create a new account',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let privateKey: string
        let mnemonic: string
        let derivationPath: string

        const networkType: NetworkType = this.getNetworkType(options)

        console.log('');
        const doMnemonicInput = readlineSync.keyInYN(
            'Do you want to enter a mnemonic pass phrase? ');
        console.log('');

        try {
            let account: Account
            if (doMnemonicInput) {
                account = this.createMnemonicAccount(options, networkType)
            }
            else {
                account = this.createPrivateKeyAccount(networkType)
            }

            console.log('')
            console.log('Private Key: ' + chalk.yellow(account.privateKey))
            console.log(' Public Key: ' + chalk.yellow(account.publicKey))
            console.log('    Address: ' + chalk.yellow(account.address.plain()))
            console.log('')
        }
        catch (err) {
            console.error("An error occured: ", err)
            return ;
        }
    }

    public getNetworkType(
        options: CommandOptions
    ): NetworkType {
        const networkType = OptionsResolver(options,
            'networkType',
            () => { return ''; },
            'Enter a network type (mijin | mijinTest | public | publicTest): ')

        switch (networkType) {
        default:
        case 'mijinTest':
            return NetworkType.MIJIN_TEST
        case 'publicTest':
            return NetworkType.TEST_NET
        case 'mijin':
            return NetworkType.MIJIN
        case 'public':
            return NetworkType.MAIN_NET
        }
    }

    public createMnemonicAccount(
        options: CommandOptions,
        networkType: NetworkType = NetworkType.MIJIN_TEST
    ): Account {
        const mnemo = OptionsResolver(options,
            'mnemonic',
            () => { return ''; },
            'Enter a mnemonic pass phrase: ')
        const mnemonic = new MnemonicPassPhrase(mnemo)

        let derivationPath = OptionsResolver(options,
            'derivationPath',
            () => { return ''; },
            'Enter a derivation path (default: m/44\'/43\'/0\'/0\'/0\'): ')

        if (! derivationPath.length) {
            derivationPath = 'm/44\'/43\'/0\'/0\'/0\''
        }

        // create extended key from mnemonic pass phrase
        const extKey = ExtendedKey.createFromSeed(mnemonic.toEntropy())
        const wallet = new Wallet(extKey)
        const account = wallet.getChildAccount(derivationPath, networkType)
        return Account.createFromPrivateKey(account.privateKey, networkType)
    }

    public createPrivateKeyAccount(
        networkType: NetworkType = NetworkType.MIJIN_TEST
    ): Account {
        return Account.generateNewAccount(networkType)
    }

}
