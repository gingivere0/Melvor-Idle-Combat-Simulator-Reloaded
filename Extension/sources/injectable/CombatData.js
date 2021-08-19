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
                // auto eat data
                this.autoEatData = [
                    SHOP["General"][CONSTANTS.shop.general.Auto_Eat_Tier_I],
                    SHOP["General"][CONSTANTS.shop.general.Auto_Eat_Tier_II],
                    SHOP["General"][CONSTANTS.shop.general.Auto_Eat_Tier_III],
                ];
                // Spell Selection
                this.spells = {
                    standard: {
                        array: SPELLS,
                        selectedID: 0,
                    },
                    curse: {
                        array: CURSES,
                        selectedID: -1,
                    },
                    aurora: {
                        array: AURORAS,
                        selectedID: -1,
                    },
                    ancient: {
                        array: ANCIENT,
                        selectedID: -1,
                    },
                };
                // Combat Stats
                this.combatStats = {
                    attackSpeed: 4000,
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
                // Slayer Variables
                this.isSlayerTask = false;
                // Game Mode Settings
                this.isHardcore = false;
                this.isAdventure = false;
                this.numberMultiplier = 10;
                // combination runes
                this.useCombinationRunes = false;
                // lucky herb bonus
                this.luckyHerb = 0;
                // player modifiers
                this.modifiers = new PlayerModifiers();
                // base stats
                this.baseStats = this.resetPlayerBaseStats();
                // equipment stats
                this.equipmentStats = {};
                // combat stats
                this.combatStats = {};
                // selected item drop
                this.dropSelected = -1;
            }

            /**
             * Calculates the equipment's combined stats and stores them in `this.equipmentStats`
             */
            updateEquipmentStats() {
                this.setAttackType();
                const maxCape = this.player.equipmentIDs().includes(CONSTANTS.item.Max_Skillcape) || this.player.equipmentIDs().includes(CONSTANTS.item.Cape_of_Completion);
                /** @type {EquipmentStats} */
                const equipmentStats = {
                    runesProvidedByWeapon: {},
                    runesProvidedByShield: {},
                    activeItems: {
                        // TODO: check which of these items are passive slot items
                        //   also check any other use of `CONSTANTS.item` and `items`
                        hitpointsSkillcape: this.player.equipmentIDs().includes(CONSTANTS.item.Hitpoints_Skillcape) || maxCape,
                        magicSkillcape: this.player.equipmentIDs().includes(CONSTANTS.item.Magic_Skillcape) || maxCape,
                        prayerSkillcape: this.player.equipmentIDs().includes(CONSTANTS.item.Prayer_Skillcape) || maxCape,
                        slayerSkillcape: this.player.equipmentIDs().includes(CONSTANTS.item.Slayer_Skillcape) || maxCape,
                        firemakingSkillcape: this.player.equipmentIDs().includes(CONSTANTS.item.Firemaking_Skillcape) || maxCape,
                        capeOfArrowPreservation: this.player.equipmentIDs().includes(CONSTANTS.item.Cape_of_Arrow_Preservation),
                        skullCape: this.player.equipmentIDs().includes(CONSTANTS.item.Skull_Cape),
                        goldDiamondRing: this.player.equipmentIDs().includes(CONSTANTS.item.Gold_Diamond_Ring),
                        goldEmeraldRing: this.player.equipmentIDs().includes(CONSTANTS.item.Gold_Emerald_Ring),
                        goldSapphireRing: this.player.equipmentIDs().includes(CONSTANTS.item.Gold_Sapphire_Ring),
                        fighterAmulet: this.player.equipmentIDs().includes(CONSTANTS.item.Fighter_Amulet) && this.combatStats.attackType === CONSTANTS.attackType.Melee,
                        warlockAmulet: this.player.equipmentIDs().includes(CONSTANTS.item.Warlock_Amulet) && this.combatStats.attackType === CONSTANTS.attackType.Magic,
                        guardianAmulet: this.player.equipmentIDs().includes(CONSTANTS.item.Guardian_Amulet),
                        deadeyeAmulet: this.player.equipmentIDs().includes(CONSTANTS.item.Deadeye_Amulet) && this.combatStats.attackType === CONSTANTS.attackType.Ranged,
                        confettiCrossbow: this.player.equipmentIDs().includes(CONSTANTS.item.Confetti_Crossbow),
                        stormsnap: this.player.equipmentIDs().includes(CONSTANTS.item.Stormsnap),
                        slayerCrossbow: this.player.equipmentIDs().includes(CONSTANTS.item.Slayer_Crossbow),
                        bigRon: this.player.equipmentIDs().includes(CONSTANTS.item.Big_Ron),
                        aorpheatsSignetRing: this.player.equipmentIDs().includes(CONSTANTS.item.Aorpheats_Signet_Ring),
                        elderCrown: this.player.equipmentIDs().includes(CONSTANTS.item.Elder_Crown),
                        // slayer gear
                        mirrorShield: this.player.equipmentIDs().includes(CONSTANTS.item.Mirror_Shield),
                        magicalRing: this.player.equipmentIDs().includes(CONSTANTS.item.Magical_Ring),
                    },
                };

                // set defaults based on known item stats
                Object.getOwnPropertyNames(MICSR.equipmentStatNames).forEach(stat => {
                    equipmentStats[stat] = 0;
                });
                Object.getOwnPropertyNames(MICSR.passiveStatNames).forEach(stat => {
                    equipmentStats[stat] = 0;
                });
                Object.getOwnPropertyNames(MICSR.requiredStatNames).forEach(stat => {
                    equipmentStats[stat] = 1;
                });

                // set custom defaults
                equipmentStats.attackSpeed = 4000;
                equipmentStats.attackBonus = [0, 0, 0];

                // iterate over gear
                for (let equipmentSlot = 0; equipmentSlot < MICSR.equipmentSlotKeys.length; equipmentSlot++) {
                    const itemID = this.player.equipmentID(equipmentSlot);
                    if (itemID === -1) {
                        continue;
                    }
                    const item = items[itemID];

                    // passive stats
                    Object.getOwnPropertyNames(MICSR.passiveStatNames).forEach(stat => {
                        if (equipmentSlot === MICSR.equipmentSlot.Weapon && item.isAmmo) {
                            return;
                        }
                        equipmentStats[stat] += item[stat] || 0;
                    });

                    // level requirements
                    Object.getOwnPropertyNames(MICSR.requiredStatNames).forEach(stat => {
                        const itemStat = item[stat];
                        if (itemStat === undefined || itemStat === null) {
                            return;
                        }
                        equipmentStats[stat] = Math.max(equipmentStats[stat], item[stat] || 0);
                    });

                    // equipment stats
                    if (equipmentSlot !== MICSR.equipmentSlot.Passive) {
                        Object.getOwnPropertyNames(MICSR.equipmentStatNames).forEach(stat => {
                            const itemStat = item[stat];
                            if (itemStat === undefined || itemStat === null) {
                                return;
                            }
                            // special cases
                            switch (stat) {
                                case 'attackBonus':
                                    for (let j = 0; j < 3; j++) {
                                        equipmentStats[stat][j] += itemStat[j];
                                    }
                                    return;
                                case 'attackSpeed':
                                    if (equipmentSlot === MICSR.equipmentSlot.Weapon) {
                                        equipmentStats.attackSpeed = item.attackSpeed || 4000;
                                    }
                                    return;
                                case 'providesRuneQty':
                                    if (equipmentSlot === MICSR.equipmentSlot.Weapon) {
                                        item.providesRune.forEach((rune) => equipmentStats.runesProvidedByWeapon[rune] = itemStat * (equipmentStats.activeItems.magicSkillcape ? 2 : 1));
                                    } else if (equipmentSlot === MICSR.equipmentSlot.Shield) {
                                        item.providesRune.forEach((rune) => equipmentStats.runesProvidedByShield[rune] = itemStat * (equipmentStats.activeItems.magicSkillcape ? 2 : 1));
                                    } else {
                                        console.error(`Runes provided by ${item.name} are not taken into account!`)
                                    }
                                    return;
                            }
                            if (equipmentSlot === MICSR.equipmentSlot.Weapon && item.isAmmo) {
                                return;
                            }
                            // standard stats
                            equipmentStats[stat] += itemStat || 0;
                        });
                    }
                }
                this.equipmentStats = equipmentStats;
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
             * mimic resetPlayerBaseStats
             */
            resetPlayerBaseStats() {
                return {
                    attackBonus: [0, 0, 0],
                    defenceBonus: 0,
                    strengthBonus: 0,
                    damageReduction: 0,
                    attackBonusRanged: 0,
                    defenceBonusRanged: 0,
                    strengthBonusRanged: 0,
                    attackBonusMagic: 0,
                    defenceBonusMagic: 0,
                    damageBonusMagic: 0,
                };
            }

            /**
             * mimic updatePlayerBaseStats
             */
            updatePlayerBaseStats(monsterID = undefined) {
                const baseStats = this.resetPlayerBaseStats();
                for (let i = 0; i < 3; i++) {
                    baseStats.attackBonus[i] += this.equipmentStats.attackBonus[i];
                }
                baseStats.defenceBonus += this.equipmentStats.defenceBonus;
                baseStats.strengthBonus += this.equipmentStats.strengthBonus;
                baseStats.damageReduction += this.equipmentStats.damageReduction;
                baseStats.attackBonusRanged += this.equipmentStats.rangedAttackBonus;
                baseStats.defenceBonusRanged += this.equipmentStats.rangedDefenceBonus;
                baseStats.strengthBonusRanged += this.equipmentStats.rangedStrengthBonus;
                baseStats.attackBonusMagic += this.equipmentStats.magicAttackBonus;
                baseStats.defenceBonusMagic += this.equipmentStats.magicDefenceBonus;
                baseStats.damageBonusMagic += this.equipmentStats.magicDamageBonus;
                if (monsterID !== undefined) {
                    // changes for items that have different formulas in combat
                    if (this.equipmentStats.activeItems.stormsnap) {
                        baseStats.strengthBonusRanged += Math.floor(110 + (1 + (MONSTERS[monsterID].magicLevel * 6) / 33));
                        baseStats.attackBonusRanged += Math.floor(102 * (1 + (MONSTERS[monsterID].magicLevel * 6) / 5500));
                    } else if (this.equipmentStats.activeItems.slayerCrossbow
                        // && !isDungeon // TODO: implement this check by duplicating certain sims? see issue #10
                        && (MONSTERS[monsterID].slayerXP !== undefined || this.isSlayerTask)) {
                        baseStats.strengthBonusRanged = Math.floor(baseStats.strengthBonusRanged * items[CONSTANTS.item.Slayer_Crossbow].slayerStrengthMultiplier);
                    } else if (this.equipmentStats.activeItems.bigRon && MONSTERS[monsterID].isBoss) {
                        baseStats.strengthBonus = Math.floor(baseStats.strengthBonus * items[CONSTANTS.item.Big_Ron].bossStrengthMultiplier);
                    }
                    // synergy 6 7 and synergy 7 8
                    if (this.modifiers.summoningSynergy_6_7 && MONSTERS[monsterID].attackType === CONSTANTS.attackType.Ranged) {
                        baseStats.attackBonus[0] += this.modifiers.summoningSynergy_6_7;
                        baseStats.attackBonus[1] += this.modifiers.summoningSynergy_6_7;
                        baseStats.attackBonus[2] += this.modifiers.summoningSynergy_6_7;
                        baseStats.strengthBonus += this.modifiers.summoningSynergy_6_7;
                    } else if (this.modifiers.summoningSynergy_7_8 && MONSTERS[monsterID].attackType === CONSTANTS.attackType.Magic) {
                        baseStats.attackBonusRanged += this.modifiers.summoningSynergy_7_8;
                        baseStats.strengthBonusRanged += this.modifiers.summoningSynergy_7_8;
                    } else if (this.modifiers.summoningSynergy_6_13 && MONSTERS[monsterID].attackType === CONSTANTS.attackType.Ranged) {
                        baseStats.damageReduction += this.modifiers.summoningSynergy_6_13;
                    } else if (this.modifiers.summoningSynergy_7_13 && MONSTERS[monsterID].attackType === CONSTANTS.attackType.Magic) {
                        baseStats.damageReduction += this.modifiers.summoningSynergy_7_13;
                    } else if (this.modifiers.summoningSynergy_8_13 && MONSTERS[monsterID].attackType === CONSTANTS.attackType.Melee) {
                        baseStats.damageReduction += this.modifiers.summoningSynergy_8_13;
                    }
                }
                // apply synergies
                if (this.modifiers.summoningSynergy_1_8) {
                    baseStats.defenceBonusMagic += this.modifiers.summoningSynergy_1_8;
                } else if (this.modifiers.summoningSynergy_12_13 && this.isSlayerTask) {
                    baseStats.damageReduction += this.modifiers.summoningSynergy_12_13;
                }
                return baseStats;
            }

            baseMeleeMaxHit(baseStats) {
                const effectiveStrengthLevel = this.player.levels.Strength;
                return Math.floor(this.numberMultiplier * (1.3 + effectiveStrengthLevel / 10 + baseStats.strengthBonus / 80 + (effectiveStrengthLevel * baseStats.strengthBonus) / 640));
            }

            /**
             * mimic calculatePlayerDamageReduction
             */
            calculatePlayerDamageReduction() {
                return this.baseStats.damageReduction + MICSR.getModifierValue(this.modifiers, 'DamageReduction');
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

                // update modifiers
                this.updateModifiers();
                const modifiers = this.modifiers;

                // update aurora bonuses //TODO: are some of these modifiers?
                this.computeAuroraBonus();

                // set base stats
                this.baseStats = this.updatePlayerBaseStats();

                /*
                Second, start computing and configuring TODO: extract this
                 */

                // loot doubling
                this.combatStats.lootBonusPercent = MICSR.getModifierValue(this.modifiers, 'ChanceToDoubleLootCombat')
                    + MICSR.getModifierValue(this.modifiers, 'ChanceToDoubleItemsGlobal');
                // loot doubling is always between 0% and 100% chance
                this.combatStats.lootBonusPercent = Math.max(0, this.combatStats.lootBonusPercent);
                this.combatStats.lootBonusPercent = Math.min(100, this.combatStats.lootBonusPercent);
                // convert to average loot multiplier
                this.combatStats.lootBonus = MICSR.averageDoubleMultiplier(this.combatStats.lootBonusPercent);
                // gp bonus
                this.combatStats.gpBonus = MICSR.averageDoubleMultiplier(
                    MICSR.getModifierValue(this.modifiers, 'GPFromMonsters')
                    + MICSR.getModifierValue(this.modifiers, 'GPGlobal')
                    + (this.isSlayerTask ? this.modifiers.summoningSynergy_0_12 : 0)
                );

                // set enemy spawn timer
                this.enemySpawnTimer = 3000 + MICSR.getModifierValue(modifiers, 'MonsterRespawnTimer');

                // attack speed without aurora
                this.combatStats.attackSpeed = 4000;
                this.combatStats.attackSpeed = this.equipmentStats.attackSpeed;
                if (this.combatStats.attackType === CONSTANTS.attackType.Ranged && this.player.attackStyle.Ranged === 'Rapid') {
                    this.combatStats.attackSpeed -= 400;
                }
                this.combatStats.attackSpeed += MICSR.getModifierValue(modifiers, 'AttackInterval');
                this.combatStats.attackSpeed = applyModifier(
                    this.combatStats.attackSpeed,
                    MICSR.getModifierValue(modifiers, 'AttackIntervalPercent')
                );

                // preservation
                this.combatStats.ammoPreservation = MICSR.getModifierValue(this.modifiers, 'AmmoPreservation');
                this.combatStats.runePreservation = MICSR.getModifierValue(this.modifiers, 'RunePreservation');

                // max attack roll
                this.combatStats.maxAttackRoll = this.player.stats.accuracy;

                // max hit roll
                this.combatStats.baseMeleeMaxHit = this.baseMeleeMaxHit(this.baseStats);
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
                this.combatStats.summoningMaxHit = this.getSMH();
                this.summoningXPPerHit = this.getSummoningXP();

                // max defence roll
                this.combatStats.maxDefRoll = this.player.stats.evasion.melee;
                this.combatStats.maxRngDefRoll = this.player.stats.evasion.ranged;
                this.combatStats.maxMagDefRoll = this.player.stats.evasion.magic;

                // Calculate damage reduction
                this.combatStats.damageReduction = this.calculatePlayerDamageReduction();

                // Max Hitpoints
                this.combatStats.baseMaxHitpoints = this.player.levels.Hitpoints;
                this.combatStats.baseMaxHitpoints += MICSR.getModifierValue(modifiers, 'MaxHitpoints');
                this.combatStats.maxHitpoints = this.combatStats.baseMaxHitpoints * this.numberMultiplier;
            }

            /**
             * Update this.modifiers
             * mimics updateAllPlayerModifiers
             */
            updateModifiers() {
                // reset
                this.modifiers = new PlayerModifiers();

                // mimic calculateEquippedItemModifiers // passives
                const duplicateCheck = {};
                this.player.equipmentIDs().filter(itemID => {
                    if (itemID === -1) {
                        return false;
                    }
                    if (items[itemID].modifiers === undefined) {
                        return false;
                    }
                    if (duplicateCheck[itemID]) {
                        return false
                    }
                    duplicateCheck[itemID] = true;
                    return true;
                }).forEach(itemID => this.modifiers.addModifiers(items[itemID].modifiers));

                // mimic calculateMiscModifiers
                // implement this if it ever is relevant

                // potion modifiers
                this.computePotionBonus();

                // TODO: SPECIAL ATTACKS, MASTERY
                //  when they get made into modifiers in the game
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

            getSMH() {
                const summ1 = this.player.equipmentID(MICSR.equipmentSlot.Summon1);
                const summ2 = this.player.equipmentID(MICSR.equipmentSlot.Summon2);
                let smh1 = 0;
                if (summ1 >= 0) {
                    smh1 = items[summ1].summoningMaxHit | 0;
                }
                let smh2 = 0;
                if (summ2 >= 0) {
                    smh2 = items[summ2].summoningMaxHit | 0;
                }
                return Math.max(smh1, smh2);
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

                // set auto eat
                if (this.player.autoEatTier >= 0) {
                    playerStats.autoEat.eatAt = MICSR.getModifierValue(this.modifiers, 'AutoEatThreshold');
                    playerStats.autoEat.efficiency = MICSR.getModifierValue(this.modifiers, 'AutoEatEfficiency');
                    playerStats.autoEat.maxHP = MICSR.getModifierValue(this.modifiers, 'AutoEatHPLimit');
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
                    amt += this.numberMultiplier * MICSR.getModifierValue(this.modifiers, 'HPRegenFlat');
                    // rapid heal prayer
                    amt *= 1 + MICSR.getModifierValue(this.modifiers, 'HitpointRegeneration');
                    // Regeneration modifiers
                    applyModifier(
                        amt,
                        MICSR.getModifierValue(this.modifiers, 'HitpointRegeneration')
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
                    pp -= MICSR.getModifierValue(this.modifiers, 'FlatPrayerCostReduction');
                    if (playerStats.activeItems.prayerSkillcape && pp > 0) {
                        pp = Math.floor(pp / 2);
                    }
                    pp = Math.max(1, pp);
                    let save = MICSR.getModifierValue(this.modifiers, 'ChanceToPreservePrayerPoints');
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
                const globalXpBonus = MICSR.getModifierValue(this.modifiers, 'GlobalSkillXP');
                playerStats.combatXpBonus = globalXpBonus;
                if (this.combatStats.attackType === CONSTANTS.attackType.Melee) {
                    switch (this.player.attackStyle.melee) {
                        case 'Stab':
                            playerStats.combatXpBonus += MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Attack);
                            break
                        case 'Slash':
                            playerStats.combatXpBonus += MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Strength);
                            break
                        case 'Block':
                            playerStats.combatXpBonus += MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Defence);
                            break
                    }
                }
                if (this.combatStats.attackType === CONSTANTS.attackType.Ranged) {
                    const xpBonus = MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Ranged);
                    if (this.player.attackStyle.ranged === 'Longrange') {
                        const defenceXpBonus = MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Defence);
                        playerStats.combatXpBonus += (xpBonus + defenceXpBonus) / 2;
                    } else {
                        playerStats.combatXpBonus += xpBonus;
                    }
                }
                if (this.combatStats.attackType === CONSTANTS.attackType.Magic) {
                    const xpBonus = MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Magic);
                    if (this.player.attackStyle.magic === 'Defensive') {
                        const defenceXpBonus = MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Defence);
                        playerStats.combatXpBonus += (xpBonus + defenceXpBonus) / 2;
                    } else {
                        playerStats.combatXpBonus += xpBonus;
                    }
                }
                playerStats.slayerXpBonus = globalXpBonus + MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Slayer);
                playerStats.prayerXpBonus = globalXpBonus + MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Prayer);
                playerStats.summoningXpBonus = globalXpBonus + MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Summoning);
                playerStats.hitpointsXpBonus = globalXpBonus + MICSR.getModifierValue(this.modifiers, 'SkillXP', CONSTANTS.skill.Hitpoints);
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

            /**
             * Check if we can enter the slayer area `area` with current settings
             */
            canAccessArea(area) {
                // check level requirement
                if (area.slayerLevel !== undefined && this.player.skillLevel[CONSTANTS.skill.Slayer] < area.slayerLevel) {
                    return false;
                }
                // check clear requirement
                if (area.dungeonCompleted >= 0 && dungeonCompleteCount[area.dungeonCompleted] < 1) {
                    return false
                }
                // check gear requirement
                if (area.slayerItem > 0
                    && !this.equipmentStats.activeItems.slayerSkillcape
                    && !this.player.equipmentIDs().includes(area.slayerItem)) {
                    return false;
                }
                return true;
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