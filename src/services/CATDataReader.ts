
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
import { NetworkType } from 'symbol-sdk';

// internal dependencies
import { Service } from './Service';

export const DEFAULT_CAT_URL = 'http://localhost:3000';
export const DEFAULT_CAT_NETWORK_ID = NetworkType.MIJIN_TEST;
export const DEFAULT_GENERATION_HASH = '167FF7C1CC4C2D536EDB7497608001C3A7E9B91D90FAB2A4ECFE6424A489D58E';

export class CATDataReader extends Service {

    constructor(
        public readonly URL: string = DEFAULT_CAT_URL,
        public readonly PORT: number = 3000,
        public readonly NETWORK_ID: number = DEFAULT_CAT_NETWORK_ID,
        public readonly GENERATION_HASH: string = DEFAULT_GENERATION_HASH,
    ) {
        super();
    }

    public static async getNetworkId(url: string) {
        const response: any = await axios.get(url.replace(/\/$/, '') + '/network');
        if (!response || !response.data || !response.name) {
            return DEFAULT_CAT_NETWORK_ID;
        }

        // parse network id from endpoint
        switch (response.data.name) {
            default:
            case 'mijinTest': 
                return NetworkType.MIJIN_TEST

            case 'mijin':
                return NetworkType.MIJIN

            case 'publicTest':
                return NetworkType.TEST_NET
            
            case 'public':
                return NetworkType.MAIN_NET
        }
    }

    public static async getGenerationHash(url: string) {
        const response: any = await axios.get(url.replace(/\/$/, '') + '/block/1');
        if (!response || !response.data) {
            return DEFAULT_GENERATION_HASH;
        }

        // Read generationHash from first block
        return response.data.meta.generationHash;
    }

    public formatMosaicName(name: string) {
        const mosaicParts = name.split(':')
        const namespaceParts = mosaicParts[0].split('.')

        const catapultName = '';
        if (namespaceParts.length < 3) {
            return mosaicParts[0] + '.' + mosaicParts[1]
        }

        // mosaic is on level 4 in `a.b.c:d` (mosaic is `d`)
        // add hyphens between namespace on catapult and mosaic name
        // with above example formatted to `a.b.c-d`
        return mosaicParts[0] + '-' + mosaicParts[1]
    }
}
