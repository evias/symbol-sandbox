
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
} from 'nem2-sdk';

export abstract class BaseCommand extends Command {
    public spinner = new Spinner('processing.. %s');

    public endpointUrl = "http://localhost:3000";
    protected accounts = {
        "tester1": {
            "address": "SBXTSKD2FDOP4A37ANWSWCOKGPIBGYYK5U3CIYMZ",
            "privateKey": ""},
        "tester2": {
            "address": "SC3KUHEEBYHZL35OL6ST7KRMB6RTOEMP2J6UFM6S",
            "privateKey": ""},
        "tester3": {
            "address": "SD2AMYW6QRH2DQ6BCSMKDHKSL7PMEDOORXM73B7Q",
            "privateKey": ""},
        "tester4": {
            "address": "SDBTF7Y63B4FONR6PFJ64BQA4EKRYB7CBTWEMONC",
            "privateKey": ""},
        "multisig1": {
            "address": "SCDW6TN6OS7G3QOZZEMDMUGHOJSHM3XZC2WYFFDC",
            "privateKey": ""},
    };

    private hasBlockMonitor = false;
    private blockSubscription = null;
    private listenerAddresses = null;
    private listenerBlocks = null;

    constructor() {
        super();
        this.spinner.setSpinnerString('|/-\\');
        this.listenerAddresses = new Listener(this.endpointUrl);
        this.listenerBlocks = new Listener(this.endpointUrl);
    }

    public getAccount(name: string): Account {
        return Account.createFromPrivateKey(this.accounts[name].privateKey, NetworkType.MIJIN_TEST);
    }

    public getAddress(name: string): Address {
        const acct = this.getAccount(name);
        return Address.createFromPublicKey(acct.publicKey, NetworkType.MIJIN_TEST);
    }

    private getPrivateKey(name: string): string {
        return this.accounts[name].privateKey;
    }

    public monitorBlocks(): any {
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
        this.listenerAddresses.open().then(() => {

            // Monitor transaction errors
            this.listenerAddresses.status(Address.createFromRawAddress(address))
                .subscribe(error => {
                    let err = chalk.red("[ERROR] Error: ");
                    console.log(err, error);
                },
                error => console.error(error));

            // Monitor confirmed transactions
            this.listenerAddresses.confirmed(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.green("[MONITOR] Confirmed TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor unconfirmed transactions
            this.listenerAddresses.unconfirmedAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Unconfirmed TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor aggregate bonded transactions
            this.listenerAddresses.aggregateBondedAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Aggregate Bonded TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor cosignature transactions
            this.listenerAddresses.cosignatureAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Cosignature TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));
        });
    }

    public closeMonitors(): any
    {
        this.listenerAddresses.close();
        this.listenerBlocks.close();
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
