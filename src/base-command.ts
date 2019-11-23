
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
import {Command, ExpectedError, option, Options} from 'clime';
import {Spinner} from 'cli-spinner';
import {
    Account,
    Address,
    Listener,
    NetworkType,
    UInt64,
    NetworkHttp,
} from 'nem2-sdk';

const fs = require('fs')

export abstract class BaseCommand extends Command {
    public spinner = new Spinner('processing.. %s');

    public endpointUrl: string = "http://localhost:3000";
    public generationHash: string = '';

    public networkType: NetworkType;
    protected accounts = {};

    public listenersAddresses = {};
    public listenerBlocks = null;
    public blockSubscription = null;
    public networkConfig: any = {}

    constructor() {
        super();
        this.spinner.setSpinnerString('|/-\\');

        this.readAccountsConfig()
        this.readNetworkConfig()
    }

    public async setupConfig() {
        const networkHttp = new NetworkHttp(this.endpointUrl)
        this.networkType = await networkHttp.getNetworkType().toPromise();

        //XXX read generation hash from node
        //XXX read currency mosaic from node
    }

    private readAccountsConfig() {

        const accountsFile = fs.readFileSync(__dirname + '/../../conf/accounts.json', 'utf8')
        const accountsConfig = JSON.parse(accountsFile)

        const nemesis = accountsConfig.nemesis
        const testers = accountsConfig.testers
        const multisig = accountsConfig.multisig

        for (let n = 0, m = nemesis.length; n < m; n++) {
            const name = 'nemesis' + (n+1)
            this.accounts[name] = nemesis[n]
        }

        for (let n = 0, m = testers.length; n < m; n++) {
            const name = 'tester' + (n+1)
            this.accounts[name] = testers[n]
        }

        for (let n = 0, m = multisig.length; n < m; n++) {
            const name = 'multisig' + (n+1)
            this.accounts[name] = multisig[n]
        }
    }

    private readNetworkConfig() {

        const networkFile = fs.readFileSync(__dirname + '/../../conf/network.json', 'utf8')
        this.networkConfig = JSON.parse(networkFile)
        this.endpointUrl = this.networkConfig.endpointUrl;
        this.generationHash = this.networkConfig.generationHash;
    }


    public getAccount(name: string): Account {
        return Account.createFromPrivateKey(this.accounts[name], this.networkType);
    }

    public getAddress(name: string): Address {
        const acct = this.getAccount(name);
        return Address.createFromPublicKey(acct.publicKey, this.networkType);
    }

    private getPrivateKey(name: string): string {
        return this.accounts[name];
    }

    public monitorBlocks(): any {
        this.listenerBlocks = new Listener(this.endpointUrl);
        this.listenerBlocks.open().then(() => {

            this.blockSubscription = this.listenerBlocks.newBlock()
                .subscribe(block => {
                    console.log("[MONITOR] New block created:" + block.height.compact());
                },
                error => {
                    console.error(error);
                    this.listenerBlocks.terminate();
                });
        });
    }

    public monitorAddress(address: string): any {

        if (this.listenersAddresses.hasOwnProperty(address)) {
            return false;
        }

        this.listenersAddresses[address] = new Listener(this.endpointUrl);
        this.listenersAddresses[address].open().then(() => {

            // Monitor transaction errors
            this.listenersAddresses[address].status(Address.createFromRawAddress(address))
                .subscribe(error => {
                    let err = chalk.red("[ERROR] Error [" + address + "]: ");
                    console.log(err, error);
                },
                error => console.error(error));

            // Monitor confirmed transactions
            this.listenersAddresses[address].confirmed(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.green("[MONITOR] Confirmed TX [" + address + "]: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor unconfirmed transactions
            this.listenersAddresses[address].unconfirmedAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Unconfirmed TX [" + address + "]: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor aggregate bonded transactions
            this.listenersAddresses[address].aggregateBondedAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Aggregate Bonded TX [" + address + "]: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor cosignature transactions
            this.listenersAddresses[address].cosignatureAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Cosignature TX [" + address + "]: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));
        });
    }

    public closeMonitors(): any
    {
        Object.keys(this.listenersAddresses)
              .map((address) => { this.listenersAddresses[address].close(); });

        if (this.listenerBlocks) {
            this.listenerBlocks.close();
        }
    }

    public readUIntArgument(
        uintAsString: string
    ): UInt64
    {
        if (uintAsString.indexOf('[') === 0) {
            let asArray: Array<number> = JSON.parse(uintAsString);
            return new UInt64(asArray);
        }

        return UInt64.fromUint(parseInt(uintAsString));
    }
}

export class BaseOptions extends Options {}
