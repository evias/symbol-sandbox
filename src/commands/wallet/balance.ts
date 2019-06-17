
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
    AccountHttp,
    Address,
    NetworkType,
    PublicAccount,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'a',
        description: 'Address',
    })
    @option({
        flag: 'p',
        description: 'Public Key',
    })
    @option({
        flag: 's',
        description: 'Private Key',
    })
    address: string;
    publicKey: string;
    privateKey: string;
}

@command({
    description: 'Check for cow compatibility of TransferTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {

        let addr;
        addr = OptionsResolver(options,
            'address',
            () => { return ''; },
            'Enter an address or public key: ');

        const address = this.readAccount(addr);
        return await this.fetchAccountData(address);
    }

    public async fetchAccountData(address: Address): Promise<Object>
    {
        // announce/broadcast transaction
        const accountHttp = new AccountHttp(this.endpointUrl);

        return accountHttp.getAccountInfo(address).subscribe((accountInfo) => {

            let text = '';
            text += chalk.green('Address:\t') + chalk.bold(address.plain()) + '\n';
            text += '-'.repeat(20) + '\n\n';
            text += 'Meta Data:\t' + JSON.stringify(accountInfo.meta) + '\n';
            text += 'Address:\t' + accountInfo.address.plain() + '\n';
            text += 'Address #:\t' + accountInfo.addressHeight.compact() + '\n';
            text += 'Public Key:\t' + accountInfo.publicKey + '\n';
            text += 'Public Key #:\t' + accountInfo.publicKeyHeight.compact() + '\n';
            text += 'Importance:\t' + accountInfo.importance.compact() + '\n';
            text += 'Importance #:\t' + accountInfo.importanceHeight.compact() + '\n';
            text += 'Mosaics: \n\n';

            accountInfo.mosaics.map((mosaicInfo) => {
                text += mosaicInfo.amount.compact() + " " + mosaicInfo.id.toHex() + '\n';
            });
    
            console.log(text);

        }, (err) => {
            let text = '';
            text += 'getAccountInfo() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

    private readAccount(addressOrPub: string): Address
    {
        if (addressOrPub.length === 40) {
            return Address.createFromRawAddress(addressOrPub);
        }
        else if (addressOrPub.length === 64) {
            return Address.createFromPublicKey(addressOrPub, NetworkType.MIJIN_TEST);
        }

        throw new ExpectedError("parameter addressOrPub must be either of 40 or 64 characters.");
    }

}
