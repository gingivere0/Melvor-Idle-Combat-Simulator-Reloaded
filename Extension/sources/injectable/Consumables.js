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
         * Class to handle consumables
         */
        MICSR.Consumables = class {
            constructor(app) {
                this.app = app;
                this.card = this.app.consumablesCard;
                this.player = this.app.player;
                this.simulator = this.app.simulator;
                // toggles
                this.applyRates = false;
                this.card.addToggleRadio(
                    'Apply Rates',
                    `ApplyRates`,
                    this,
                    'applyRates',
                    this.applyRates,
                    25,
                    () => this.updateData(),
                );
                this.showAll = false;
                this.card.addToggleRadio(
                    'Show All Consumables',
                    `ShowAllConsumables`,
                    this,
                    'showAll',
                    this.showAll,
                    25,
                    () => this.updateView(),
                );
                this.card.container.appendChild(document.createElement('br'));
                // add export and import
                this.card.addButton('Export Rates', () => this.exportConsumableData());
                this.card.addTextInput('Import Rates:', '', event => this.importConsumableData(event));
                this.card.container.appendChild(document.createElement('br'));
                // add consumables
                this.initConsumables();
                // update view
            }

            initConsumables() {
                // consumables list
                this.consumables = {};
                // prayer points
                this.addConsumableInput('pp', 'Prayer Points', () => false);
                this.card.container.appendChild(document.createElement('br'));
                // potions
                this.addConsumableInput('potion', 'Potion', () => false);
                herbloreItemData.filter(data => data.category === 0).map(data => data.itemID[0]).forEach(potionID =>
                    this.addConsumableInput(potionID, items[potionID].name.replace('Potion I', 'Potion'), () => this.player.potionID !== -1 && potionID === herbloreItemData[this.player.potionID].itemID[0], 'potion')
                );
                this.card.container.appendChild(document.createElement('br'));
                // food
                this.addConsumableInput('food', 'Food', () => false);
                items.filter(item => this.app.filterIfHasKey('healsFor', item)).map(food => food.id).forEach(foodID =>
                    this.addItemInput(foodID, () => foodID === this.player.food.currentSlot.item.id, 'food')
                );
                this.card.container.appendChild(document.createElement('br'));
                // runes
                this.addConsumableInput('rune', 'Runes', () => false);
                items.filter(x => x.runecraftingCategory === 0).map(rune => rune.id).forEach(runeID =>
                    this.addItemInput(runeID, () => this.runesInUse[runeID], 'rune')
                );
                this.card.container.appendChild(document.createElement('br'));
                // combination runes
                this.addConsumableInput('combination', 'Combination Runes', () => false, 'rune');
                combinations.forEach(runeID =>
                    this.addItemInput(runeID, () => this.runesInUse[runeID], 'combination')
                );
                this.card.container.appendChild(document.createElement('br'));
                // ammo
                this.addConsumableInput('ammo', 'Ammo', () => false);
                [
                    {
                        id: 'arrow',
                        name: 'Arrows',
                        ammoType: 0,
                    },
                    {
                        id: 'bolt',
                        name: 'Bolts',
                        ammoType: 1,
                    },
                    {
                        id: 'knife',
                        name: 'Knives',
                        ammoType: 2,
                    },
                    {
                        id: 'javelin',
                        name: 'Javelins',
                        ammoType: 3,
                    },
                ].forEach(ammoInfo => {
                    this.addConsumableInput(ammoInfo.id, ammoInfo.name, () => false, 'ammo');
                    items.filter(x => x.ammoType === ammoInfo.ammoType).map(ammo => ammo.id).forEach(ammoID =>
                        this.addItemInput(ammoID, () => ammoID === this.player.equipmentID(equipmentSlotData.Quiver.id), ammoInfo.id)
                    );
                });
                this.card.container.appendChild(document.createElement('br'));
                // summons
                this.addConsumableInput('summon', 'Familiar Tablets', () => false);
                items.filter(x => x.equipmentStats && x.equipmentStats.find(y => y.key === 'summoningMaxhit')).map(x => x.id).forEach(summonID =>
                    this.addItemInput(summonID, () => this.player.equipmentIDs().includes(summonID), 'summon')
                );
                this.card.container.appendChild(document.createElement('br'));
            }

            addItemInput(itemID, check, override) {
                const item = items[itemID];
                this.addConsumableInput(itemID, item.name, check, override);
            }

            addConsumableInput(id, name, check, override) {
                this.consumables[id] = {
                    check: check,
                    name: name,
                    override: override,
                    seconds: undefined,
                    children: [],
                };
                this.card.addNumberInput(
                    name,
                    '',
                    0,
                    Infinity,
                    event => this.setConsumableSecondsFromEvent(event, id),
                );
                if (override !== undefined) {
                    this.consumables[override].children.push(id);
                }
            }

            genericCheck(id) {
                const consumable = this.consumables[id];
                for (const childID of consumable.children) {
                    if (this.genericCheck(childID)) {
                        return true;
                    }
                }
                return consumable.check();
            }

            updateView() {
                this.setRunesInUse();
                for (const id in this.consumables) {
                    const consumable = this.consumables[id];
                    const element = document.getElementById(`MCS ${consumable.name} Input`).parentElement;
                    element.style.display = this.showAll || this.genericCheck(id) ? '' : 'none';
                }
            }

            setConsumableSecondsFromEvent(event, id) {
                let seconds = parseFloat(event.currentTarget.value);
                if (isNaN(seconds)) {
                    seconds = undefined;
                }
                this.setConsumableSeconds(id, seconds);
            }

            setConsumableSeconds(id, seconds) {
                if (this.consumables[id].seconds === seconds) {
                    return;
                }
                this.consumables[id].seconds = seconds;
                // update
                if (this.applyRates) {
                    this.updateData();
                }
            }

            updateData() {
                this.simulator.performPostSimAnalysis();
                this.app.updatePlotData();
                this.app.updateZoneInfoCard();
            }

            exportConsumableData() {
                const settings = {};
                for (const id in this.consumables) {
                    settings[id] = this.consumables[id].seconds;
                }
                const data = JSON.stringify(settings, null, 1);
                this.app.popExport(data);
            }

            importConsumableData(event) {
                let settings;
                try {
                    settings = JSON.parse(event.currentTarget.value)
                } catch {
                    this.app.notify('Ignored invalid JSON consumable settings!', 'danger');
                    settings = {};
                }
                for (const id in this.consumables) {
                    this.consumables[id].seconds = settings[id];
                }
            }

            getConsumableCostInSeconds(id) {
                if (id === undefined) {
                    return 0;
                }
                const consumable = this.consumables[id];
                if (consumable.seconds !== undefined) {
                    return consumable.seconds;
                }
                if (consumable.override !== undefined) {
                    return this.getConsumableCostInSeconds(consumable.override);
                }
                return 0;
            }

            setRunesInUse() {
                this.runesInUse = {};
                for (const spellType in this.player.spellSelection) {
                    const spellSelection = this.player.spellSelection[spellType];
                    if (spellSelection === -1) {
                        continue;
                    }
                    const spell = this.app.combatData.spells[spellType][spellSelection];
                    const costs = this.player.getRuneCosts(spell).map(x => x.itemID);
                    for (const runeID of costs) {
                        this.runesInUse[runeID] = true;
                    }
                }
            }

            update() {
                for (const simID in this.simulator.monsterSimData) {
                    this.updateSingleResult(this.simulator.monsterSimData[simID]);
                }
                for (const dData of this.simulator.dungeonSimData) {
                    this.updateSingleResult(dData);
                }
                this.simulator.slayerSimData.forEach((sData, slayerTaskID) => {
                    this.updateSingleResult(sData);
                    // correct average kill time for auto slayer
                    sData.adjustedRates.killTimeS /= this.simulator.slayerTaskMonsters[slayerTaskID].length;
                });
            }

            updateSingleResult(data) {
                const factor = this.computeFactor(data);
                data.adjustedRates = {};
                [
                    // xp rates
                    'xpPerSecond',
                    'hpXpPerSecond',
                    'slayerXpPerSecond',
                    'prayerXpPerSecond',
                    'summoningXpPerSecond',
                    // kill time
                    'killTimeS',
                    // loot gains
                    'gpPerSecond',
                    'dropChance',
                    'slayerCoinsPerSecond',
                ].forEach(tag => data.adjustedRates[tag] = data[tag] / factor);
                // gp per second
                const gpFactor = (data.killTimeS + data.alchTimeS) / (data.killTimeS * factor + data.alchTimeS);
                data.adjustedRates.gpPerSecond = data.gpPerSecond * gpFactor;
                // kills per second
                data.adjustedRates.killsPerSecond = 1 / data.adjustedRates.killTimeS;
            }

            computeFactor(data) {
                // compute factor
                let factor = 1;
                // pp
                if (data.ppConsumedPerSecond) {
                    factor += data.ppConsumedPerSecond * this.getConsumableCostInSeconds('pp');
                }
                // potion
                if (data.potionsUsedPerSecond) {
                    const potionID = herbloreItemData[this.player.potionID].itemID[0];
                    factor += data.potionsUsedPerSecond * this.getConsumableCostInSeconds(potionID);
                }
                // food
                if (data.atePerSecond) {
                    const foodID = this.player.food.currentSlot.item.id;
                    factor += data.atePerSecond * this.getConsumableCostInSeconds(foodID);
                }
                // runes
                for (const runeID in data.usedRunesBreakdown) {
                    factor += data.usedRunesBreakdown[runeID] * this.getConsumableCostInSeconds(runeID);
                }
                // ammo
                if (data.ammoUsedPerSecond) {
                    const ammoID = this.player.equipmentID(equipmentSlotData.Quiver.id);
                    factor += data.ammoUsedPerSecond * this.getConsumableCostInSeconds(ammoID);
                }
                // familiars
                if (data.tabletsUsedPerSecond) {
                    [
                        MICSR.melvorCombatSim.player.equipmentID(EquipmentSlots.Summon1),
                        MICSR.melvorCombatSim.player.equipmentID(EquipmentSlots.Summon2),
                    ].forEach(summonID => {
                        if (this.consumables[summonID]) {
                            factor += data.ammoUsedPerSecond * this.getConsumableCostInSeconds(summonID);
                        }
                    });
                }
                return factor;
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
    waitLoadOrder(reqs, setup, 'Consumables');

})();