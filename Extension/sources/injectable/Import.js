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
                // get foodSelected
                const foodSelected = player.food.currentSlot.item;
                // get cooking mastery for foodSelected
                const foodMastery = foodSelected.masteryID;
                const cookingMastery = foodSelected.id > -1 && foodMastery && foodMastery[0] === CONSTANTS.skill.Cooking
                    && exp.xp_to_level(MASTERY[CONSTANTS.skill.Cooking].xp[foodMastery[1]]) > 99;

                // get the player's auto eat tier
                let autoEatTier = -1;
                [
                    CONSTANTS.shop.general.Auto_Eat_Tier_I,
                    CONSTANTS.shop.general.Auto_Eat_Tier_II,
                    CONSTANTS.shop.general.Auto_Eat_Tier_III,
                ].forEach(id => {
                    if (shopItemsPurchased.size > 0 && shopItemsPurchased.get(`General:${id}`).quantity > 0) {
                        autoEatTier++;
                    }
                });

                // create settings object
                const settings = {
                    // lists
                    course: chosenAgilityObstacles,
                    courseMastery: MASTERY[CONSTANTS.skill.Agility].xp.map(x => x > 13034431),
                    equipment: player.equipmentSets[setID].slotArray.map(x => x.occupiedBy === 'None' ? x.item.id : -1),
                    levels: skillXP.map(x => Math.max(1, exp.xp_to_level(x) - 1)),
                    petUnlocked: petUnlocked,
                    // objects
                    styles: {...player.attackStyles},
                    // simple values
                    ancient: player.spellSelection.ancient,
                    aurora: player.spellSelection.aurora,
                    autoEatTier: autoEatTier,
                    cookingMastery: cookingMastery,
                    cookingPool: getMasteryPoolProgress(CONSTANTS.skill.Cooking) >= 95,
                    curse: player.spellSelection.curse,
                    foodSelected: foodSelected.id,
                    isAdventure: currentGamemode === 2,
                    isAncient: player.spellSelection.ancient !== -1,
                    isHardcore: currentGamemode === 1,
                    isSlayerTask: this.app.combatData.isSlayerTask,
                    pillar: agilityPassivePillarActive,
                    potionID: potionID,
                    potionTier: potionTier,
                    prayerSelected: PRAYER.map((_, i) => [...player.activePrayers].includes(i)),
                    standard: player.spellSelection.standard,
                    summoningSynergy: this.app.player.summoningSynergy, // TODO: import mark levels
                    useCombinationRunes: useCombinationRunes,
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
                    // player: this.app.player,
                    // TODO: all these should be in SimPlayer class?
                    // lists
                    course: [...this.app.player.course],
                    courseMastery: courseMastery,
                    equipment: this.app.player.equipment.slotArray.map(x => x.item.id),
                    levels: [...this.app.player.skillLevel],
                    petUnlocked: [...this.app.player.petUnlocked],
                    // objects
                    styles: {...this.app.player.attackStyles},
                    prayerSelected: this.app.player.activePrayers,
                    // simple values
                    ancient: this.app.combatData.spells.ancient.selectedID,
                    aurora: this.app.combatData.spells.aurora.selectedID,
                    autoEatTier: this.app.player.autoEatTier,
                    cookingMastery: this.app.player.cookingMastery,
                    cookingPool: this.app.player.cookingPool,
                    curse: this.app.combatData.spells.curse.selectedID,
                    foodSelected: this.app.player.food.currentSlot.item.id,
                    isAdventure: this.app.combatData.isAdventure,
                    isAncient: this.app.combatData.spells.ancient.selectedID > -1,
                    isHardcore: this.app.combatData.isHardcore,
                    isSlayerTask: this.app.combatData.isSlayerTask,
                    pillar: this.app.player.pillar,
                    potionID: this.app.player.potionID,
                    potionTier: this.app.player.potionTier,
                    standard: this.app.combatData.spells.standard.selectedID,
                    summoningSynergy: this.app.player.summoningSynergy,
                    useCombinationRunes: this.app.combatData.useCombinationRunes,
                }
            }

            importSettings(settings) {
                // import settings
                this.importEquipment(settings.equipment);
                this.importLevels(settings.levels);
                this.importStyle(settings.styles);
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
                    if (itemID === -1 && this.app.player.equipmentOccupiedBy(slotID) !== 'None') {
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

            importStyle(styles) {
                [
                    'melee',
                    'ranged',
                    'magic',
                ].forEach(style => {
                    this.app.player.setAttackStyle(style, styles[style]);
                    document.getElementById(`MCS ${style} Style Dropdown`).selectedIndex = attackStyles[styles[style]].id % 3;
                });
            }

            importSpells(ancient, standard, curse, aurora) {
                // Set all active spell UI to be disabled
                Object.keys(this.app.combatData.spells).forEach((spellType) => {
                    const spellOpts = this.app.combatData.spells[spellType];
                    if (spellOpts.selectedID > -1) {
                        this.app.unselectButton(document.getElementById(`MCS ${spellOpts.array[spellOpts.selectedID].name} Button`));
                    }
                });
                // import spells
                if (ancient !== -1) {
                    this.app.combatData.spells.ancient.selectedID = ancient;
                    // clear standard and curse
                    this.app.combatData.spells.standard.selectedID = -1;
                    this.app.combatData.spells.curse.selectedID = -1;
                } else {
                    this.app.combatData.spells.standard.selectedID = standard;
                    this.app.combatData.spells.ancient.selectedID = -1;
                    if (curse !== -1) {
                        this.app.combatData.spells.curse.selectedID = curse;
                    } else {
                        this.app.combatData.spells.curse.selectedID = -1;
                    }
                }
                if (aurora !== -1) {
                    this.app.combatData.spells.aurora.selectedID = aurora;
                } else {
                    this.app.combatData.spells.aurora.selectedID = -1;
                }
                // Update spell UI
                Object.values(this.app.combatData.spells).forEach((spellOpts, i) => {
                    if (spellOpts.selectedID > -1) {
                        this.app.selectButton(document.getElementById(`MCS ${spellOpts.array[spellOpts.selectedID].name} Button`));
                        this.app.spellSelectCard.onTabClick(i);
                    }
                });
            }

            importPrayers(prayerSelected) {
                // toggle old prayers off
                this.app.player.activePrayers.forEach(prayerID => {
                    this.app.player.activePrayers.delete(prayerID)
                });
                // Update prayers
                for (let prayerID = 0; prayerID < PRAYER.length; prayerID++) {
                    const prayButton = document.getElementById(`MCS ${this.app.getPrayerName(prayerID)} Button`);
                    if (prayerSelected[prayerID]) {
                        this.app.selectButton(prayButton);
                        this.app.player.activePrayers.add(prayerID);
                    } else {
                        this.app.unselectButton(prayButton);
                    }
                }
            }

            importPotion(potionID, potionTier) {
                // Deselect potion if selected
                if (this.app.player.potionSelected) {
                    this.app.unselectButton(document.getElementById(`MCS ${this.app.getPotionName(this.app.player.potionID)} Button`));
                    this.app.player.potionSelected = false;
                    this.app.player.potionID = -1;
                }
                // Select new potion if applicable
                if (potionID !== -1) {
                    this.app.player.potionSelected = true;
                    this.app.player.potionID = potionID;
                    this.app.selectButton(document.getElementById(`MCS ${this.app.getPotionName(this.app.player.potionID)} Button`));
                }
                // Set potion tier if applicable
                if (potionTier !== -1) {
                    this.app.player.potionTier = potionTier;
                    this.app.updatePotionTier(potionTier);
                    // Set dropdown to correct option
                    document.getElementById('MCS Potion Tier Dropdown').selectedIndex = potionTier;
                }
            }

            importPets(petUnlocked) {
                // Import PETS
                petUnlocked.forEach((owned, petID) => {
                    this.app.player.petUnlocked[petID] = owned;
                    if (this.app.petIDs.includes(petID)) {
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
                this.app.player.autoEatTier = autoEatTier;
                document.getElementById('MCS Auto Eat Tier Dropdown').selectedIndex = autoEatTier + 1;
                this.app.equipFood(foodSelected);
                this.checkRadio('MCS 95% Cooking Pool', cookingPool);
                this.app.player.cookingPool = cookingPool;
                this.checkRadio('MCS 99 Cooking Mastery', cookingMastery);
                this.app.player.cookingMastery = cookingMastery;
            }

            importSlayerTask(isSlayerTask) {
                // Update slayer task mode
                this.checkRadio('MCS Slayer Task', isSlayerTask);
                this.app.combatData.isSlayerTask = isSlayerTask;
                this.app.slayerTaskSimsToggle();
            }

            importHardCore(isHardcore) {
                if (isHardcore !== this.app.combatData.isHardcore) {
                    this.app.notify('Imported game mode does not match selected game mode!', 'danger');
                }
                /* TODO
                // Update hardcore mode
                this.checkRadio('MCS Hardcore Mode', isHardcore);
                this.app.combatData.isHardcore = isHardcore;
                */
            }

            importSummoningSynergy(summoningSynergy) {
                // Update summoningSynergy
                this.app.player.summoningSynergy = summoningSynergy;
            }

            importAdventure(isAdventure) {
                if (isAdventure !== this.app.combatData.isAdventure) {
                    this.app.notify('Imported game mode does not match selected game mode!', 'danger');
                }
                /* TODO
                // Update adventure mode
                this.checkRadio('MCS Adventure Mode', isAdventure);
                this.app.combatData.isAdventure = isAdventure;
                this.app.updateCombatStats();
                */
            }

            importUseCombinationRunes(useCombinationRunes) {
                // Update hardcore mode
                this.checkRadio('MCS Use Combination Runes', useCombinationRunes);
                this.app.combatData.useCombinationRunes = useCombinationRunes;
            }

            importAgilityCourse(course, masteries, pillar) {
                this.app.agilityCourse.importAgilityCourse(course, masteries, pillar);
            }

            checkRadio(baseID, check) {
                const yesOrNo = check ? 'Yes' : 'No';
                document.getElementById(`${baseID} Radio ${yesOrNo}`).checked = true;
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