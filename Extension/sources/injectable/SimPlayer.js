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

        /**
         * SimPlayer class, allows creation of a functional Player object without affecting the game
         */
        MICSR.SimPlayer = class extends Player {
            constructor(simManager) {
                super(simManager);
                this.detachGlobals();
                this.replaceGlobals();
                // overwrite food consumption
                this.food.consume = (quantity = 1) => {
                    this.usedFood += quantity;
                }
            }

            // detach globals attached by parent constructor
            detachGlobals() {
                this.splashManager = {
                    add: () => {
                    },
                };
                this.effectRenderer = {
                    queueRemoval: () => {
                    },
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

            addItemStat() {
            }

            trackWeaponStat() {
            }

            setCallbacks() {
            }

            processDeath() {
                this.removeAllEffects(true);
                this.computeAllStats();
                this.setHitpoints(Math.floor(this.stats.maxHitpoints * 0.2));
                while (this.healAfterDeath && this.hitpoints < this.stats.maxHitpoints && this.food.currentSlot.quantity > 0) {
                    this.eatFood();
                }
            }

            // replace globals with properties
            replaceGlobals() {
                // skillLevel
                this.skillLevel = skillLevel.map(_ => 1);
                this.skillLevel[CONSTANTS.skill.Hitpoints] = 10;
                // TODO: currentGamemode, numberMultiplier
                // petUnlocked
                this.petUnlocked = petUnlocked.map(x => false);
                // chosenAgilityObstacles, agility MASTERY, agilityPassivePillarActive
                this.course = Array(10).fill(-1);
                this.courseMastery = Array(10).fill(false);
                this.pillar = -1;
                // herbloreBonuses
                this.potionSelected = false;
                this.potionTier = 0;
                this.potionID = -1;
                // isSynergyUnlocked
                this.summoningSynergy = true;
                // shopItemsPurchased
                this.autoEatTier = -1;
                // cooking MASTERY
                this.cookingPool = false;
                this.cookingMastery = false;
                // useCombinationRunes
                this.useCombinationRunes = false;
                // other
                this.healAfterDeath = true;
                this.isSlayerTask = false;
                // gp, skillXP, PETS, slayercoins
                this.resetGains();
            }

            resetGains() {
                this.gp = 0;
                this.skillXP = skillLevel.map(_ => 0);
                this.petRolls = {};
                this._slayercoins = 0;
                this.usedAmmo = 0;
                this.usedFood = 0;
                this.usedRunes = {};
                this.usedPotionCharges = 0;
                this.usedPrayerPoints = 0;
                this.chargesUsed = {
                    Summon1: 0,
                    Summon2: 0,
                };
                this.highestDamageTaken = 0;
                this.lowestHitpoints = this.stats.maxHitpoints;
                // hack to avoid auto eating infinite birthday cakes
                const autoHealAmt = Math.floor(this.getFoodHealing(this.food.currentSlot.item) * this.autoEatEfficiency / 100);
                this.emptyAutoHeal = this.autoEatThreshold > 0 && autoHealAmt === 0;
                this.hitpoints = this.stats.maxHitpoints;
            }

            getGainsPerSecond(ticks) {
                const seconds = ticks / 20;
                const usedRunesBreakdown = {};
                let usedRunes = 0;
                let usedCombinationRunes = 0;
                for (const id in this.usedRunes) {
                    const amt = this.usedRunes[id] / seconds;
                    usedRunesBreakdown[id] = amt;
                    if (combinations.includes(Number(id))) {
                        usedCombinationRunes += amt;
                    } else {
                        usedRunes += amt;
                    }
                }
                return {
                    gp: this.gp / seconds,
                    skillXP: this.skillXP.map(x => x / seconds),
                    petRolls: this.petRolls,
                    slayercoins: this.slayercoins / seconds,
                    usedAmmo: this.usedAmmo / seconds,
                    usedRunesBreakdown: usedRunesBreakdown,
                    usedRunes: usedRunes,
                    usedCombinationRunes: usedCombinationRunes,
                    usedFood: this.usedFood / seconds,
                    usedPotionCharges: this.usedPotionCharges / seconds,
                    usedPrayerPoints: this.usedPrayerPoints / seconds,
                    usedSummoningCharges: (this.chargesUsed.Summon1 + this.chargesUsed.Summon2) / 2 / seconds,
                    highestDamageTaken: this.highestDamageTaken,
                    lowestHitpoints: this.lowestHitpoints,
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

            addPetModifiers() {
                PETS.forEach((pet, i) => {
                    if (this.petUnlocked[i] && !pet.activeInRaid && pet.modifiers !== undefined) {
                        this.modifiers.addModifiers(pet.modifiers);
                    }
                });
            }

            addConditionalModifiers() {
                [
                    this.bankConditionWatchLists,
                    this.gloveConditionWatchLists,
                ].forEach(watchLists => {
                    watchLists.forEach(conditions => {
                        conditions.forEach((condition) => {
                            // for the combat simulator we always assume the bank and glove conditions are true
                            // instead of skipping the entire conditional, we set condition.active to true in case this is used elsewhere
                            condition.active = true;
                            if (condition.active)
                                this.modifiers.addModifiers(condition.modifiers);
                        });
                    });
                });
            }

            addAgilityModifiers() {
                MICSR.addAgilityModifiers(this.course, this.courseMastery, this.pillar, this.modifiers);
            }

            addShopModifiers() {
                // auto eat modifiers
                for (let tier = 0; tier <= this.autoEatTier; tier++) {
                    this.modifiers.addModifiers(SHOP.General[1 + tier].contains.modifiers);
                }

                // other shop modifiers are not relevant for combat sim at this point
            }

            addSummonSynergyModifiers() {
                if (!this.summoningSynergy) {
                    return;
                }
                const summons = [
                    this.equipment.slots.Summon1.item.summoningID,
                    this.equipment.slots.Summon2.item.summoningID,
                ];
                const synergies = SUMMONING.Synergies[Math.min(...summons)];
                if (!synergies) {
                    return;
                }
                const synergy = synergies[Math.max(...summons)];
                if (!synergy) {
                    return;
                }
                // add the synergy modifiers
                this.modifiers.addModifiers(synergy.modifiers);
            }

            getCurrentSynergy() {
                if (!this.summoningSynergy) {
                    return undefined;
                }
                const summLeft = this.equipmentID(equipmentSlotData.Summon1.id);
                const summRight = this.equipmentID(equipmentSlotData.Summon2.id);
                if (summLeft > 0 && summRight > 0 && summLeft !== summRight) {
                    const min = Math.min(items[summLeft].summoningID, items[summRight].summoningID);
                    const max = Math.max(items[summLeft].summoningID, items[summRight].summoningID);
                    return SUMMONING.Synergies[min][max];
                }
                return undefined;
            }

            equipmentID(slotID) {
                return this.equipment.slotArray[slotID].item.id;
            }

            equipmentIDs() {
                return this.equipment.slotArray.map(x => x.item.id);
            }

            equipmentOccupiedBy(slotID) {
                return this.equipment.slotArray[slotID].occupiedBy;
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
                return Math.min(99, this.skillLevel[skillID]);
            }

            // don't render anything
            setRenderAll() {
            }

            render() {
            }

            getPotion() {
                return items[herbloreItemData[this.potionID].itemID[this.potionTier]];
            }

            // track potion usage instead of consuming
            consumePotionCharge(type) {
                if (this.potionSelected) {
                    const item = this.getPotion();
                    if (type === herbloreItemData[item.masteryID[1]].consumesOn
                        && !rollPercentage(this.modifiers.increasedChanceToPreservePotionCharge - this.modifiers.decreasedChanceToPreservePotionCharge)
                    ) {
                        this.usedPotionCharges++;
                    }
                }
            }

            reusePotion() {
            }

            addPotionModifiers() {
                if (this.potionSelected) {
                    const item = this.getPotion();
                    if (item.modifiers !== undefined) {
                        this.modifiers.addModifiers(item.modifiers);
                    }
                }
            }

            // track prayer point usage instead of consuming
            consumePrayerPoints(amount) {
                if (amount > 0) {
                    amount = this.applyModifiersToPrayerCost(amount);
                    this.consumePotionCharge("PrayerPointCost");
                    this.usedPrayerPoints += amount;
                }
            }

            // track ammo usage instead of consuming
            consumeAmmo() {
                if (!rollPercentage(this.modifiers.ammoPreservationChance)) {
                    this.usedAmmo++;
                }
            }

            //
            getRuneCosts(spell) {
                let runeCost = spell.runesRequired;
                const spellCost = [];
                if (this.useCombinationRunes && spell.runesRequiredAlt !== undefined)
                    runeCost = spell.runesRequiredAlt;
                runeCost.forEach((cost) => {
                    const reducedCost = cost.qty - (this.runesProvided.get(cost.id) | 0);
                    if (reducedCost > 0) {
                        spellCost.push({
                            itemID: cost.id,
                            qty: reducedCost,
                        });
                    }
                });
                return spellCost;
            }

            // track rune usage instead of consuming
            consumeRunes(costs) {
                if (!rollPercentage(this.modifiers.runePreservationChance)) {
                    costs.forEach((cost) => {
                        if (this.usedRunes[cost.itemID] === undefined) {
                            this.usedRunes[cost.itemID] = 0;
                        }
                        this.usedRunes[cost.itemID] += cost.qty;
                    });
                }
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

            equipFood(itemID) {
                if (itemID === -1) {
                    this.unequipFood();
                    return;
                }
                // Unequip previous food
                this.food.unequipSelected();
                // Proceed to equip the food
                this.food.equip(items[itemID], Infinity);
            }

            unequipFood() {
                this.food.unequipSelected();
            }

            getFoodHealingBonus(item) {
                let bonus = this.modifiers.increasedFoodHealingValue - this.modifiers.decreasedFoodHealingValue;
                const sID = CONSTANTS.skill.Cooking;
                if (item.masteryID !== undefined && item.masteryID[0] === sID && this.cookingMastery) {
                    bonus += 20;
                }
                if (this.cookingPool) {
                    bonus += 10;
                }
                return bonus;
            }

            isSynergyActive(summonID1, summonID2) {
                if (!this.isSynergyUnlocked(summonID1, summonID2)) {
                    return false;
                }
                return this.equipment.checkForItemID(summoningItems[summonID1].itemID) && this.equipment.checkForItemID(summoningItems[summonID2].itemID);
            }

            isSynergyUnlocked(summon1, summon2) {
                if (!this.summoningSynergy) {
                    return false;
                }
                const minID = Math.min(summon1, summon2);
                const maxID = Math.max(summon1, summon2);
                return SUMMONING.Synergies[minID] !== undefined && SUMMONING.Synergies[minID][maxID] !== undefined;
            }

            removeSummonCharge(slot, charges = 1) {
                if (!rollPercentage(this.modifiers.increasedSummoningChargePreservation - this.modifiers.decreasedSummoningChargePreservation)) {
                    this.chargesUsed[slot] += charges;
                }
            }

            computeTargetModifiers() {
                this.targetModifiers.reset();
                this.equipment.slotArray.forEach((slot) => {
                    const item = slot.item;
                    if (slot.providesStats) {
                        if (item.enemyModifiers !== undefined) {
                            this.targetModifiers.addModifiers(item.enemyModifiers);
                        }
                    }
                });
                const args = this.getSummoningIDs();
                if (this.isSynergyUnlocked(...args)) {
                    const modifiers = getSummonSynergyEnemyModifiers(...args);
                    this.targetModifiers.addModifiers(modifiers);
                }
                if (this.modifiers.summoningSynergy_1_12 > 0 && this.manager.onSlayerTask) {
                    this.targetModifiers.addModifiers({
                        decreasedGlobalAccuracy: this.modifiers.summoningSynergy_1_12,
                    });
                }
            }

            // get grandparent rollToHit
            get characterRollToHit() {
                return Character.prototype.rollToHit;
            }

            rollToHit(target, attack) {
                return this.checkRequirements(this.manager.areaRequirements) && this.characterRollToHit(target, attack);
            }

            // get grandparent damage
            get characterDamage() {
                return Character.prototype.damage;
            }

            damage(amount, source, thieving = false) {
                this.characterDamage(amount, source);
                this.highestDamageTaken = Math.max(this.highestDamageTaken, amount);
                if (this.hitpoints > 0) {
                    this.autoEat();
                    if (this.hitpoints < (this.stats.maxHitpoints * this.modifiers.increasedRedemptionThreshold) / 100) {
                        this.heal(applyModifier(this.stats.maxHitpoints, this.modifiers.increasedRedemptionPercent));
                    }
                    if (this.hitpoints < (this.stats.maxHitpoints * this.modifiers.increasedCombatStoppingThreshold) / 100) {
                        this.manager.stopCombat();
                    }
                    this.lowestHitpoints = Math.min(this.lowestHitpoints, this.hitpoints);
                }
            }

            autoEat() {
                if (this.emptyAutoHeal) {
                    this.usedFood = Infinity;
                } else {
                    super.autoEat();
                }
            }

            checkRequirements(reqs, notifyOnFailure = false, failureMessage = 'do that.') {
                return reqs.every(req => this.checkRequirement(req, notifyOnFailure, failureMessage));
            }

            checkRequirement(requirement, notifyOnFailure = false, failureMessage = 'do that.') {
                let met = false;
                switch (requirement.type) {
                    case 'Level':
                        met = requirement.levels.every(levelReq => this.skillLevel[levelReq.skill] >= levelReq.level);
                        break;
                    case 'Dungeon':
                        met = true;
                        break;
                    case 'Completion':
                        met = true;
                        break;
                    case 'SlayerItem':
                        met = this.modifiers.bypassSlayerItems > 0 || this.equipment.checkForItemID(requirement.itemID);
                        break;
                }
                return met;
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