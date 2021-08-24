/*  Melvor Idle Combat Simulator

    Copyright (C) <2020>  <Coolrox95>
    Modified Copyright (C) <2020> <Visua0>
    Modified Copyright (C) <2020, 2021> <G. Miclotte>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/// <reference path="../typedefs.js" />

(() => {
    // spoof MICSR
    const MICSR = {
        debug: (...args) => console.debug('MICSR:', ...args),
        log: (...args) => console.log('MICSR:', ...args),
        warn: (...args) => console.warn('MICSR:', ...args),
        error: (...args) => console.error('MICSR:', ...args),
    }

    // spoof document
    const document = {
        getElementById() {
        }
    };

    // spoof $ so we get useful information regarding where the bugs are
    const $ = (...args) => console.log(...args);

    /** @type {CombatSimulator} */
    let combatSimulator;

    onmessage = (event) => {
        switch (event.data.action) {
            case 'RECEIVE_GAMEDATA':
                // constants
                event.data.constantNames.forEach(name => {
                    self[name] = event.data.constants[name];
                });
                // functions
                event.data.functionNames.forEach(name => {
                    eval(event.data.functions[name]);
                });
                // classes
                event.data.classNames.forEach(name => {
                    if (event.data.classes[name].match('combatManager')) {
                        //TODO: remove this when Character.applyDOT no longer refers to the global combatManager object
                        event.data.classes[name] = event.data.classes[name].replace('combatManager', 'this.manager');
                        MICSR.warn(`Patched combatManager in ${name}.`);
                    }
                    eval(event.data.classes[name]);
                });
                // create instances
                MICSR.showModifiersInstance = new MICSR.ShowModifiers('', 'MICSR', false);
                SlayerTask.data = self.slayerTaskData;
                combatSimulator = new CombatSimulator();
                break;
            case 'START_SIMULATION':
                const startTime = performance.now();
                //settings
                // run the simulation
                combatSimulator.simulateMonster(
                    event.data.simPlayer,
                    event.data.monsterID,
                    event.data.dungeonID,
                    event.data.trials,
                    event.data.maxTicks,
                ).then((simResult) => {
                    const timeTaken = performance.now() - startTime;
                    postMessage({
                        action: 'FINISHED_SIM',
                        monsterID: event.data.monsterID,
                        dungeonID: event.data.dungeonID,
                        simResult: simResult,
                        selfTime: timeTaken
                    });
                });
                break;
            case 'CANCEL_SIMULATION':
                combatSimulator.cancelSimulation();
                break;
        }
    };

    onerror = (error) => {
        postMessage({
            action: 'ERR_SIM',
            error: error,
        });
    }

    class CombatSimulator {
        constructor() {
            this.cancelStatus = false;
        }

        /**
         * Simulation Method for a single monster
         * @param {SimPlayer} player
         * @param {Object} settings
         * @return {Promise<Object>}
         */
        async simulateMonster(simPlayerData, monsterID, dungeonID, trials, maxTicks) {
            const manager = new MICSR.SimManager();
            const player = manager.player;
            const reader = new DataReader(simPlayerData);
            player.deserialize(reader);
            player.initForWebWorker();
            try {
                return manager.convertSlowSimToResult(manager.runTrials(monsterID, dungeonID, trials, maxTicks), trials);
            } catch (error) {
                MICSR.error(`Error while simulating monster ${monsterID} in dungeon ${dungeonID}: ${error}`);
                return {
                    simSuccess: false,
                    reason: 'simulation error',
                }
            }
        }

        /**
         * Checks if the simulation has been messaged to be cancelled
         * @return {Promise<boolean>}
         */
        async isCanceled() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(this.cancelStatus);
                });
            });
        }

        cancelSimulation() {
            this.cancelStatus = true;
        }
    }
})();