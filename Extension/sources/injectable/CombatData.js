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
        'util',
    ];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * CombatData class, stores all the combat data of a simulation
         */
        MICSR.CombatData = class {
            /**
             *
             */
            constructor(manager) {
                this.manager = manager;
                this.player = this.manager.player;
                this.modifiers = this.player.modifiers;
                // Spell Selection
                this.spells = {
                    standard: SPELLS,
                    curse: CURSES,
                    aurora: AURORAS,
                    ancient: ANCIENT,
                };
                // Combat Stats
                this.combatStats = {
                    attackInterval: 4000,
                    maxHit: 0,
                    minHit: 0,
                    increasedMinHit: 0,
                    summoningMaxHit: 0,
                    maxAttackRoll: 0,
                    maxDefRoll: 0,
                    maxRngDefRoll: 0,
                    maxMagDefRoll: 0,
                    damageReduction: 0,
                    attackType: 0,
                    maxHitpoints: 0,
                    ammoPreservation: 0,
                    runePreservation: 0,
                    lootBonusPercent: 0,
                    lootBonus: 0,
                    gpBonus: 0,
                };
                /** Aurora Bonuses */
                this.auroraBonus = {
                    attackSpeedBuff: 0,
                    rangedEvasionBuff: 0,
                    increasedMaxHit: 0,
                    magicEvasionBuff: 0,
                    lifesteal: 0,
                    meleeEvasionBuff: 0,
                    increasedMinHit: 0,
                };
                // Game Mode Settings
                this.isHardcore = currentGamemode === 1;
                this.isAdventure = currentGamemode === 2;
                this.numberMultiplier = numberMultiplier;
                // lucky herb bonus
                this.luckyHerb = 0;
                // equipment stats
                this.equipmentStats = this.player.equipmentStats;
                // combat stats
                this.combatStats = {};
                // selected item drop
                this.dropSelected = -1;
            }

            setAttackType() {
                const weaponID = this.player.equipmentID(MICSR.equipmentSlot.Weapon);
                const weapon = MICSR.getItem(weaponID, 'Weapon');
                if (weapon.type === 'Ranged Weapon' || weapon.isRanged) {
                    // Ranged
                    this.combatStats.attackType = CONSTANTS.attackType.Ranged;
                } else if (weapon.isMagic) {
                    // Magic
                    this.combatStats.attackType = CONSTANTS.attackType.Magic;
                } else {
                    // Melee
                    this.combatStats.attackType = CONSTANTS.attackType.Melee;
                }
            }

            /**
             * mimic getNumberMultiplierValue
             */
            getNumberMultiplierValue(value) {
                return value * this.numberMultiplier;
            }

            /**
             * Calculates the combat stats from equipment, combat style, spell selection and player levels and stores them in `this.combatStats`
             */
            updateCombatStats() {
                this.player.computeAllStats();

                /*
                First, gather all bonuses TODO: extract this
                 */

                // update numberMultiplier
                if (this.isAdventure) {
                    this.numberMultiplier = 100;
                } else {
                    this.numberMultiplier = 10;
                }

                // attack type
                this.setAttackType();

                //
                this.computePotionBonus();
                const modifiers = this.player.modifiers;

                // update aurora bonuses //TODO: are some of these modifiers?
                this.computeAuroraBonus();

                /*
                Second, start computing and configuring TODO: extract this
                 */

                // loot doubling
                this.combatStats.lootBonusPercent = MICSR.getModifierValue(modifiers, 'ChanceToDoubleLootCombat')
                    + MICSR.getModifierValue(modifiers, 'ChanceToDoubleItemsGlobal');
                // loot doubling is always between 0% and 100% chance
                this.combatStats.lootBonusPercent = Math.max(0, this.combatStats.lootBonusPercent);
                this.combatStats.lootBonusPercent = Math.min(100, this.combatStats.lootBonusPercent);
                // convert to average loot multiplier
                this.combatStats.lootBonus = MICSR.averageDoubleMultiplier(this.combatStats.lootBonusPercent);
                // gp bonus
                this.combatStats.gpBonus = MICSR.averageDoubleMultiplier(
                    MICSR.getModifierValue(modifiers, 'GPFromMonsters')
                    + MICSR.getModifierValue(modifiers, 'GPGlobal')
                    + (this.manager.isSlayerTask ? modifiers.summoningSynergy_0_12 : 0)
                );

                // set enemy spawn timer
                this.enemySpawnTimer = 3000 + MICSR.getModifierValue(modifiers, 'MonsterRespawnTimer');

                // attack speed without aurora
                this.combatStats.attackInterval = this.player.stats.attackInterval;

                // preservation
                this.combatStats.ammoPreservation = MICSR.getModifierValue(modifiers, 'AmmoPreservation');
                this.combatStats.runePreservation = MICSR.getModifierValue(modifiers, 'RunePreservation');

                // max attack roll
                this.combatStats.maxAttackRoll = this.player.stats.accuracy;

                // max hit roll
                this.combatStats.maxHit = this.player.stats.maxHit;

                // min hit roll
                this.combatStats.increasedMinHit = 0;
                if (this.combatStats.attackType === CONSTANTS.attackType.Magic) {
                    // Magic
                    if (this.spells.standard.selectedID > -1) {
                        switch (SPELLS[this.spells.standard.selectedID].spellType) {
                            case CONSTANTS.spellType.Air:
                                this.combatStats.increasedMinHit = MICSR.getModifierValue(modifiers, 'MinAirSpellDmg');
                                break;
                            case CONSTANTS.spellType.Water:
                                this.combatStats.increasedMinHit = MICSR.getModifierValue(modifiers, 'MinWaterSpellDmg');
                                break;
                            case CONSTANTS.spellType.Earth:
                                this.combatStats.increasedMinHit = MICSR.getModifierValue(modifiers, 'MinEarthSpellDmg');
                                break;
                            case CONSTANTS.spellType.Fire:
                                this.combatStats.increasedMinHit = MICSR.getModifierValue(modifiers, 'MinFireSpellDmg');
                                break;
                            default:
                        }
                    }
                }
                if (this.auroraBonus.increasedMinHit !== 0 && this.spells.standard.selectedID > -1) {
                    this.combatStats.increasedMinHit += this.auroraBonus.increasedMinHit;
                }
                this.combatStats.increasedMinHit *= this.numberMultiplier;
                this.combatStats.minHit = this.player.stats.minHit;

                // max summ roll
                this.combatStats.summoningMaxHit = this.player.equipmentStats.summoningMaxhit * this.numberMultiplier;
                this.summoningXPPerHit = this.getSummoningXP();

                // max defence roll
                this.combatStats.maxDefRoll = this.player.stats.evasion.melee;
                this.combatStats.maxRngDefRoll = this.player.stats.evasion.ranged;
                this.combatStats.maxMagDefRoll = this.player.stats.evasion.magic;

                // Calculate damage reduction
                this.combatStats.damageReduction = this.player.stats.damageReduction;

                // Max Hitpoints
                this.combatStats.baseMaxHitpoints = this.player.levels.Hitpoints;
                this.combatStats.baseMaxHitpoints += MICSR.getModifierValue(modifiers, 'MaxHitpoints');
                this.combatStats.maxHitpoints = this.player.stats.maxHitpoints
            }

            /**
             * Sets aurora bonuses
             */
            computeAuroraBonus() {
                this.resetAuroraBonus();
                if ((this.combatStats.attackType === CONSTANTS.attackType.Magic || this.equipmentStats.canUseMagic) && this.spells.aurora.selectedID > -1) {
                    const auroraID = this.spells.aurora.selectedID;
                    switch (auroraID) {
                        case CONSTANTS.aurora.Surge_I:
                        case CONSTANTS.aurora.Surge_II:
                        case CONSTANTS.aurora.Surge_III:
                            this.auroraBonus.attackSpeedBuff = AURORAS[auroraID].effectValue[0];
                            this.auroraBonus.rangedEvasionBuff = AURORAS[auroraID].effectValue[1];
                            break;
                        case CONSTANTS.aurora.Fury_I:
                        case CONSTANTS.aurora.Fury_II:
                        case CONSTANTS.aurora.Fury_III:
                            this.auroraBonus.increasedMaxHit = AURORAS[auroraID].effectValue[0];
                            this.auroraBonus.magicEvasionBuff = AURORAS[auroraID].effectValue[1];
                            break;
                        case CONSTANTS.aurora.Fervor_I:
                        case CONSTANTS.aurora.Fervor_II:
                        case CONSTANTS.aurora.Fervor_III:
                            this.auroraBonus.lifesteal = AURORAS[auroraID].effectValue[0];
                            this.auroraBonus.meleeEvasionBuff = AURORAS[auroraID].effectValue[1];
                            break;
                        case CONSTANTS.aurora.Charged_I:
                        case CONSTANTS.aurora.Charged_II:
                        case CONSTANTS.aurora.Charged_III:
                            this.auroraBonus.increasedMinHit = AURORAS[auroraID].effectValue;
                            break;
                    }
                }
            }

            /**
             * Resets the aurora bonuses to default
             */
            resetAuroraBonus() {
                Object.keys(this.auroraBonus).forEach((key) => {
                    this.auroraBonus[key] = 0;
                });
            }

            /**
             * Computes the potion bonuses for the selected potion
             * */
            computePotionBonus() {
                this.luckyHerb = 0;
                if (this.player.potionSelected) {
                    const potion = items[herbloreItemData[this.player.potionID].itemID[this.player.potionTier]];
                    if (potion.potionBonusID === 11) {
                        this.luckyHerb = potion.potionBonus;
                    }
                }
            }

            playerAttackSpeed() {
                let attackSpeed = this.combatStats.attackSpeed;
                attackSpeed -= this.decreasedAttackSpeed();
                return attackSpeed;
            }

            decreasedAttackSpeed() {
                return this.auroraBonus.attackSpeedBuff;
            }

            getSummoningXP() {
                const summ1 = this.player.equipmentID(MICSR.equipmentSlot.Summon1);
                const summ2 = this.player.equipmentID(MICSR.equipmentSlot.Summon2);
                let xp = 0;
                if (summ1 >= 0 && items[summ1].summoningMaxHit) {
                    xp += getBaseSummoningXP(items[summ1].summoningID, true, 3000);
                }
                if (summ2 >= 0 && items[summ2].summoningMaxHit) {
                    xp += getBaseSummoningXP(items[summ2].summoningID, true, 3000);
                }
                return xp;
            }

            isMelee() {
                return this.combatStats.attackType === CONSTANTS.attackType.Melee;
            }

            isRanged() {
                return this.combatStats.attackType === CONSTANTS.attackType.Ranged;
            }

            isMagic() {
                return this.combatStats.attackType === CONSTANTS.attackType.Magic;
            }

            getPlayerStats() {
                /** @type {PlayerStats} */
                const playerStats = {
                    attackSpeed: this.combatStats.attackSpeed,
                    attackType: this.combatStats.attackType,
                    isMelee: this.isMelee(),
                    isRanged: this.isRanged(),
                    isMagic: this.isMagic(),
                    maxAttackRoll: this.combatStats.maxAttackRoll,
                    maxHit: this.combatStats.maxHit,
                    increasedMinHit: this.combatStats.increasedMinHit,
                    summoningMaxHit: this.combatStats.summoningMaxHit,
                    maxDefRoll: this.combatStats.maxDefRoll,
                    maxMagDefRoll: this.combatStats.maxMagDefRoll,
                    maxRngDefRoll: this.combatStats.maxRngDefRoll,
                    xpBonus: 0,
                    globalXPMult: 1,
                    maxHitpoints: this.combatStats.maxHitpoints,
                    avgHPRegen: 0,
                    damageReduction: this.combatStats.damageReduction,
                    usingMagic: false,
                    usingAncient: false,
                    hasSpecialAttack: false,
                    specialData: {},
                    startingGP: 50000000,
                    levels: {...this.player.levels},
                    activeItems: {...this.equipmentStats.activeItems},
                    equipmentSelected: this.player.equipmentIDs(),
                    prayerPointsPerAttack: 0,
                    prayerPointsPerEnemy: 0,
                    prayerPointsPerHeal: 0,
                    prayerXpPerDamage: 0,
                    isProtected: false,
                    hardcore: this.isHardcore,
                    adventure: this.isAdventure,
                    // passive stats
                    ammoPreservation: this.combatStats.ammoPreservation,
                    lifesteal: this.auroraBonus.lifesteal + this.equipmentStats.lifesteal,
                    reflectDamage: this.equipmentStats.reflectDamage,
                    decreasedAttackSpeed: this.decreasedAttackSpeed(),
                    runePreservation: this.combatStats.runePreservation,
                    // curses
                    canCurse: false,
                    curseID: -1,
                    curseData: {},
                    runeCosts: {
                        spell: [],
                        curse: [],
                        aurora: [],
                    },
                    // healing
                    autoEat: {
                        eatAt: 0,
                        maxHP: 0,
                        efficiency: 0,
                        manual: false,
                    },
                    foodHeal: 0,
                    // summoning
                    synergy: this.player.getCurrentSynergy(),
                };
                // MICSR.log({...playerStats});
                const modifiers = this.player.modifiers;

                // set auto eat
                if (this.player.autoEatTier >= 0) {
                    playerStats.autoEat.eatAt = MICSR.getModifierValue(modifiers, 'AutoEatThreshold');
                    playerStats.autoEat.efficiency = MICSR.getModifierValue(modifiers, 'AutoEatEfficiency');
                    playerStats.autoEat.maxHP = MICSR.getModifierValue(modifiers, 'AutoEatHPLimit');
                } else {
                    playerStats.autoEat.manual = true;
                }
                playerStats.foodHeal = this.player.getFoodHealing(this.player.food.currentSlot.item);

                // Magic curses and auroras
                if (this.combatStats.attackType === CONSTANTS.attackType.Magic || this.equipmentStats.canUseMagic) {
                    playerStats.usingMagic = true;

                    // Rune costs
                    if (!this.spells.ancient.selectedID > -1 && this.spells.curse.selectedID > -1) {
                        playerStats.runeCosts.curse = this.getRuneCostForSpell(CURSES[this.spells.curse.selectedID]);
                    }
                    if (this.spells.aurora.selectedID > -1) {
                        playerStats.runeCosts.aurora = this.getRuneCostForSpell(AURORAS[this.spells.aurora.selectedID], true);
                    }
                }
                // spells
                if (this.combatStats.attackType === CONSTANTS.attackType.Magic) {
                    if (this.spells.ancient.selectedID > -1) {
                        playerStats.runeCosts.spell = this.getRuneCostForSpell(ANCIENT[this.spells.ancient.selectedID]);
                    } else {
                        playerStats.runeCosts.spell = this.getRuneCostForSpell(SPELLS[this.spells.standard.selectedID]);
                    }
                }

                // Special Attack and Ancient Magicks
                playerStats.specialData = [];
                if (this.combatStats.attackType === CONSTANTS.attackType.Magic && this.spells.ancient.selectedID > -1) {
                    playerStats.usingAncient = true;
                    playerStats.specialData.push(ANCIENT[this.spells.ancient.selectedID].specialAttack);
                } else {
                    for (const itemId of this.player.equipmentIDs()) {
                        if (itemId === -1) {
                            continue;
                        }
                        if (items[itemId].hasSpecialAttack) {
                            playerStats.hasSpecialAttack = true;
                            items[itemId].specialAttacks.forEach(attack =>
                                playerStats.specialData.push(attack)
                            );
                        }
                    }
                }
                // MICSR.log({...playerStats.specialData});

                // Curses
                if (this.spells.curse.selectedID > -1 && (this.combatStats.attackType === CONSTANTS.attackType.Magic && !this.spells.ancient.selectedID > -1 || this.equipmentStats.canUseMagic)) {
                    playerStats.canCurse = true;
                    playerStats.curseID = this.spells.curse.selectedID;
                    playerStats.curseData = CURSES[this.spells.curse.selectedID];
                }

                // Regen Calculation
                if (!this.isHardcore) {
                    let amt = Math.floor(this.combatStats.maxHitpoints / 10);
                    amt = Math.floor(amt / this.numberMultiplier);
                    // modifiers
                    amt += this.numberMultiplier * MICSR.getModifierValue(modifiers, 'HPRegenFlat');
                    // rapid heal prayer
                    amt *= 1 + MICSR.getModifierValue(modifiers, 'HitpointRegeneration');
                    // Regeneration modifiers
                    applyModifier(
                        amt,
                        MICSR.getModifierValue(modifiers, 'HitpointRegeneration')
                    );
                    playerStats.avgHPRegen = amt;
                }

                // Life Steal from gear
                playerStats.lifesteal += this.equipmentStats.lifesteal;

                // Calculate Global XP Multiplier
                if (playerStats.activeItems.firemakingSkillcape) {
                    playerStats.globalXPMult += 0.05;
                }
                if (this.player.petUnlocked[2]) {
                    playerStats.globalXPMult += 0.01;
                }
                // adjust prayer usage
                const adjustPP = (pp) => {
                    pp -= MICSR.getModifierValue(modifiers, 'FlatPrayerCostReduction');
                    if (playerStats.activeItems.prayerSkillcape && pp > 0) {
                        pp = Math.floor(pp / 2);
                    }
                    pp = Math.max(1, pp);
                    let save = MICSR.getModifierValue(modifiers, 'ChanceToPreservePrayerPoints');
                    pp *= 1 - save / 100;
                    return pp;
                }
                // Compute prayer point usage and xp gain
                this.player.activePrayers.forEach(i => {
                    // Base PP Usage
                    playerStats.prayerPointsPerAttack += adjustPP(PRAYER[i].pointsPerPlayer);
                    playerStats.prayerPointsPerEnemy += adjustPP(PRAYER[i].pointsPerEnemy);
                    playerStats.prayerPointsPerHeal += adjustPP(PRAYER[i].pointsPerRegen);
                    // XP Gain
                    playerStats.prayerXpPerDamage += PRAYER[i].pointsPerPlayer / this.numberMultiplier;
                });
                // Xp Bonuses
                const globalXpBonus = MICSR.getModifierValue(modifiers, 'GlobalSkillXP');
                playerStats.combatXpBonus = globalXpBonus;
                if (this.combatStats.attackType === CONSTANTS.attackType.Melee) {
                    switch (this.player.attackStyle.melee) {
                        case 'Stab':
                            playerStats.combatXpBonus += MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Attack);
                            break
                        case 'Slash':
                            playerStats.combatXpBonus += MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Strength);
                            break
                        case 'Block':
                            playerStats.combatXpBonus += MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Defence);
                            break
                    }
                }
                if (this.combatStats.attackType === CONSTANTS.attackType.Ranged) {
                    const xpBonus = MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Ranged);
                    if (this.player.attackStyle.ranged === 'Longrange') {
                        const defenceXpBonus = MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Defence);
                        playerStats.combatXpBonus += (xpBonus + defenceXpBonus) / 2;
                    } else {
                        playerStats.combatXpBonus += xpBonus;
                    }
                }
                if (this.combatStats.attackType === CONSTANTS.attackType.Magic) {
                    const xpBonus = MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Magic);
                    if (this.player.attackStyle.magic === 'Defensive') {
                        const defenceXpBonus = MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Defence);
                        playerStats.combatXpBonus += (xpBonus + defenceXpBonus) / 2;
                    } else {
                        playerStats.combatXpBonus += xpBonus;
                    }
                }
                playerStats.slayerXpBonus = globalXpBonus + MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Slayer);
                playerStats.prayerXpBonus = globalXpBonus + MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Prayer);
                playerStats.summoningXpBonus = globalXpBonus + MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Summoning);
                playerStats.hitpointsXpBonus = globalXpBonus + MICSR.getModifierValue(modifiers, 'SkillXP', CONSTANTS.skill.Hitpoints);
                return playerStats;
            }

            /**
             * Returns the combined amount of runes it costs to use a spell after discounts from equipment
             * @param {Spell} spell The spell to get the rune cost for
             * @param {boolean} [isAurora=false] If the spell is an aurora
             * @returns {array} The amount of runes it costs to use the spell
             */
            getRuneCostForSpell(spell, isAurora = false) {
                const runesRequired = this.useCombinationRunes && spell.runesRequiredAlt ? spell.runesRequiredAlt : spell.runesRequired;
                return runesRequired.map(req => {
                    let qty = req.qty;
                    qty -= this.equipmentStats.runesProvidedByWeapon[req.id] || 0;
                    qty -= isAurora ? (this.equipmentStats.runesProvidedByShield[req.id] || 0) : 0;
                    return {
                        id: req.id,
                        qty: Math.max(qty, 0),
                    };
                });
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
    waitLoadOrder(reqs, setup, 'CombatData');

})();