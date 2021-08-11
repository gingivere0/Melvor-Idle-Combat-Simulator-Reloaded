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
        'util',
    ];

    const setup = () => {
        const MICSR = window.MICSR;

        /**
         * Class to handle importing
         */
        MICSR.Import = class {

            constructor(app) {
                this.app = app;
            }

            /**
             * Callback for when the import button is clicked
             * @param {number} setID Index of equipmentSets from 0-2 to import
             */
            importButtonOnClick(setID) {
                // get potion
                let potionID = -1;
                let potionTier = -1;
                const itemID = herbloreBonuses[13].itemID;
                if (itemID !== 0) {
                    // Get tier and potionID
                    for (let i = 0; i < herbloreItemData.length; i++) {
                        if (herbloreItemData[i].category === 0) {
                            for (let j = 0; j < herbloreItemData[i].itemID.length; j++) {
                                if (herbloreItemData[i].itemID[j] === itemID) {
                                    potionID = i;
                                    potionTier = j;
                                }
                            }
                        }
                    }
                }
                // get food
                const food = player.food.slots[player.food.selectedSlot].item;
                // get cooking mastery for food
                const foodMastery = food.masteryID;
                const cookingMastery = this.app.combatData.foodSelected && foodMastery && foodMastery[0] === CONSTANTS.skill.Cooking
                    && exp.xp_to_level(MASTERY[CONSTANTS.skill.Cooking].xp[foodMastery[1]]) > 99;

                // get the player's auto eat tier
                let autoEatTier = -1;
                [
                    CONSTANTS.shop.general.Auto_Eat_Tier_I,
                    CONSTANTS.shop.general.Auto_Eat_Tier_II,
                    CONSTANTS.shop.general.Auto_Eat_Tier_III,
                ].forEach(id => {
                    if (shopItemsPurchased.get(`General:${id}`).quantity > 0) {
                        autoEatTier++;
                    }
                });

                // create settings object
                const settings = {
                    equipment: player.equipmentSets[setID].slotArray.map(x => x.occupiedBy === 'None' ? x.item.id : -1),
                    levels: skillXP.map(x => Math.max(1, exp.xp_to_level(x) - 1)),
                    meleeStyle: player.attackStyles.melee,
                    rangedStyle: player.attackStyles.ranged,
                    magicStyle: player.attackStyles.magic,
                    isAncient: player.spellSelection.ancient !== -1,
                    ancient: player.spellSelection.ancient,
                    standard: player.spellSelection.standard,
                    curse: player.spellSelection.curse,
                    aurora: player.spellSelection.aurora,
                    prayerSelected: PRAYER.map((_, i) => [...player.activePrayers].includes(i)),
                    potionID: potionID,
                    potionTier: potionTier,
                    petUnlocked: petUnlocked,
                    autoEatTier: autoEatTier,
                    foodSelected: food.id,
                    cookingPool: getMasteryPoolProgress(CONSTANTS.skill.Cooking) >= 95,
                    cookingMastery: cookingMastery,
                    isSlayerTask: this.app.combatData.isSlayerTask,
                    isHardcore: currentGamemode === 1,
                    isAdventure: currentGamemode === 2,
                    useCombinationRunes: useCombinationRunes,
                    course: chosenAgilityObstacles,
                    courseMastery: MASTERY[CONSTANTS.skill.Agility].xp.map(x => x > 13034431),
                    pillar: agilityPassivePillarActive,
                    summoningSynergy: this.app.combatData.summoningSynergy, // TODO: import mark levels
                };

                // import settings
                this.importSettings(settings);
                // update app and simulator objects
                this.update();
            }

            exportSettings() {
                const courseMastery = {};
                this.app.player.course.forEach((o, i) => courseMastery[o] = this.app.player.courseMastery[i]);
                return {
                    // combatData: this.app.player,
                    // TODO: all these should be in SimPlayer class?
                    // lists
                    equipment: this.app.player.equipment.slotArray.map(x => x.item.id),
                    petUnlocked: [...this.app.player.petUnlocked],
                    course: [...this.app.player.course],
                    // objects
                    levels: {...this.app.player.skillLevel},
                    // simple values
                    meleeStyle: this.app.combatData.attackStyle.Melee,
                    rangedStyle: this.app.combatData.attackStyle.Ranged,
                    magicStyle: this.app.combatData.attackStyle.Magic,
                    isAncient: this.app.combatData.spells.ancient.isSelected,
                    ancient: this.app.combatData.spells.ancient.selectedID,
                    standard: this.app.combatData.spells.standard.selectedID,
                    curse: this.app.combatData.spells.curse.selectedID,
                    aurora: this.app.combatData.spells.aurora.selectedID,
                    prayerSelected: this.app.combatData.prayerSelected,
                    potionID: this.app.combatData.potionID,
                    potionTier: this.app.combatData.potionTier,
                    autoEatTier: this.app.combatData.autoEatTier,
                    foodSelected: this.app.combatData.foodSelected,
                    cookingPool: this.app.combatData.cookingPool,
                    cookingMastery: this.app.combatData.cookingMastery,
                    isSlayerTask: this.app.combatData.isSlayerTask,
                    isHardcore: this.app.combatData.isHardcore,
                    isAdventure: this.app.combatData.isAdventure,
                    useCombinationRunes: this.app.combatData.useCombinationRunes,
                    courseMastery: courseMastery,
                    pillar: this.app.player.pillar,
                    summoningSynergy: this.app.combatData.summoningSynergy,
                }
            }

            importSettings(settings) {
                // import settings
                this.importEquipment(settings.equipment);
                this.importLevels(settings.levels);
                this.importStyle(settings.meleeStyle, settings.rangedStyle, settings.magicStyle);
                this.importSpells(settings.ancient, settings.standard, settings.curse, settings.aurora);
                this.importPrayers(settings.prayerSelected);
                this.importPotion(settings.potionID, settings.potionTier);
                this.importPets(settings.petUnlocked);
                this.importAutoEat(settings.autoEatTier, settings.foodSelected, settings.cookingPool, settings.cookingMastery);
                this.importSlayerTask(settings.isSlayerTask);
                this.importHardCore(settings.isHardcore);
                this.importAdventure(settings.isAdventure);
                this.importUseCombinationRunes(settings.useCombinationRunes);
                this.importAgilityCourse(settings.course, settings.courseMastery, settings.pillar);
                this.importSummoningSynergy(settings.summoningSynergy);
            }

            update() {
                // update and compute values
                this.app.updateSpellOptions();
                this.app.checkForElisAss();
                this.app.updatePrayerOptions();
                this.app.combatData.updateEquipmentStats();
                this.app.updateEquipmentStats();
                this.app.updateCombatStats();
            }

            importEquipment(equipment) {
                this.app.player.equipment.unequipAll();
                MICSR.equipmentSlotKeys.forEach((_, slotID) => {
                    const itemID = equipment[slotID];
                    if (itemID === -1 && this.app.combatData.equipmentOccupiedBy(slotID) !== 'None') {
                        return;
                    }
                    this.app.equipItem(slotID, itemID);
                    this.app.setEquipmentImage(slotID, itemID);
                });
                this.app.updateStyleDropdowns();
            }

            importLevels(levels) {
                this.app.skillKeys.forEach(key => {
                    document.getElementById(`MCS ${key} Input`).value = levels[CONSTANTS.skill[key]];
                });
                this.app.player.skillLevel = [...levels];
            }

            importStyle(meleeStyle, rangedStyle, magicStyle) {
                this.app.combatData.attackStyle.Melee = meleeStyle;
                document.getElementById('MCS Melee Style Dropdown').selectedIndex = meleeStyle;
                this.app.combatData.attackStyle.Ranged = rangedStyle;
                document.getElementById('MCS Ranged Style Dropdown').selectedIndex = rangedStyle;
                this.app.combatData.attackStyle.Magic = magicStyle;
                document.getElementById('MCS Magic Style Dropdown').selectedIndex = magicStyle;
            }

            importSpells(ancient, standard, curse, aurora) {
                // Set all active spell UI to be disabled
                Object.keys(this.app.combatData.spells).forEach((spellType) => {
                    const spellOpts = this.app.combatData.spells[spellType];
                    if (spellOpts.isSelected) {
                        this.app.unselectButton(document.getElementById(`MCS ${spellOpts.array[spellOpts.selectedID].name} Button`));
                    }
                });
                // import spells
                if (ancient !== -1) {
                    this.app.combatData.spells.ancient.isSelected = true;
                    this.app.combatData.spells.ancient.selectedID = ancient;
                    // clear standard and curse
                    this.app.combatData.spells.standard.isSelected = false;
                    this.app.combatData.spells.standard.selectedID = -1;
                    this.app.combatData.spells.curse.isSelected = false;
                    this.app.combatData.spells.curse.selectedID = -1;
                } else {
                    this.app.combatData.spells.standard.isSelected = true;
                    this.app.combatData.spells.standard.selectedID = standard;
                    this.app.combatData.spells.ancient.isSelected = false;
                    this.app.combatData.spells.ancient.selectedID = -1;
                    if (curse !== -1) {
                        this.app.combatData.spells.curse.isSelected = true;
                        this.app.combatData.spells.curse.selectedID = curse;
                    } else {
                        this.app.combatData.spells.curse.isSelected = false;
                        this.app.combatData.spells.curse.selectedID = -1;
                    }
                }
                if (aurora !== -1) {
                    this.app.combatData.spells.aurora.isSelected = true;
                    this.app.combatData.spells.aurora.selectedID = aurora;
                } else {
                    this.app.combatData.spells.aurora.isSelected = false;
                    this.app.combatData.spells.aurora.selectedID = -1;
                }
                // Update spell UI
                Object.values(this.app.combatData.spells).forEach((spellOpts, i) => {
                    if (spellOpts.isSelected) {
                        this.app.selectButton(document.getElementById(`MCS ${spellOpts.array[spellOpts.selectedID].name} Button`));
                        this.app.spellSelectCard.onTabClick(i);
                    }
                });
            }

            importPrayers(prayerSelected) {
                // Update prayers
                this.app.combatData.activePrayers = 0;
                for (let i = 0; i < PRAYER.length; i++) {
                    const prayButton = document.getElementById(`MCS ${this.app.getPrayerName(i)} Button`);
                    if (prayerSelected[i]) {
                        this.app.selectButton(prayButton);
                        this.app.combatData.prayerSelected[i] = true;
                        this.app.combatData.activePrayers++;
                    } else {
                        this.app.unselectButton(prayButton);
                        this.app.combatData.prayerSelected[i] = false;
                    }
                }
            }

            importPotion(potionID, potionTier) {
                // Deselect potion if selected
                if (this.app.combatData.potionSelected) {
                    this.app.unselectButton(document.getElementById(`MCS ${this.app.getPotionName(this.app.combatData.potionID)} Button`));
                    this.app.combatData.potionSelected = false;
                    this.app.combatData.potionID = -1;
                }
                // Select new potion if applicable
                if (potionID !== -1) {
                    this.app.combatData.potionSelected = true;
                    this.app.combatData.potionID = potionID;
                    this.app.selectButton(document.getElementById(`MCS ${this.app.getPotionName(this.app.combatData.potionID)} Button`));
                }
                // Set potion tier if applicable
                if (potionTier !== -1) {
                    this.app.combatData.potionTier = potionTier;
                    this.app.updatePotionTier(potionTier);
                    // Set dropdown to correct option
                    document.getElementById('MCS Potion Tier Dropdown').selectedIndex = potionTier;
                }
            }

            importPets(petUnlocked) {
                // Import PETS
                petUnlocked.forEach((owned, petID) => {
                    this.app.player.petUnlocked[petID] = owned;
                    if (this.app.combatData.petIds.includes(petID)) {
                        if (owned) {
                            this.app.selectButton(document.getElementById(`MCS ${PETS[petID].name} Button`));
                        } else {
                            this.app.unselectButton(document.getElementById(`MCS ${PETS[petID].name} Button`));
                        }
                    }
                    if (petID === 4 && owned) document.getElementById('MCS Rock').style.display = '';
                });
            }

            importAutoEat(autoEatTier, foodSelected, cookingPool, cookingMastery) {
                // Import Food Settings
                this.app.combatData.autoEatTier = autoEatTier;
                document.getElementById('MCS Auto Eat Tier Dropdown').selectedIndex = autoEatTier + 1;
                this.app.equipFood(foodSelected);
                if (cookingPool) {
                    this.app.combatData.cookingPool = true;
                    document.getElementById('MCS 95% Cooking Pool Radio Yes').checked = true;
                } else {
                    this.app.combatData.cookingPool = false;
                    document.getElementById('MCS 95% Cooking Pool Radio No').checked = true;
                }
                if (cookingMastery) {
                    this.app.combatData.cookingMastery = true;
                    document.getElementById('MCS 99 Cooking Mastery Radio Yes').checked = true;
                } else {
                    this.app.combatData.cookingMastery = false;
                    document.getElementById('MCS 99 Cooking Mastery Radio No').checked = true;
                }
            }

            importSlayerTask(isSlayerTask) {
                // Update slayer task mode
                if (isSlayerTask) {
                    this.app.combatData.isSlayerTask = true;
                    document.getElementById('MCS Slayer Task Radio Yes').checked = true;
                } else {
                    this.app.combatData.isSlayerTask = false;
                    document.getElementById('MCS Slayer Task Radio No').checked = true;
                }
                this.app.slayerTaskSimsToggle();
            }

            importHardCore(isHardcore) {
                // Update hardcore mode
                if (isHardcore) {
                    this.app.combatData.isHardcore = true;
                    document.getElementById('MCS Hardcore Mode Radio Yes').checked = true;
                } else {
                    this.app.combatData.isHardcore = false;
                    document.getElementById('MCS Hardcore Mode Radio No').checked = true;
                }
            }

            importSummoningSynergy(summoningSynergy) {
                // Update summoningSynergy
                if (summoningSynergy) {
                    this.app.combatData.summoningSynergy = true;
                } else {
                    this.app.combatData.summoningSynergy = false;
                }
            }

            importAdventure(isAdventure) {
                // Update adventure mode
                if (isAdventure) {
                    this.app.combatData.isAdventure = true;
                    document.getElementById('MCS Adventure Mode Radio Yes').checked = true;
                } else {
                    this.app.combatData.isAdventure = false;
                    document.getElementById('MCS Adventure Mode Radio No').checked = true;
                }
                this.app.updateCombatStats();
            }

            importUseCombinationRunes(useCombinationRunes) {
                // Update hardcore mode
                if (useCombinationRunes) {
                    this.app.combatData.useCombinationRunes = true;
                    document.getElementById('MCS Use Combination Runes Radio Yes').checked = true;
                } else {
                    this.app.combatData.useCombinationRunes = false;
                    document.getElementById('MCS Use Combination Runes Radio No').checked = true;
                }
            }

            importAgilityCourse(course, masteries, pillar) {
                this.app.agilityCourse.importAgilityCourse(course, masteries, pillar);
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
    waitLoadOrder(reqs, setup, 'Import');

})();