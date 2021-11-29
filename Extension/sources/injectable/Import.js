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

        MICSR.defaultSettings = {
            // version: MICSR.version,
            course: Array(10).fill(-1),
            courseMastery: {"-1": false},
            equipment: Array(Object.getOwnPropertyNames(equipmentSlotData).length).fill(-1),
            levels: Array(skillXP.length).fill(1),
            petUnlocked: Array(PETS.length).fill(false),
            styles: {
                melee: 'Stab',
                ranged: 'Accurate',
                magic: 'Magic',
            },
            prayerSelected: [],
            ancient: -1,
            aurora: -1,
            autoEatTier: -1,
            cookingMastery: false,
            cookingPool: false,
            currentGamemode: 0,
            curse: -1,
            foodSelected: -1,
            healAfterDeath: true,
            isAncient: false,
            isManualEating: false,
            isSlayerTask: false,
            pillar: -1,
            potionID: -1,
            potionTier: 0,
            standard: 0,
            summoningSynergy: true,
            useCombinationRunes: false,
        }
        MICSR.defaultSettings.levels[Skills.Hitpoints] = 10;

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
                const cookingMastery = foodSelected.id > -1 && foodMastery && foodMastery[0] === Skills.Cooking
                    && exp.xp_to_level(MASTERY[Skills.Cooking].xp[foodMastery[1]]) > 99;

                // get the player's auto eat tier
                let autoEatTier = -1;
                [
                    GeneralShopPurchases.Auto_Eat_Tier_I,
                    GeneralShopPurchases.Auto_Eat_Tier_II,
                    GeneralShopPurchases.Auto_Eat_Tier_III,
                ].forEach(id => {
                    if (shopItemsPurchased.size === 0) {
                        return;
                    }
                    const ae = shopItemsPurchased.get(`General:${id}`);
                    if (ae === undefined || ae.quantity === 0) {
                        return;
                    }
                    autoEatTier++;
                });

                // get the active astrology modifiers
                const astrologyModifiers = [];
                for (const constellation of activeAstrologyModifiers) {
                    const modifiers = {};
                    for (const idx in constellation) {
                        const ms = constellation[idx];
                        for (const m in ms) {
                            if (modifiers[m] === undefined) {
                                modifiers[m] = ms[m].push === undefined ? 0 : [];
                            }
                            if (ms[m].push === undefined) {
                                modifiers[m] += ms[m];
                            } else {
                                const i = modifiers[m].findIndex(x => x[0] === ms[m][0][0]);
                                if (i === -1) {
                                    modifiers[m].push([...ms[m][0]]);
                                } else {
                                    modifiers[m][i][1] += ms[m][0][1];
                                }
                            }
                        }
                    }
                    astrologyModifiers.push(modifiers);
                }

                // create settings object
                const settings = {
                    version: MICSR.version,
                    // lists
                    astrologyModifiers: astrologyModifiers,
                    course: chosenAgilityObstacles,
                    courseMastery: MASTERY[Skills.Agility].xp.map(x => x > 13034431),
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
                    cookingPool: getMasteryPoolProgress(Skills.Cooking) >= 95,
                    currentGamemode: currentGamemode,
                    curse: player.spellSelection.curse,
                    foodSelected: foodSelected.id,
                    healAfterDeath: this.app.player.healAfterDeath,
                    isAncient: player.spellSelection.ancient !== -1,
                    isManualEating: this.app.player.isManualEating,
                    isSlayerTask: this.app.player.isSlayerTask,
                    pillar: agilityPassivePillarActive,
                    potionID: potionID,
                    potionTier: potionTier,
                    prayerSelected: [...player.activePrayers],
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
                    version: MICSR.version,
                    // lists
                    astrologyModifiers: this.app.player.activeAstrologyModifiers,
                    course: [...this.app.player.course],
                    courseMastery: courseMastery,
                    equipment: this.app.player.equipment.slotArray.map(x => x.item.id),
                    levels: [...this.app.player.skillLevel],
                    petUnlocked: [...this.app.player.petUnlocked],
                    // objects
                    styles: {...this.app.player.attackStyles},
                    prayerSelected: [...this.app.player.activePrayers],
                    // simple values
                    ancient: this.app.player.spellSelection.ancient,
                    aurora: this.app.player.spellSelection.aurora,
                    autoEatTier: this.app.player.autoEatTier,
                    cookingMastery: this.app.player.cookingMastery,
                    cookingPool: this.app.player.cookingPool,
                    currentGamemode: this.app.player.currentGamemode,
                    curse: this.app.player.spellSelection.curse,
                    foodSelected: this.app.player.food.currentSlot.item.id,
                    healAfterDeath: this.app.player.healAfterDeath,
                    isAncient: this.app.player.spellSelection.ancient > -1,
                    isManualEating: this.app.player.isManualEating,
                    isSlayerTask: this.app.player.isSlayerTask,
                    pillar: this.app.player.pillar,
                    potionID: this.app.player.potionID,
                    potionTier: this.app.player.potionTier,
                    standard: this.app.player.spellSelection.standard,
                    summoningSynergy: this.app.player.summoningSynergy,
                    useCombinationRunes: this.app.player.useCombinationRunes,
                }
            }

            importSettings(settings) {
                if (settings.version !== MICSR.version) {
                    MICSR.warn(`Importing MICSR ${settings.version} settings in MICSR ${MICSR.version}.`)
                }
                // validate
                for (const prop in MICSR.defaultSettings) {
                    if (settings[prop] === undefined) {
                        MICSR.error(`No valid ${prop} data imported, using default ${MICSR.defaultSettings[prop]}.`)
                        settings[prop] = MICSR.defaultSettings[prop];
                    }
                }
                // import settings
                this.importEquipment(settings.equipment);
                this.importLevels(settings.levels);
                this.importStyle(settings.styles);
                this.importSpells({
                    ancient: settings.ancient,
                    aurora: settings.aurora,
                    curse: settings.curse,
                    standard: settings.standard,
                });
                this.importPrayers(settings.prayerSelected);
                this.importPotion(settings.potionID, settings.potionTier);
                this.importPets(settings.petUnlocked);
                this.importAutoEat(settings.autoEatTier, settings.foodSelected, settings.cookingPool, settings.cookingMastery);
                this.importManualEating(settings.isManualEating);
                this.importHealAfterDeath(settings.healAfterDeath);
                this.importSlayerTask(settings.isSlayerTask);
                this.importGameMode(settings.currentGamemode);
                this.importUseCombinationRunes(settings.useCombinationRunes);
                this.importAgilityCourse(settings.course, settings.courseMastery, settings.pillar);
                this.importSummoningSynergy(settings.summoningSynergy);
                this.importAstrology(settings.astrologyModifiers);
            }

            update() {
                // update and compute values
                this.app.updateSpellOptions();
                this.app.updatePrayerOptions();
                this.app.updateCombatStats();
            }

            importEquipment(equipment) {
                // clear previous items
                this.app.player.equipment.unequipAll();
                for (const slot in equipmentSlotData) {
                    const slotID = equipmentSlotData[slot].id;
                    this.app.setEquipmentImage(slotID, -1);
                }
                // load new items
                for (const slot in equipmentSlotData) {
                    const slotID = equipmentSlotData[slot].id;
                    const itemID = equipment[slotID];
                    if (itemID === -1) {
                        continue;
                    }
                    this.app.equipItem(slotID, itemID);
                }
                // update style drop down
                this.app.updateStyleDropdowns();
            }

            importLevels(levels) {
                this.app.skillKeys.forEach(key => {
                    document.getElementById(`MCS ${key} Input`).value = levels[Skills[key]];
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

            importSpells(spellSelection) {
                // Set all active spell UI to be disabled
                Object.keys(this.app.combatData.spells).forEach((spellType) => {
                    const spellID = this.app.player.spellSelection[spellType];
                    if (spellID > -1) {
                        this.app.disableSpell(spellType, spellID);
                    }
                    this.app.enableSpell(spellType, spellSelection[spellType]);
                });
                this.app.spellSanityCheck();
            }

            importPrayers(prayerSelected) {
                // toggle old prayers off
                this.app.player.activePrayers.forEach(prayerID => {
                    this.app.player.activePrayers.delete(prayerID)
                });
                // Update prayers
                for (let prayerID = 0; prayerID < PRAYER.length; prayerID++) {
                    const prayButton = document.getElementById(`MCS ${this.app.getPrayerName(prayerID)} Button`);
                    if (prayerSelected.includes(prayerID)) {
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

            importManualEating(isManualEating) {
                this.checkRadio('MCS Manual Eating', isManualEating);
                this.app.player.isManualEating = isManualEating;
            }

            importHealAfterDeath(healAfterDeath) {
                this.checkRadio('MCS Heal After Death', healAfterDeath);
                this.app.player.healAfterDeath = healAfterDeath;
            }

            importSlayerTask(isSlayerTask) {
                // Update slayer task mode
                this.checkRadio('MCS Slayer Task', isSlayerTask);
                this.app.player.isSlayerTask = isSlayerTask;
                this.app.slayerTaskSimsToggle();
            }

            importGameMode(currentGamemode) {
                this.app.player.currentGamemode = currentGamemode;
                document.getElementById('MCS Game Mode Dropdown').selectedIndex = currentGamemode;
            }

            importSummoningSynergy(summoningSynergy) {
                // Update summoningSynergy
                this.app.player.summoningSynergy = summoningSynergy;
            }

            importUseCombinationRunes(useCombinationRunes) {
                // Update hardcore mode
                this.checkRadio('MCS Use Combination Runes', useCombinationRunes);
                this.app.player.useCombinationRunes = useCombinationRunes;
            }

            importAgilityCourse(course, masteries, pillar) {
                this.app.agilityCourse.importAgilityCourse(course, masteries, pillar);
            }

            importAstrology(astrologyModifiers) {
                this.app.player.activeAstrologyModifiers.forEach((constellation, idx) => {
                    for (const modifier in constellation) {
                        // import values and set rest to 0
                        if (astrologyModifiers[idx][modifier] !== undefined) {
                            constellation[modifier] = astrologyModifiers[idx][modifier];
                            if (constellation[modifier].push) {
                                // filter non combat skill modifiers
                                constellation[modifier] = constellation[modifier].filter(x =>
                                    MICSR.showModifiersInstance.relevantModifiers.combat.skillIDs.includes(x[0])
                                );
                            }
                        } else if (constellation[modifier].push) {
                            // keep entries per skill, but set value to 0
                            constellation[modifier] = constellation[modifier].map(x => [x[0], 0]);
                        } else {
                            constellation[modifier] = 0;
                        }
                        // update input fields
                        if (constellation[modifier].push) {
                            constellation[modifier].forEach(x => {
                                document.getElementById(`MCS ${ASTROLOGY[idx].name}-${Skills[x[0]]}-${modifier} Input`).value = x[1]
                            });
                        } else {
                            document.getElementById(`MCS ${ASTROLOGY[idx].name}-${modifier} Input`).value = constellation[modifier];
                        }
                    }
                });
                this.app.updateAstrologySummary();
            }

            checkRadio(baseID, check) {
                const yesOrNo = check ? 'Yes' : 'No';
                document.getElementById(`${baseID} Radio ${yesOrNo}`).checked = true;
            }
        }
    }

    let loadCounter = 0;
    const waitLoadOrder = (reqs, setup, id) => {
        if (typeof characterSelected === typeof undefined) {
            return;
        }
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