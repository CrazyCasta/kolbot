/**
*	@filename	Paladin.js
*	@author		kolton
*	@desc		Paladin attack sequence
*/

var ClassAttack = {
	skillRange: [],
	skillHand: [],
	skillElement: [],

	init: function () {
		var i;

		for (i = 0; i < Config.AttackSkill.length; i += 1) {
			this.skillHand[i] = getBaseStat("skills", Config.AttackSkill[i], "leftskill");
			this.skillElement[i] = Attack.getSkillElement(Config.AttackSkill[i]);

			switch (Config.AttackSkill[i]) {
			case 0: // Normal Attack
				this.skillRange[i] = Attack.usingBow() ? 20 : 3;
				this.skillHand[i] = 2; // shift bypass
				break;
			case 96: // Sacrifice
			case 97: // Smite
			case 106: // Zeal
			case 112: // Blessed Hammer
			case 116: // Conversion
				this.skillRange[i] = 3;
				break;
			case 101: // Holy Bolt
				this.skillRange[i] = 5;
				break;
			case 107: // Charge
				this.skillRange[i] = 10;
				break;
			case 121: // Fist of the Heavens
				this.skillRange[i] = 20;
				break;
			default: // Every other skill
				this.skillRange[i] = 25;
				break;
			}
		}
	},

	doAttack: function (unit, preattack) {
		if (Config.MercWatch && Town.needMerc()) {
			Town.visitTown();
		}

		if (preattack && Config.AttackSkill[0] > 0 && Attack.checkResist(unit, this.skillElement[0]) && (!me.getState(121) || !Skill.isTimed(Config.AttackSkill[0]))) {
			if (Math.round(getDistance(me, unit)) > this.skillRange[0] || checkCollision(me, unit, 0x4)) {
				if (!Attack.getIntoPosition(unit, this.skillRange[0], 0x4)) {
					return 1;
				}
			}

			if (!Skill.cast(Config.AttackSkill[0], this.skillHand[0], unit)) {
				return 2;
			}

			return 3;
		}

		var index;

		index = ((unit.spectype & 0x7) || unit.type === 0) ? 1 : 3;

		if (Attack.checkResist(unit, this.skillElement[index])) {
			if (this.skillRange[index] < 4 && checkCollision(me, unit, 0x1) && (getCollision(unit.area, unit.x, unit.y) & 0x1)) {
				return 1;
			}

			switch (this.doCast(unit, index)) {
			case 0: // total fail
				return 1;
			case false: // fail to cast
				return 2;
			}

			return 3;
		}

		if (Config.AttackSkill[5] > -1 && Attack.checkResist(unit, this.skillElement[5])) {
			if (this.skillRange[5] < 4 && checkCollision(me, unit, 0x1) && (getCollision(unit.area, unit.x, unit.y) & 0x1)) {
				return 1;
			}

			switch (this.doCast(unit, 5)) {
			case 0: // total fail
				return 1;
			case false: // fail to cast
				return 2;
			}

			return 3;
		}

		return 1;
	},

	afterAttack: function () {
		Precast.doPrecast(false);

		if (Config.Redemption instanceof Array && (me.hp * 100 / me.hpmax < Config.Redemption[0] || me.mp * 100 / me.mpmax < Config.Redemption[1]) && Skill.setSkill(124, 0)) {
			delay(1500);
		}
	},

	doCast: function (unit, index) {
		var i;

		if (Config.AttackSkill[index] === 112) {
			if (unit.classid === 691) {
				Attack.getIntoPosition(unit, 15, 0x4);

				if (Config.AttackSkill[index + 1] > -1) {
					Skill.setSkill(Config.AttackSkill[index + 1], 0);
				}

				return Skill.cast(Config.AttackSkill[index], this.skillHand[index], unit);
			}

			if (!this.checkHammerPosition(unit)) {
				this.getHammerPosition(unit);

				if (getDistance(me, unit) > 6) { // increase pvp aggressiveness
					return false;
				}
			}

			if (Config.AttackSkill[index + 1] > -1) {
				Skill.setSkill(Config.AttackSkill[index + 1], 0);
			}

			for (i = 0; i < 3; i += 1) {
				Skill.cast(Config.AttackSkill[index], this.skillHand[index], unit);

				if (!Attack.checkMonster(unit) || getDistance(me, unit) > 5) {
					return true;
				}
			}

			return true;
		} else if (Config.AttackSkill[index] === 101) {
			CollMap.reset();

			if (Math.round(getDistance(me, unit)) > this.skillRange[index] || CollMap.checkColl(me, unit, 0x2004)) {
				if (!Attack.getIntoPosition(unit, this.skillRange[index], 0x2004, true)) {
					return 0;
				}
			}
		} else if (getDistance(me, unit) > this.skillRange[index] || checkCollision(me, unit, 0x4)) {
			// walk short distances instead of tele for melee attacks
			if (!Attack.getIntoPosition(unit, this.skillRange[index], 0x4, this.skillRange[index] < 4 && getDistance(me, unit) < 10 && !checkCollision(me, unit, 0x1))) {
				return 0;
			}
		}

		if (Config.AttackSkill[index + 1] > -1) {
			Skill.setSkill(Config.AttackSkill[index + 1], 0);
		}

		return Skill.cast(Config.AttackSkill[index], this.skillHand[index], unit);
	},

	checkHammerPosition: function (unit) {
		var i,
			x = unit.x,
			y = unit.y,
			positions = [[x + 1, y + 1], [x - 1, y - 1], [x + 2, y]];

		for (i = 0; i < positions.length; i += 1) {
			if (getDistance(me, positions[i][0], positions[i][1]) < 2) {
				return true;
			}
		}

		return false;
	},

	getHammerPosition: function (unit) {
		var i,
			x = unit.x,
			y = unit.y,
			positions = [[x + 1, y + 1], [x - 1, y - 1], [x + 2, y]];

		for (i = 0; i < positions.length; i += 1) {
			if (Attack.validSpot(positions[i][0], positions[i][1])) {
				this.reposition(positions[i][0], positions[i][1]);

				if (!checkCollision(me, unit, 0x1)) {
					return true;
				}
			}
		}

		return false;
	},

	reposition: function (x, y) {
		while (!me.idle) {
			delay(40);
		}

		if (getDistance(me, x, y) > 1) {
			if (me.gametype === 1) {
				return Pather.moveTo(x, y, 1);
			}

			me.move(x, y);
		}

		while (!me.idle) {
			delay(40);
		}

		return true;
	}
};