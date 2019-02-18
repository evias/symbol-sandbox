
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
    private privateKey    = "";
    public accountAddress = "SACYZJLLP6OCY3KF3TTJRVE4W3MLNP5BQP75NKJC";

    constructor() {
        super();
        this.spinner.setSpinnerString('|/-\\');
    }

    public getAccount(): Account
    {
        return Account.createFromPrivateKey(this.privateKey, NetworkType.MIJIN_TEST);
    }

    public getAddress(): Address
    {
        return Address.createFromRawAddress(this.accountAddress);
    }

    public monitorAction(): any
    {
        const listener = new Listener(this.endpointUrl);
        listener.open().then(() => {

            // Monitor new blocks
            const newBlockSubscription = listener.newBlock()
                .subscribe(block => {
                    console.log("[MONITOR] New block created:" + block.height.compact());
                },
                error => {
                    console.error(error);
                    listener.terminate();
                });

            // Monitor transaction errors
            listener.status(Address.createFromRawAddress(this.accountAddress))
                .subscribe(error => {
                    let err = chalk.red("[ERROR] Error: ");
                    newBlockSubscription.unsubscribe();
                    listener.close();

                    console.log(err, error);
                },
                error => console.error(error));

            listener.confirmed(Address.createFromRawAddress(this.accountAddress))
                .subscribe(tx => {
                    let msg = chalk.green("[MONITOR] Confirmed TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));

            listener.unconfirmedAdded(Address.createFromRawAddress(this.accountAddress))
                .subscribe(tx => {
                    let msg = chalk.yellow("[MONITOR] Unconfirmed TX: ");

                    console.log(msg, JSON.stringify(tx))
                },
                error => console.error(error));
        });
    }
}

export class BaseOptions extends Options {}
