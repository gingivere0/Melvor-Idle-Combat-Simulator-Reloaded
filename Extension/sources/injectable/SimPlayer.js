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
        'SimManager'
    ];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * SimPlayer class, allows creation of a functional Player object without affecting the game
         */
        MICSR.SimPlayer = class extends Player {
            constructor(simManager) {
                super(simManager);
                this.detachGlobals();
                this.replaceGlobals();
            }

            // detach globals attached by parent constructor
            detachGlobals() {
                this.splashManager = {
                    add: () => {
                    },
                };
                this.effectRenderer = {
                    queueRemoveAll: () => {
                    },
                    removeEffects: () => {
                    },
                    addStun: () => {
                    },
                    addSleep: () => {
                    },
                    addCurse: () => {
                    },
                    addDOT: () => {
                    },
                    addReflexive: () => {
                    },
                    addStacking: () => {
                    },
                    addModifier: () => {
                    },
                };
                this.statElements = undefined;
                this.attackBar = undefined;
                this.summonBar = undefined;
            }

            setCallbacks() {
            }

            // replace globals with properties
            replaceGlobals() {
                // skillLevel
                this.skillLevel = skillLevel.map(_ => 1);
                this.skillLevel[CONSTANTS.skill.Hitpoints] = 10;
                // TODO: currentGamemode, numberMultiplier
                // gp, skillXP, PETS, slayercoins
                this.resetGains();
            }

            resetGains() {
                this.gp = 0;
                this.skillXP = skillLevel.map(_ => 0);
                this.petRolls = {};
                this._slayercoins = 0;
            }

            getGains() {
                return {
                    gp: this.gp,
                    skillXP: this.skillXP,
                    petRolls: this.petRolls,
                    slayercoins: this.slayercoins,
                }
            }

            addSlayerCoins(amount) {
                amount = applyModifier(amount, this.modifiers.increasedSlayerCoins - this.modifiers.decreasedSlayerCoins, 0);
                this._slayercoins += amount;
            }

            addGP(amount) {
                this.gp += amount;
            }

            addXP(skill, amount) {
                this.skillXP[skill] += this.getSkillXPToAdd(skill, amount);
            }

            getSkillXPToAdd(skill, xp) {
                let xpMultiplier = 1;
                xpMultiplier += this.modifiers.getSkillModifierValue("increasedSkillXP", skill) / 100;
                xpMultiplier -= this.modifiers.getSkillModifierValue("decreasedSkillXP", skill) / 100;
                xpMultiplier += (this.modifiers.increasedGlobalSkillXP - this.modifiers.decreasedGlobalSkillXP) / 100;
                return xp * xpMultiplier;
            }

            rewardXPAndPetsForDamage(damage) {
                damage = damage / numberMultiplier;
                const attackInterval = this.timers.act.maxTicks * TICK_INTERVAL;
                // Combat Style
                this.attackStyle.experienceGain.forEach((gain) => {
                    this.addXP(gain.skill, gain.ratio * damage);
                });
                // Hitpoints
                this.addXP(CONSTANTS.skill.Hitpoints, damage * 1.33);
                // Prayer
                let prayerRatio = 0;
                this.activePrayers.forEach((pID) => {
                    return (prayerRatio += PRAYER[pID].pointsPerPlayer);
                });
                if (prayerRatio > 0) {
                    this.addXP(CONSTANTS.skill.Prayer, prayerRatio * damage);
                }
                // pets
                this.petRolls[attackInterval] = 1 + (this.petRolls[attackInterval] | 0);
            }

            // get skill level from property instead of global `skillLevel`
            getSkillLevel(skillID) {
                return this.skillLevel[skillID];
            }

            // don't render anything
            setRenderAll() {
            }

            render() {
            }

            // don't consume potion charges
            consumePotionCharge(type) {
            }

            reusePotion() {
            }

            // TODO: override
            updateForEquipmentChange() {
            }

            equipItem(itemID, set, slot = "Default", quantity = 1) {
                const equipment = this.equipmentSets[set];
                const itemToEquip = itemID === -1 ? emptyItem : items[itemID];
                if (slot === "Default") {
                    slot = itemToEquip.validSlots[0];
                }
                // clear other slots occupied by current slot
                equipment.slotArray.forEach(x => {
                    if (x.occupiedBy === slot) {
                        x.occupiedBy = "None";
                    }
                });
                equipment.equipItem(itemToEquip, slot, quantity);
            }

            unequipItem(set, slot) {
                const equipment = this.equipmentSets[set];
                equipment.unequipItem(slot);
            }

            equipFood(itemID, quantity) {
            }

            unequipFood() {
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
    waitLoadOrder(reqs, setup, 'SimPlayer');

})();