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

(() => {

    const reqs = [
        'statNames',
        'SimEnemy',
        'SimManager',
        'SimPlayer',
    ];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * Simulator class, used for all simulation work, and storing simulation results and settings
         */
        MICSR.Simulator = class {
            /**
             *
             * @param {McsApp} parent Reference to container class
             * @param {string} workerURL URL to simulator web worker
             */
            constructor(parent, workerURL) {
                this.parent = parent;
                // Simulation settings
                /** @type {boolean[]} */
                this.monsterSimFilter = [];
                /** @type {boolean[]} */
                this.dungeonSimFilter = [];
                this.slayerSimFilter = [];
                // not simulated reason
                this.notSimulatedReason = 'entity not simulated';
                // Simulation data;
                /** @type {Object} */
                const newSimData = isMonster => {
                    const data = {
                        simSuccess: false,
                        reason: this.notSimulatedReason,
                    };
                    if (isMonster) {
                        data.inQueue = false;
                        data.petRolls = {other: []};
                    }
                    return data
                }
                this.monsterSimData = {};
                for (let monsterID = 0; monsterID < MONSTERS.length; monsterID++) {
                    this.monsterSimData[monsterID] = newSimData(true);
                    this.monsterSimFilter.push(true);
                }
                /** @type {MonsterSimResult[]} */
                this.dungeonSimData = [];
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    this.dungeonSimData.push(newSimData(false));
                    this.dungeonSimFilter.push(true);
                    MICSR.dungeons[dungeonID].monsters.forEach(monsterID => {
                        const simID = this.simID(monsterID, dungeonID);
                        if (!this.monsterSimData[simID]) {
                            this.monsterSimData[simID] = newSimData(true);
                        }
                    });
                }
                //
                this.slayerTaskMonsters = [];
                this.slayerSimData = [];
                for (let taskID = 0; taskID < SlayerTask.data.length; taskID++) {
                    this.slayerTaskMonsters.push([]);
                    this.slayerSimData.push(newSimData(false));
                    this.slayerSimFilter.push(true);
                }
                /** Variables of currently stored simulation */
                this.currentSim = this.initCurrentSim();
                // Options for time multiplier
                this.selectedPlotIsTime = true;
                this.selectedPlotScales = true;
                // Test Settings
                this.isTestMode = false;
                this.testMax = 10;
                this.testCount = 0;
                // Simulation queue and webworkers
                this.workerURL = workerURL;
                this.currentJob = 0;
                this.simInProgress = false;
                /** @type {SimulationJob[]} */
                this.simulationQueue = [];
                /** @type {SimulationWorker[]} */
                this.simulationWorkers = [];
                this.maxThreads = window.navigator.hardwareConcurrency;
                this.simStartTime = 0;
                /** If the current sim has been cancelled */
                this.simCancelled = false;
                // Create Web workers
                this.createWorkers();
            }

            /**
             * Initializes a performance test
             * @param {number} numSims number of simulations to run in a row
             * @memberof McsSimulator
             */
            runTest(numSims) {
                this.testCount = 0;
                this.isTestMode = true;
                this.testMax = numSims;
                this.simulateCombat(false);
            }

            /**
             * Creates the webworkers for simulation jobs
             */
            async createWorkers() {
                for (let i = 0; i < this.maxThreads; i++) {
                    const worker = await this.createWorker();
                    this.intializeWorker(worker, i);
                    const newWorker = {
                        worker: worker,
                        inUse: false,
                        selfTime: 0,
                    };
                    this.simulationWorkers.push(newWorker);
                }
            }

            /**
             * Attempts to create a web worker, if it fails uses a chrome hack to get a URL that works
             * @return {Promise<Worker>}
             */
            createWorker() {
                return new Promise((resolve, reject) => {
                    let newWorker;
                    try {
                        newWorker = new Worker(this.workerURL);
                        resolve(newWorker);
                    } catch (error) {
                        // Chrome Hack
                        if (error.name === 'SecurityError' && error.message.includes('Failed to construct \'Worker\': Script')) {
                            const workerContent = new XMLHttpRequest();
                            workerContent.open('GET', this.workerURL);
                            workerContent.send();
                            workerContent.addEventListener('load', (event) => {
                                const blob = new Blob([event.currentTarget.responseText], {type: 'application/javascript'});
                                this.workerURL = URL.createObjectURL(blob);
                                resolve(new Worker(this.workerURL));
                            });
                        } else { // Other Error
                            reject(error);
                        }
                    }
                });
            }

            /**
             * Intializes a simulation worker
             * @param {Worker} worker
             * @param {number} i
             */
            intializeWorker(worker, i) {
                // clone data without DOM references or functions
                const equipmentSlotDataClone = {};
                for (const slot in equipmentSlotData) {
                    equipmentSlotDataClone[slot] = {
                        ...equipmentSlotData[slot],
                        imageElements: [],
                        qtyElements: [],
                        tooltips: [],
                    }
                }
                const modifierDataClone = {};
                for (const slot in modifierData) {
                    modifierDataClone[slot] = {
                        ...modifierData[slot],
                        format: '',
                    }
                }
                // constants
                const constantNames = [
                    // actual constants
                    {name: 'afflictionEffect', data: afflictionEffect},
                    {name: 'agilityObstacles', data: agilityObstacles},
                    {name: 'agilityPassivePillars', data: agilityPassivePillars},
                    {name: 'ANCIENT', data: ANCIENT},
                    {name: 'attacks', data: attacks},
                    {name: 'attacksIDMap', data: attacksIDMap},
                    {name: 'attackStyles', data: attackStyles},
                    {name: 'AttackStyles', data: AttackStyles},
                    {name: 'AURORAS', data: AURORAS},
                    {name: 'burnEffect', data: burnEffect},
                    {name: 'combatAreas', data: combatAreas},
                    {
                        name: 'combatMenus', data: {
                            progressBars: {},
                        }
                    },
                    {name: 'combatPassives', data: combatPassives},
                    {name: 'combatSkills', data: combatSkills},
                    {name: 'combatTriangle', data: combatTriangle},
                    {name: 'combinations', data: combinations},
                    {name: 'conditionalModifiers', data: conditionalModifiers},
                    {name: 'CONSTANTS', data: CONSTANTS},
                    {name: 'CURSES', data: CURSES},
                    {name: 'DotTypeIDs', data: DotTypeIDs},
                    {name: 'DUNGEONS', data: DUNGEONS},
                    {name: 'emptyFood', data: emptyFood},
                    {name: 'enemyHTMLElements', data: {}},
                    {name: 'emptyItem', data: emptyItem},
                    {name: 'enemyNoun', data: enemyNoun},
                    {name: 'EquipmentSlots', data: EquipmentSlots},
                    {name: 'equipmentSlotData', data: equipmentSlotDataClone},
                    {name: 'formatNumberSetting', data: formatNumberSetting},
                    {name: 'GAMEMODES', data: GAMEMODES},
                    {name: 'gp', data: 1e9}, // required for confetti crossbow
                    {name: 'herbloreItemData', data: herbloreItemData},
                    {name: 'markOfDeathEffect', data: markOfDeathEffect},
                    {name: 'items', data: items},
                    {name: 'modifierData', data: modifierDataClone},
                    {name: 'MONSTERS', data: MONSTERS},
                    {name: 'PETS', data: PETS},
                    {name: 'playerHTMLElements', data: {}},
                    {name: 'poisonEffect', data: poisonEffect},
                    {name: 'PRAYER', data: PRAYER},
                    {
                        name: 'SETTINGS', data: {
                            performance: {},
                        }
                    },
                    {name: 'SHOP', data: SHOP},
                    {name: 'skillName', data: skillName},
                    {name: 'SKILLS', data: SKILLS},
                    {name: 'slayerAreas', data: slayerAreas},
                    {name: 'slayerTaskData', data: SlayerTask.data},
                    {name: 'SPELLS', data: SPELLS},
                    {name: 'stackingEffects', data: stackingEffects},
                    {name: 'Stats', data: {}},
                    {name: 'SUMMONING', data: SUMMONING},
                    {name: 'summoningData', data: summoningData},
                    {name: 'summoningItems', data: summoningItems},
                    {name: 'synergyElements', data: {}},
                    {name: 'TICK_INTERVAL', data: TICK_INTERVAL},
                    {name: 'unknownArea', data: unknownArea},
                    {name: 'youNoun', data: youNoun},
                    // character settings  // TODO: sim setting
                    {name: 'currentGamemode', data: currentGamemode},
                    {name: 'numberMultiplier', data: numberMultiplier},
                    // character data // TODO: wipe these from SimPlayer
                    {name: 'bank', data: []},
                    {name: 'bankCache', data: {}},
                    {
                        name: 'itemStats', data: itemStats.map(_ => {
                            return {stats: []};
                        })
                    },
                    {name: 'skillLevel', data: skillLevel},
                    {name: 'petUnlocked', data: petUnlocked},
                ];
                const constants = {};
                constantNames.forEach(constant =>
                    constants[constant.name] = constant.data
                );
                // functions
                const functionNames = [
                    // global functions
                    {name: 'applyModifier', data: applyModifier},
                    {
                        name: 'checkRequirements', data: (...args) => {/*console.log('checkRequirements', ...args); */
                            return true;
                        }
                    }, // TODO: what calls this? It should call SimPlayer.checkRequirements
                    {name: 'clampValue', data: clampValue},
                    {name: 'damageReducer', data: damageReducer},
                    {name: 'formatNumber', data: formatNumber},
                    {name: 'getAttackFromID', data: getAttackFromID},
                    {name: 'getBankId', data: getBankId},
                    {name: 'getBaseSummoningXP', data: getBaseSummoningXP},
                    {name: 'getDamageRoll', data: getDamageRoll},
                    {name: 'getMonsterArea', data: getMonsterArea},
                    {name: 'getMonsterCombatLevel', data: getMonsterCombatLevel},
                    {name: 'getNumberMultiplierValue', data: getNumberMultiplierValue},
                    {name: 'getSummonSynergyEnemyModifiers', data: getSummonSynergyEnemyModifiers},
                    {name: 'isEquipment', data: isEquipment},
                    {name: 'isFood', data: isFood},
                    {name: 'isSeedItem', data: isSeedItem},
                    {name: 'isSkillEntry', data: isSkillEntry},
                    {name: 'isSkillLocked', data: isSkillLocked},
                    {name: 'isWeapon', data: isWeapon},
                    {name: 'maxDamageReducer', data: maxDamageReducer},
                    {name: 'numberWithCommas', data: numberWithCommas},
                    {name: 'rollInteger', data: rollInteger},
                    {name: 'rollPercentage', data: rollPercentage},
                    // MICSR functions
                    {
                        name: 'MICSR.addAgilityModifiers',
                        data: `MICSR.addAgilityModifiers = ${MICSR.addAgilityModifiers}`
                    },
                    {
                        name: 'MICSR.getModifierValue',
                        data: `MICSR.getModifierValue = ${MICSR.getModifierValue}`
                    },
                ];
                const functions = {};
                functionNames.forEach(func => {
                    functions[func.name] = `${func.name} = ${func.data.toString().replace(`function ${func.name}`, 'function')}`;
                });
                // classes
                const classNames = [
                    {name: 'BankHelper', data: BankHelper},
                    {name: 'CharacterStats', data: CharacterStats},
                    {name: 'CombatLoot', data: CombatLoot},
                    {name: 'DataReader', data: DataReader},
                    {name: 'Equipment', data: Equipment},
                    {name: 'EquipmentStats', data: EquipmentStats},
                    {name: 'EquippedFood', data: EquippedFood},
                    {name: 'EquipSlot', data: EquipSlot},
                    {name: 'MICSR.ShowModifiers', data: MICSR.ShowModifiers},
                    {name: 'NotificationQueue', data: NotificationQueue},
                    {name: 'TargetModifiers', data: TargetModifiers},
                    {name: 'Timer', data: Timer},
                    {name: 'SlayerTask', data: SlayerTask},
                    {name: 'SplashManager', data: SplashManager},
                    // PlayerModifiers extends CombatModifiers
                    {name: 'CombatModifiers', data: CombatModifiers},
                    {name: 'PlayerModifiers', data: PlayerModifiers},
                    // SimManager extends CombatManager extends BaseManager
                    {name: 'BaseManager', data: BaseManager},
                    {name: 'CombatManager', data: CombatManager},
                    {name: 'MICSR.SimManager', data: MICSR.SimManager},
                    // SimPlayer extends Player extends Character
                    // SimEnemy extends Enemy extends Character
                    {name: 'Character', data: Character},
                    {name: 'Player', data: Player},
                    {name: 'MICSR.SimPlayer', data: MICSR.SimPlayer},
                    {name: 'Enemy', data: Enemy},
                    {name: 'MICSR.SimEnemy', data: MICSR.SimEnemy},
                ];
                const classes = {};
                classNames.forEach(clas => {
                    const s = clas.data.toString()
                        // remove class name
                        .replace(`class ${clas.name}`, 'class')
                        // remove logging from CombatManager constructor
                        .replace(`console.log('Combat Manager Built...');`, '')
                        // fix Character bug
                        //TODO: remove this when Character.applyDOT no longer refers to the global combatManager object
                        .replace('combatManager', 'this.manager');
                    classes[clas.name] = `${clas.name} = ${s}`;
                });
                // worker
                worker.onmessage = (event) => this.processWorkerMessage(event, i);
                worker.onerror = (event) => {
                    MICSR.log('An error occured in a simulation worker');
                    MICSR.log(event);
                };
                worker.postMessage({
                    action: 'RECEIVE_GAMEDATA',
                    // constants
                    constantNames: constantNames.map(x => x.name),
                    constants: constants,
                    // functions
                    functionNames: functionNames.map(x => x.name),
                    functions: functions,
                    // classes
                    classNames: classNames.map(x => x.name),
                    classes: classes,
                });
            }

            /**
             * Iterate through all the combatAreas and MICSR.dungeons to create a set of monsterSimData and dungeonSimData
             */
            simulateCombat(single) {
                this.setupCurrentSim(single);
                // Start simulation workers
                document.getElementById('MCS Simulate All Button').textContent = `Cancel (0/${this.simulationQueue.length})`;
                this.initializeSimulationJobs();
            }

            initCurrentSim() {
                return {
                    options: {
                        trials: MICSR.trials,
                    },
                }
            }

            simID(monsterID, dungeonID) {
                if (dungeonID === undefined) {
                    return monsterID;
                }
                return `${dungeonID}-${monsterID}`
            }

            pushMonsterToQueue(monsterID, dungeonID) {
                const simID = this.simID(monsterID, dungeonID);
                if (!this.monsterSimData[simID].inQueue) {
                    this.monsterSimData[simID].inQueue = true;
                    this.simulationQueue.push({monsterID: monsterID, dungeonID: dungeonID});
                }
            }

            resetSingleSimulation() {
                // clear queue
                this.simulationQueue = [];
                this.resetSimDone();
                // check selection
                if (!this.parent.barSelected) {
                    this.parent.notify('There is nothing selected!', 'danger');
                    return {};
                }
                // area monster
                if (!this.parent.isViewingDungeon && this.parent.barIsMonster(this.parent.selectedBar)) {
                    const monsterID = this.parent.barMonsterIDs[this.parent.selectedBar];
                    if (this.monsterSimFilter[monsterID]) {
                        this.pushMonsterToQueue(monsterID);
                    } else {
                        this.parent.notify('The selected monster is filtered!', 'danger');
                    }
                    return {};
                }
                // dungeon
                let dungeonID = undefined;
                if (!this.parent.isViewingDungeon && this.parent.barIsDungeon(this.parent.selectedBar)) {
                    dungeonID = this.parent.barMonsterIDs[this.parent.selectedBar];
                } else if (this.parent.isViewingDungeon && this.parent.viewedDungeonID < MICSR.dungeons.length) {
                    dungeonID = this.parent.viewedDungeonID;
                }
                if (dungeonID !== undefined) {
                    if (this.dungeonSimFilter[dungeonID]) {
                        MICSR.dungeons[dungeonID].monsters.forEach(monsterID => {
                            this.pushMonsterToQueue(monsterID, dungeonID);
                        });
                        return {dungeonID: dungeonID};
                    }
                    this.parent.notify('The selected dungeon is filtered!', 'danger');
                    return {};
                }
                // slayer area
                let taskID = undefined;
                if (!this.parent.isViewingDungeon && this.parent.barIsTask(this.parent.selectedBar)) {
                    taskID = this.parent.barMonsterIDs[this.parent.selectedBar] - MICSR.dungeons.length;
                } else if (this.parent.isViewingDungeon && this.parent.viewedDungeonID >= MICSR.dungeons.length) {
                    taskID = this.parent.viewedDungeonID - MICSR.dungeons.length;
                }
                if (taskID !== undefined) {
                    if (this.slayerSimFilter[taskID]) {
                        this.queueSlayerTask(taskID);
                        return {taskID: taskID};
                    }
                    this.parent.notify('The selected task list is filtered!', 'danger');
                    return {};
                }
                // can't be reached
                return {};
            }

            queueSlayerTask(i) {
                const task = SlayerTask.data[i];
                this.slayerTaskMonsters[i] = [];
                if (!this.slayerSimFilter[i]) {
                    return;
                }
                const minLevel = task.minLevel;
                const maxLevel = task.maxLevel === -1 ? 6969 : task.maxLevel;
                for (let monsterID = 0; monsterID < MONSTERS.length; monsterID++) {
                    // check if it is a slayer monster
                    if (!MONSTERS[monsterID].canSlayer) {
                        continue;
                    }
                    // check if combat level fits the current task type
                    const cbLevel = getMonsterCombatLevel(monsterID);
                    if (cbLevel < minLevel || cbLevel > maxLevel) {
                        continue;
                    }
                    // check if the area is accessible, this only works for auto slayer
                    // without auto slayer you can get some tasks for which you don't wear/own the gear
                    let area = getMonsterArea(monsterID);
                    if (!this.parent.player.checkRequirements(area.entryRequirements)) {
                        continue;
                    }
                    // all checks passed
                    this.pushMonsterToQueue(monsterID);
                    this.slayerTaskMonsters[i].push(monsterID);
                }
            }

            resetSimulationData(single) {
                // Reset the simulation status of all enemies
                this.resetSimDone();
                // Set up simulation queue
                this.simulationQueue = [];
                if (single) {
                    this.currentSim.ids = this.resetSingleSimulation();
                    return;
                }
                // Queue simulation of monsters in combat areas
                combatAreas.forEach((area) => {
                    area.monsters.forEach((monsterID) => {
                        if (this.monsterSimFilter[monsterID]) {
                            this.pushMonsterToQueue(monsterID);
                        }
                    });
                });
                // Wandering Bard
                const bardID = 139;
                if (this.monsterSimFilter[bardID]) {
                    this.pushMonsterToQueue(bardID);
                }
                // Queue simulation of monsters in slayer areas
                slayerAreas.forEach((area) => {
                    if (!this.parent.player.checkRequirements(area.entryRequirements)) {
                        const tryToSim = area.monsters.reduce((sim, monsterID) => (this.monsterSimFilter[monsterID] && !this.monsterSimData[monsterID].inQueue) || sim, false);
                        if (tryToSim) {
                            this.parent.notify(`Can't access ${area.name}`, 'danger');
                            area.monsters.forEach(monsterID => {
                                this.monsterSimData[monsterID].reason = 'cannot access area';
                            });
                        }
                        return;
                    }
                    area.monsters.forEach((monsterID) => {
                        if (this.monsterSimFilter[monsterID]) {
                            this.pushMonsterToQueue(monsterID);
                        }
                    });
                });
                // Queue simulation of monsters in dungeons
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    if (this.dungeonSimFilter[dungeonID]) {
                        for (let j = 0; j < MICSR.dungeons[dungeonID].monsters.length; j++) {
                            const monsterID = MICSR.dungeons[dungeonID].monsters[j];
                            this.pushMonsterToQueue(monsterID, dungeonID);
                        }
                    }
                }
                // Queue simulation of monsters in slayer tasks
                for (let taskID = 0; taskID < this.slayerTaskMonsters.length; taskID++) {
                    this.queueSlayerTask(taskID);
                }
            }

            /**
             * Setup currentsim variables
             */
            setupCurrentSim(single) {
                this.simStartTime = performance.now();
                this.simCancelled = false;
                this.currentSim = this.initCurrentSim();
                // reset and setup sim data
                this.resetSimulationData(single);
            }

            combineReasons(data, monsterIDs, dungeonID) {
                let reasons = [];
                for (const monsterID of monsterIDs) {
                    const simID = this.simID(monsterID, dungeonID);
                    if (!this.monsterSimData[simID].simSuccess) {
                        data.simSuccess = false;
                    }
                    const reason = this.monsterSimData[simID].reason;
                    if (reason && !reasons.includes(reason)) {
                        reasons.push(reason);
                    }
                }
                if (reasons.length) {
                    data.reason = reasons.join(', ');
                    return true;
                }
                data.reason = undefined;
                return false;
            }

            computeAverageSimData(filter, data, monsterIDs, dungeonID) {
                // check filter
                if (!filter) {
                    data.simSuccess = false;
                    data.reason = 'entity filtered';
                    return;
                }
                // combine failure reasons, if any
                this.combineReasons(data, monsterIDs, dungeonID);
                data.simSuccess = true;

                // not time-weighted averages
                data.deathRate = 0;
                data.highestDamageTaken = 0;
                data.lowestHitpoints = Infinity;
                data.killTimeS = 0;
                data.simulationTime = 0;
                for (const monsterID of monsterIDs) {
                    const simID = this.simID(monsterID, dungeonID);
                    data.simSuccess &&= this.monsterSimData[simID].simSuccess;
                    data.deathRate = 1 - (1 - data.deathRate) * (1 - this.monsterSimData[simID].deathRate);
                    data.highestDamageTaken = Math.max(data.highestDamageTaken, this.monsterSimData[simID].highestDamageTaken);
                    data.lowestHitpoints = Math.min(data.lowestHitpoints, this.monsterSimData[simID].lowestHitpoints);
                    data.killTimeS += this.monsterSimData[simID].killTimeS;
                    data.simulationTime += this.monsterSimData[simID].simulationTime;
                }
                data.killsPerSecond = 1 / data.killTimeS;

                // time-weighted averages
                const computeAvg = (tag) => {
                    data[tag] = monsterIDs.map(monsterID => this.monsterSimData[this.simID(monsterID, dungeonID)])
                        .reduce((avgData, mData) => avgData + mData[tag] * mData.killTimeS, 0) / data.killTimeS;
                }
                [
                    // xp rates
                    'xpPerSecond',
                    'hpXpPerSecond',
                    'slayerXpPerSecond',
                    'prayerXpPerSecond',
                    'summoningXpPerSecond',
                    // consumables
                    'ppConsumedPerSecond',
                    'ammoUsedPerSecond',
                    'runesUsedPerSecond',
                    'combinationRunesUsedPerSecond',
                    'potionsUsedPerSecond',
                    'tabletsUsedPerSecond',
                    'atePerSecond',
                    // survivability
                    // 'deathRate',
                    // 'highestDamageTaken',
                    // 'lowestHitpoints',
                    // kill time
                    // 'killTimeS',
                    // 'killsPerSecond',
                    // loot gains
                    'baseGpPerSecond',
                    'dropChance',
                    'signetChance',
                    'petChance',
                    'slayerCoinsPerSecond',
                    // unsorted
                    'dmgPerSecond',
                    'attacksMadePerSecond',
                    'attacksTakenPerSecond',
                    // 'simulationTime',
                ].forEach(tag => computeAvg(tag));

                // average rune breakdown
                data.usedRunesBreakdown = {};
                monsterIDs.map(monsterID =>
                    this.monsterSimData[this.simID(monsterID, dungeonID)]
                ).forEach(mData => {
                    for (const runeID in mData.usedRunesBreakdown) {
                        if (data.usedRunesBreakdown[runeID] === undefined) {
                            data.usedRunesBreakdown[runeID] = 0;
                        }
                        data.usedRunesBreakdown[runeID] += mData.usedRunesBreakdown[runeID] * mData.killTimeS / data.killTimeS;
                    }
                });
            }

            /** Performs all data analysis post queue completion */
            performPostSimAnalysis(first = false) {
                // Perform calculation of dungeon stats
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    this.computeAverageSimData(this.dungeonSimFilter[dungeonID], this.dungeonSimData[dungeonID], MICSR.dungeons[dungeonID].monsters, dungeonID);
                }
                for (let slayerTaskID = 0; slayerTaskID < this.slayerTaskMonsters.length; slayerTaskID++) {
                    this.computeAverageSimData(this.slayerSimFilter[slayerTaskID], this.slayerSimData[slayerTaskID], this.slayerTaskMonsters[slayerTaskID]);
                    // correct average kps for auto slayer
                    this.slayerSimData[slayerTaskID].killsPerSecond *= this.slayerTaskMonsters[slayerTaskID].length;
                }
                // correct average kill time for auto slayer
                for (let slayerTaskID = 0; slayerTaskID < this.slayerTaskMonsters.length; slayerTaskID++) {
                    this.slayerSimData[slayerTaskID].killTimeS /= this.slayerTaskMonsters[slayerTaskID].length;
                }
                // scale
                this.parent.consumables.update();
                // Update other data
                this.parent.loot.update();
                // log time and save result
                if (first) {
                    MICSR.log(`Elapsed Simulation Time: ${performance.now() - this.simStartTime}ms`);
                    // store simulation
                    if (this.parent.trackHistory) {
                        const monsterSimData = {};
                        for (const id in this.monsterSimData) {
                            monsterSimData[id] = {...this.monsterSimData[id]};
                        }
                        const save = {
                            settings: this.parent.import.exportSettings(),
                            export: '',
                            monsterSimData: monsterSimData,
                            dungeonSimData: this.dungeonSimData.map(x => {
                                return {...x};
                            }),
                            slayerSimData: this.slayerSimData.map(x => {
                                return {...x};
                            }),
                        }
                        save.export = JSON.stringify(save.settings, null, 1);
                        this.parent.savedSimulations.push(save);
                        this.parent.createCompareCard();
                    }
                }
            }

            /** Starts processing simulation jobs */
            initializeSimulationJobs() {
                if (!this.simInProgress) {
                    if (this.simulationQueue.length > 0) {
                        this.simInProgress = true;
                        this.currentJob = 0;
                        for (let i = 0; i < this.simulationWorkers.length; i++) {
                            this.simulationWorkers[i].selfTime = 0;
                            if (i < this.simulationQueue.length) {
                                this.startJob(i);
                            } else {
                                break;
                            }
                        }
                    } else {
                        this.performPostSimAnalysis(true);
                        this.parent.updateDisplayPostSim();
                    }
                }
            }

            /** Starts a job for a given worker
             * @param {number} workerID
             */
            startJob(workerID) {
                if (this.currentJob < this.simulationQueue.length && !this.simCancelled) {
                    const monsterID = this.simulationQueue[this.currentJob].monsterID;
                    const dungeonID = this.simulationQueue[this.currentJob].dungeonID;
                    this.simulationWorkers[workerID].worker.postMessage({
                        action: 'START_SIMULATION',
                        monsterID: monsterID,
                        dungeonID: dungeonID,
                        simPlayer: this.parent.player.serialize(),
                        trials: MICSR.trials,
                        maxTicks: MICSR.maxTicks,
                    });
                    this.simulationWorkers[workerID].inUse = true;
                    this.currentJob++;
                } else {
                    // Check if none of the workers are in use
                    let allDone = true;
                    this.simulationWorkers.forEach((simWorker) => {
                        if (simWorker.inUse) {
                            allDone = false;
                        }
                    });
                    if (allDone) {
                        this.simInProgress = false;
                        this.performPostSimAnalysis(true);
                        this.parent.updateDisplayPostSim();
                        if (this.isTestMode) {
                            this.testCount++;
                            if (this.testCount < this.testMax) {
                                this.simulateCombat(false);
                            } else {
                                this.isTestMode = false;
                            }
                        }
                        // MICSR.log(this.simulationWorkers);
                    }
                }
            }

            /**
             * Attempts to cancel the currently running simulation and sends a cancelation message to each of the active workers
             */
            cancelSimulation() {
                this.simCancelled = true;
                this.simulationWorkers.forEach((simWorker) => {
                    if (simWorker.inUse) {
                        simWorker.worker.postMessage({action: 'CANCEL_SIMULATION'});
                    }
                });
            }

            /**
             * Processes a message received from one of the simulation workers
             * @param {MessageEvent} event The event data of the worker
             * @param {number} workerID The ID of the worker that sent the message
             */
            processWorkerMessage(event, workerID) {
                // MICSR.log(`Received Message ${event.data.action} from worker: ${workerID}`);
                if (!event.data.simResult.simSuccess) {
                    MICSR.log({...event.data.simResult});
                }
                switch (event.data.action) {
                    case 'FINISHED_SIM':
                        // Send next job in queue to worker
                        this.simulationWorkers[workerID].inUse = false;
                        this.simulationWorkers[workerID].selfTime += event.data.selfTime;
                        // Transfer data into monsterSimData
                        const monsterID = event.data.monsterID;
                        const dungeonID = event.data.dungeonID;
                        const simID = this.simID(monsterID, dungeonID);
                        Object.assign(this.monsterSimData[simID], event.data.simResult);
                        this.monsterSimData[simID].simulationTime = event.data.selfTime;
                        document.getElementById('MCS Simulate All Button').textContent = `Cancel (${this.currentJob - 1}/${this.simulationQueue.length})`;
                        // MICSR.log(event.data.simResult);
                        // Attempt to add another job to the worker
                        this.startJob(workerID);
                        break;
                    case 'ERR_SIM':
                        MICSR.error(event.data.error);
                        break;
                }
            }

            /**
             * Resets the simulation status for each monster
             */
            resetSimDone() {
                for (let simID in this.monsterSimData) {
                    this.monsterSimData[simID].inQueue = false;
                    this.monsterSimData[simID].simSuccess = false;
                    this.monsterSimData[simID].reason = this.notSimulatedReason;
                }
                for (let simID in this.dungeonSimData) {
                    this.dungeonSimData[simID].inQueue = false;
                    this.dungeonSimData[simID].simSuccess = false;
                    this.dungeonSimData[simID].reason = this.notSimulatedReason;
                }
                for (let simID in this.slayerSimData) {
                    this.slayerSimData[simID].inQueue = false;
                    this.slayerSimData[simID].simSuccess = false;
                    this.slayerSimData[simID].reason = this.notSimulatedReason;
                }
            }

            /**
             * Extracts a set of data for plotting that matches the keyValue in monsterSimData and dungeonSimData
             * @param {string} keyValue
             * @return {number[]}
             */
            getDataSet(keyValue) {
                const dataSet = [];
                const isSignet = keyValue === 'signetChance';
                if (!this.parent.isViewingDungeon) {
                    // Compile data from monsters in combat zones
                    this.parent.monsterIDs.forEach(monsterID => {
                        dataSet.push(this.getBarValue(this.monsterSimFilter[monsterID], this.monsterSimData[monsterID], keyValue));
                    });
                    // Perform simulation of monsters in dungeons
                    for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                        dataSet.push(this.getBarValue(this.dungeonSimFilter[dungeonID], this.dungeonSimData[dungeonID], keyValue));
                    }
                    // Perform simulation of monsters in slayer tasks
                    for (let taskID = 0; taskID < this.slayerTaskMonsters.length; taskID++) {
                        dataSet.push(this.getBarValue(this.slayerSimFilter[taskID], this.slayerSimData[taskID], keyValue));
                    }
                } else if (this.parent.viewedDungeonID < MICSR.dungeons.length) {
                    // dungeons
                    const dungeonID = this.parent.viewedDungeonID;
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID) => {
                        const simID = this.simID(monsterID, dungeonID);
                        if (!isSignet) {
                            dataSet.push(this.getBarValue(true, this.monsterSimData[simID], keyValue));
                        } else {
                            dataSet.push(0);
                        }
                    });
                    if (isSignet) {
                        const bossId = MICSR.dungeons[dungeonID].monsters[MICSR.dungeons[dungeonID].monsters.length - 1];
                        const simID = this.simID(bossId, dungeonID);
                        dataSet[dataSet.length - 1] = this.getBarValue(true, this.monsterSimData[simID], keyValue);
                    }
                } else {
                    // slayer tasks
                    const taskID = this.parent.viewedDungeonID - MICSR.dungeons.length;
                    this.slayerTaskMonsters[taskID].forEach(monsterID => {
                        if (!isSignet) {
                            dataSet.push(this.getBarValue(true, this.monsterSimData[monsterID], keyValue));
                        } else {
                            dataSet.push(0);
                        }
                    });
                }
                return dataSet;
            }

            getValue(filter, data, keyValue, scale) {
                if (filter && data.simSuccess) {
                    return this.getAdjustedData(data, keyValue) * this.getTimeMultiplier(data, keyValue, scale);
                }
                return NaN;
            }

            getBarValue(filter, data, keyValue) {
                return this.getValue(filter, data, keyValue, this.selectedPlotScales);
            }

            getTimeMultiplier(data, keyValue, scale) {
                let dataMultiplier = 1;
                if (scale) {
                    dataMultiplier = this.parent.timeMultiplier;
                }
                if (this.parent.timeMultiplier === -1 && scale) {
                    dataMultiplier = this.getAdjustedData(data, 'killTimeS');
                }
                if (keyValue === 'petChance') {
                    dataMultiplier = 1;
                }
                return dataMultiplier;
            }

            getAdjustedData(data, tag) {
                if (this.parent.consumables.applyRates) {
                    if (data.adjustedRates[tag] !== undefined) {
                        return data.adjustedRates[tag];
                    }
                }
                return data[tag];
            }

            getRawData() {
                const dataSet = [];
                if (!this.parent.isViewingDungeon) {
                    // Compile data from monsters in combat zones
                    this.parent.monsterIDs.forEach((monsterID) => {
                        dataSet.push(this.monsterSimData[monsterID]);
                    });
                    // Perform simulation of monsters in dungeons
                    for (let i = 0; i < MICSR.dungeons.length; i++) {
                        dataSet.push(this.dungeonSimData[i]);
                    }
                    // Perform simulation of monsters in slayer tasks
                    for (let i = 0; i < this.slayerTaskMonsters.length; i++) {
                        dataSet.push(this.slayerSimData[i]);
                    }
                } else if (this.parent.viewedDungeonID < MICSR.dungeons.length) {
                    // dungeons
                    const dungeonID = this.parent.viewedDungeonID;
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID) => {
                        dataSet.push(this.monsterSimData[this.simID(monsterID, dungeonID)]);
                    });
                } else {
                    // slayer tasks
                    const taskID = this.parent.viewedDungeonID - MICSR.dungeons.length;
                    this.slayerTaskMonsters[taskID].forEach(monsterID => {
                        dataSet.push(this.monsterSimData[monsterID]);
                    });
                }
                return dataSet;
            }

            /**
             * Finds the monsters/dungeons you can currently fight
             * @return {boolean[]}
             */
            getEnterSet() {
                const enterSet = [];
                // Compile data from monsters in combat zones
                for (let i = 0; i < combatAreas.length; i++) {
                    for (let j = 0; j < combatAreas[i].monsters.length; j++) {
                        enterSet.push(true);
                    }
                }
                // Wandering Bard
                enterSet.push(true);
                // Check which slayer areas we can access with current stats and equipment
                for (const area of slayerAreas) {
                    // push `canEnter` for every monster in this zone
                    for (let j = 0; j < area.monsters.length; j++) {
                        enterSet.push(this.parent.player.checkRequirements(area.entryRequirements));
                    }
                }
                // Perform simulation of monsters in dungeons and auto slayer
                for (let i = 0; i < MICSR.dungeons.length; i++) {
                    enterSet.push(true);
                }
                for (let i = 0; i < this.slayerTaskMonsters.length; i++) {
                    enterSet.push(true);
                }
                return enterSet;
            }
        }
    }

    let loadCounter = 0;
    const waitLoadOrder = (reqs, setup, id) => {
        if (characterSelected && !characterLoading) {
            loadCounter++;
        }
        if (loadCounter > 100) {
            console.log('Failed to load ' + id);
            return;
        }
        // check requirements
        let reqMet = characterSelected && !characterLoading;
        if (window.MICSR === undefined) {
            reqMet = false;
            console.log(id + ' is waiting for the MICSR object');
        } else {
            for (const req of reqs) {
                if (window.MICSR.loadedFiles[req]) {
                    continue;
                }
                reqMet = false;
                // not defined yet: try again later
                if (loadCounter === 1) {
                    window.MICSR.log(id + ' is waiting for ' + req);
                }
            }
        }
        if (!reqMet) {
            setTimeout(() => waitLoadOrder(reqs, setup, id), 50);
            return;
        }
        // requirements met
        window.MICSR.log('setting up ' + id);
        setup();
        // mark as loaded
        window.MICSR.loadedFiles[id] = true;
    }
    waitLoadOrder(reqs, setup, 'Simulator');

})();