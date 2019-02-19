
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
import {Account, Address, Listener, NetworkType} from 'nem2-sdk';

export abstract class BaseCommand extends Command {
    public spinner = new Spinner('processing.. %s');

    public endpointUrl = "http://localhost:3000";
    private accounts = {
        "tester1": {
            "address": "SACYZJLLP6OCY3KF3TTJRVE4W3MLNP5BQP75NKJC",
            "privateKey": ""},
        "tester2": {
            "address": "SDUFICQAIHN2VYORJILRQ5YXAERLJF5HDTPJNXVR",
            "privateKey": ""},
        "tester3": {
            "address": "SDAIUGSGF5R6O74FBSKLNIZZOIPCROFB23ELSQOY",
            "privateKey": ""},
    };

    private hasBlockMonitor = false;
    private blockSubscription = null;
    private listener = null;

    constructor() {
        super();
        this.spinner.setSpinnerString('|/-\\');
        this.listener = new Listener(this.endpointUrl);
    }

    public getAccount(name: string): Account
    {
        return Account.createFromPrivateKey(this.accounts[name].privateKey, NetworkType.MIJIN_TEST);
    }

    public getAddress(name: string): Address
    {
        return Address.createFromRawAddress(this.accounts[name].address);
    }

    private getPrivateKey(name: string): string
    {
        return this.accounts[name].privateKey;
    }

    public monitorBlocks(): any
    {
        // Monitor new blocks
        this.blockSubscription = this.listener.newBlock()
            .subscribe(block => {
                console.log("[MONITOR] New block created:" + block.height.compact());
            },
            error => {
                console.error(error);
                this.listener.terminate();
            });

        return this;
    }

    public monitorAddress(address: string): any
    {
        this.listener.open().then(() => {

            if (! this.hasBlockMonitor) {
                this.monitorBlocks();
                this.hasBlockMonitor = true;
            }

            // Monitor transaction errors
            this.listener.status(Address.createFromRawAddress(address))
                .subscribe(error => {
                    let err = chalk.red("[ERROR] Error: ");
                    console.log(err, error);
                },
                error => console.error(error));

            // Monitor confirmed transactions
            this.listener.confirmed(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.green("[MONITOR] Confirmed TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Monitor unconfirmed transactions
            this.listener.unconfirmedAdded(Address.createFromRawAddress(address))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Unconfirmed TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            // Close monitor after 2 minutes
            setTimeout(() => {
                console.log("Now shutting down monitor..");
                this.closeMonitors();
            }, 2 * 60 * 1000);
        });
    }

    public closeMonitors(): any
    {
        this.blockSubscription.unsubscribe();
        this.listener.close();
    }
}

export class BaseOptions extends Options {}
