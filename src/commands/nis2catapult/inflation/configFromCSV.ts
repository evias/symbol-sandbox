
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
import fs = require('fs');
import * as readlineSync from 'readline-sync';

// internal dependencies
import {OptionsResolver} from '../../../options-resolver';
import {BaseCommand, BaseOptions} from '../../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'f',
        description: 'CSV file path',
    })
    filePath: string;
    @option({
        flag: 'o',
        description: 'output file path',
    })
    outputPath: string;
}

interface InflationRow {
    reductionNumber: string,
    yearsPostLaunch: string,
    daysSincePrev: string,
    dateStarting: string,
    blockReward: string,
    blockRewardPc: string,
    startingAtBlock: string,
    totalProduced: string,
    regression: string,
    quarter: string,
    year: string,
    oneYearProduced: string,
    pcSupplyHarvested: string,
    pcSupplyRemaining: string,
    pcBTCSupplyMined: string,
    pcBTCSupplyRemaining: string,
    reservedEmpty: string,
    catBudget: string,
}

interface InflationConfigRow {
    startingAtHeight: Number,
    blockReward: Number
}

@command({
    description: 'Read CSV with Inflation Calculation and produce config-inflation.properties',
})
export default class extends BaseCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        let filePath;
        try {
            filePath = OptionsResolver(options,
                'filePath',
                () => { return ''; },
                'Enter an absolute path to a CSV file: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        console.log('');
        const hasHeader = readlineSync.keyInYN(
            'Does your CSV file include a header row? ');
        console.log('');

        //XXX win32 line endings when using win32
        const inflationRows = this.readCSV(filePath, hasHeader);
        let inflationConfig = '[inflation]\n\n';
        inflationRows.map((inflation: InflationRow) => {
            let startingAtBlock = parseInt(inflation.startingAtBlock)
            if (startingAtBlock === 0) startingAtBlock = 1

            const blockReward = Math.floor(parseFloat(inflation.blockReward) * 1000000)

            // add config row
            inflationConfig += 'starting-at-height-' + startingAtBlock + ' = ' + blockReward + '\n';
        })

        let outputPath;
        try {
            outputPath = OptionsResolver(options,
                'outputPath',
                () => { return ''; },
                'Enter an absolute path to your output file: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid input');
        }

        fs.writeFileSync(outputPath, inflationConfig, 'utf8')

        console.log('')
        console.log(chalk.green("Export done to: " + outputPath))
    }

    protected readCSV(
        filePath: string,
        skipHeader: boolean
    ): Array<InflationRow>
    {
        let data: Array<InflationRow> = [];

        // read file content and process rows
        const fileCSV = fs.readFileSync(filePath, 'utf8');
        const rowsCSV = fileCSV.split('\r\n');

        if (skipHeader === true) {
            rowsCSV.shift()
        }

        while (rowsCSV.length) {
            const raw = rowsCSV.shift();

            const columns: string[] = raw.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

            if (!columns) {
                continue
            }

            data.push({
                reductionNumber: columns[0],
                yearsPostLaunch: columns[1],
                daysSincePrev: columns[2],
                dateStarting: columns[3],
                blockReward: columns[4].replace(/,"/g, '').replace(/"/g, ''),
                blockRewardPc: columns[5],
                startingAtBlock: columns[6].replace(/,/g, '').replace(/"/g, ''),
                totalProduced: columns[7],
                regression: columns[8],
                quarter: columns[9],
                year: columns[10],
                oneYearProduced: columns[11],
                pcSupplyHarvested: columns[12],
                pcSupplyRemaining: columns[13],
                pcBTCSupplyMined: columns[14],
                pcBTCSupplyRemaining: columns[15],
                reservedEmpty: columns[16],
                catBudget: columns[17],
            })
        }

        return data;
    }

}
