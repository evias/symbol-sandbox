
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
import axios from 'axios';
import { NetworkType } from 'nem2-sdk';

// internal dependencies
import { Service } from './Service';

export const DEFAULT_CAT_URL = 'http://localhost:3000';
export const DEFAULT_CAT_NETWORK_ID = NetworkType.MIJIN_TEST;

export class CATDataReader extends Service {

    constructor(
        public readonly URL: string = DEFAULT_CAT_URL,
        public readonly PORT: number = 3000,
        public readonly NETWORK_ID: number = DEFAULT_CAT_NETWORK_ID,
    ) {
        super();
    }

    public static async getNetworkId(url: string) {
        const response: any = await axios.get(url.replace(/\/$/, '') + '/node/info');
        if (!response || !response.data || !response.networkIdentifier) {
            return DEFAULT_CAT_NETWORK_ID;
        }

        // parse network id from endpoint
        return parseInt(response.data.networkIdentifier);
    }
}
