
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
import { ExpectedError, option, Options } from 'clime';
import { Account, NetworkType } from 'nem2-sdk';

// internal dependencies
import { OptionsResolver } from './options-resolver';
import { BaseCommand, BaseOptions } from './base-command';
import { DEFAULT_NIS_URL, NISDataReader, NIS_SDK as sdk } from './services/NISDataReader';
import { DEFAULT_CAT_URL, CATDataReader } from './services/CATDataReader';

export const NIS_SDK = sdk;

export abstract class MigrationCommand extends BaseCommand {

    protected catapultAccount: Account;
    protected catapultAddress: string;
    protected catapultNetworkId: NetworkType = NetworkType.MIJIN_TEST;
    protected catapultReader: CATDataReader;
    protected nisUrl: string = DEFAULT_NIS_URL;
    protected nisAccount: any;
    protected nisAddress: string;
    protected nisReader: NISDataReader;

    constructor() {
        super();
    }
    
    protected async readParameters(options: BaseOptions) {

        const params = {};

        // PARAM 1: Catapult Endpoint URL
        try {
            params['peerUrl'] = OptionsResolver(options,
                'peerUrl',
                () => { return ''; },
                'Enter a peerUrl: (Ex.: http://localhost:3000) ');
        } 
        catch (err) {
            throw new ExpectedError('The Catapult Endpoint URL input provided is invalid.');
        }

        // only overwrite if value provided
        if (params['peerUrl'] && params['peerUrl'].length) {
            this.endpointUrl = params['peerUrl'];
        }

        // PARAM 2: NIS1 Endpoint URL
        try {
            params['nisUrl'] = OptionsResolver(options,
                'nisUrl',
                () => { return ''; },
                'Enter a NIS1 URL: (Ex.: http://localhost:7890) ');
        } 
        catch (err) {
            throw new ExpectedError('The NIS1 Endpoint URL input provided is invalid.');
        }

        // only overwrite if value provided
        if (params['nisUrl'] && params['nisUrl'].length) {
            this.nisUrl = DEFAULT_NIS_URL;
        }

        // PARAM 3: Account Private Key
        try {
            params['privateKey'] = OptionsResolver(options,
                'privateKey',
                () => { return ''; },
                'Enter your account private key: ');
        } 
        catch (err) {
            throw new ExpectedError('The Account Private Key input provided is invalid.');
        }

        if (! params['privateKey'] || !params['privateKey'].length) {
            throw new Error('Empty or invalid account private key provided. Please, check your input.');
        }

        // read networkId from NIS endpoint
        const nisNetworkId = await NISDataReader.getNetworkId(this.nisUrl);

        // read networkId from Catapult endpoint
        const catNetworkId = await CATDataReader.getNetworkId(this.endpointUrl);

        // initialize services and load accounts
        this.nisReader = new NISDataReader(this.nisUrl, 7890, nisNetworkId);
        this.catapultReader = new CATDataReader(this.endpointUrl, 3000, catNetworkId);
        this.loadAccounts(params['privateKey']);

        return params;
    }

    protected loadAccounts(privateKey: string): boolean {

        // Load Catapult Account
        this.catapultAccount = Account.createFromPrivateKey(privateKey, this.catapultReader.NETWORK_ID);
        this.catapultAddress = this.catapultAccount.address.plain();

        // Load NIS1 Account
        this.nisAccount = NIS_SDK.crypto.keyPair.create(privateKey);
        this.nisAddress = NIS_SDK.model.address.toAddress(this.nisAccount.publicKey.toString(), this.nisReader.NETWORK_ID);

        // Load successful
        return true;
    }
}

export class MigrationOptions extends Options {
    @option({
        flag: 'c',
        description: 'Catapult Endpoint URL (Ex.: "http://localhost:3000")',
    })
    peerUrl: string;
    @option({
        flag: 'n',
        description: 'NIS1 Endpoint URL (Ex.: "http://localhost:7890")',
    })
    nisUrl: string;
    @option({
        flag: 'p',
        description: 'Your account private key',
    })
    privateKey: string;
}
