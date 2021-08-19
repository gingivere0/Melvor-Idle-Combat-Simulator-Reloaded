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

    const reqs = [];

    const setup = () => {

        const MICSR = window.MICSR;

        // over write CombatLoot
        CombatLoot = class {
            constructor() {
            }

            add() {
            }

            removeAll() {
            }
        }
        /**
         * SimManager class, allows creation of a functional Player object without affecting the game
         */
        MICSR.SimManager = class extends CombatManager {
            constructor() {
                super();
                this.player = new MICSR.SimPlayer(this);
                this.detachGlobals();
                this.replaceGlobals();
            }

            initialize() {
                super.initialize();
                this.renderCombat = false;
                this.isSlayerTask = false;
            }

            // detach globals attached by parent constructor
            detachGlobals() {
                this.bank = {
                    addItem: () => true,
                    checkForItems: () => true,
                    consumeItems: () => {
                    },
                    getQty: () => 1e6,
                };
            }

            addItemStat() {
            }

            addMonsterStat() {
            }

            addCombatStat() {
            }

            onSelection() {
                this.loadNextEnemy();
            }

            setCallbacks() {
            }

            // replace globals with properties
            replaceGlobals() {
                this.resetSimStats();
            }

            // don't render anything
            render() {
            }

            // reset sim stats
            resetSimStats() {
                this.tickCount = 0;
                this.simStats = {
                    killCount: 0,
                    deathCount: 0,
                }
                this.player.resetGains();
            }

            getSimStats() {
                return {
                    monsterID: this.selectedMonster,
                    tickCount: this.tickCount,
                    ...this.simStats,
                    gainsPerSecond: this.player.getGainsPerSecond(this.tickCount),
                };
            }

            // track kills and deaths
            onPlayerDeath() {
                this.player.processDeath();
                this.simStats.deathCount++;
            }

            onEnemyDeath() {
                this.player.rewardGPForKill();
                if (this.areaData.type === 'Dungeon') {
                    this.progressDungeon();
                } else {
                    this.rewardForEnemyDeath();
                }
                // from baseManager
                this.enemy.processDeath();
                this.simStats.killCount++;
            }

            progressDungeon() {
                this.dungeonProgress++;
                if (this.areaData.dropBones)
                    this.dropEnemyBones();
                if (this.dungeonProgress === this.areaData.monsters.length) {
                    this.dungeonProgress = 0;
                    const lootQty = rollPercentage(this.player.modifiers.combatLootDoubleChance) ? 2 : 1;
                    this.areaData.rewards.forEach((itemID) => {
                        this.bank.addItem(itemID, lootQty);
                    });
                    this.dropEnemyGP();
                    this.dropSignetHalfB();
                    if (this.player.modifiers.bonusCoalOnDungeonCompletion) {
                        if (rollPercentage(1))
                            this.bank.addItem(CONSTANTS.item.Coal_Ore, this.player.modifiers.bonusCoalOnDungeonCompletion);
                    }
                    // TODO: handle ITM gear change
                }
            }

            rewardForEnemyDeath() {
                this.dropEnemyBones();
                this.dropSignetHalfB();
                this.dropEnemyLoot();
                this.dropEnemyGP();
                let slayerXPReward = this.enemy.data.slayerXP | 0;
                if (this.onSlayerTask) {
                    this.player.rewardSlayerCoins();
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier;
                }
                if (slayerXPReward > 0)
                    this.player.addXP(CONSTANTS.skill.Slayer, slayerXPReward);
            }

            runTrials(trials, tickLimit) {
                this.resetSimStats();
                const startTimeStamp = performance.now();
                while (this.simStats.killCount + this.simStats.deathCount < trials && this.tickCount < tickLimit) {
                    this.tick();
                }
                const processingTime = performance.now() - startTimeStamp;
                MICSR.log(`Took ${processingTime / 1000}s to process ${this.simStats.killCount} kills and ${this.simStats.deathCount} deaths in ${this.tickCount} ticks. ${processingTime / this.tickCount}ms per tick.`);
                return this.getSimStats();
            }

            get onSlayerTask() {
                return this.isSlayerTask && this.areaType !== 'Dungeon' && this.areaType !== 'None';
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
    waitLoadOrder(reqs, setup, 'SimManager');

})();