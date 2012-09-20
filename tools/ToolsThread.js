/**
*	@filename	ToolsThread.js
*	@author		kolton
*	@desc		several tools to help the player - potion use, chicken, Diablo clone stop, map reveal, quit with player
*/

function main() {
	var i, mercHP, ironGolem, area,
		configCache = {},
		quitFlag = false,
		timerLastDrink = [];

	include("OOG.js");
	include("json2.js");
	include("common/Attack.js");
	include("common/Config.js");
	include("common/Cubing.js");
	include("common/Pather.js");
	include("common/Prototypes.js");
	include("common/Runewords.js");
	include("common/Town.js");
	include("common/Misc.js");
	print("�c3Start ToolsThread script");
	Config.init();

	for (i = 0; i < 5; i += 1) {
		timerLastDrink[i] = 0;
	}

	// Reset core chicken
	me.chickenhp = -1;
	me.chickenmp = -1;

	// General functions
	this.cacheConfig = function (obj) {
		var newObj = {};

		newObj.QuitList = obj.QuitList.slice();
		newObj.AntiHostile = obj.AntiHostile;
		newObj.SoJWaitTime = obj.SoJWaitTime;
		newObj.StopOnDClone = obj.StopOnDClone;
		newObj.UseHP = obj.UseHP;
		newObj.UseRejuvHP = obj.UseRejuvHP;
		newObj.LifeChicken = obj.LifeChicken;
		newObj.UseMP = obj.UseMP;
		newObj.UseRejuvMP = obj.UseRejuvMP;
		newObj.ManaChicken = obj.ManaChicken;
		newObj.IronGolemChicken = obj.IronGolemChicken;
		newObj.UseMerc = obj.UseMerc;
		newObj.MercChicken = obj.MercChicken;
		newObj.UseMercRejuv = obj.UseMercRejuv;
		newObj.UseMercHP = obj.UseMercHP;
		newObj.LogExperience = obj.LogExperience;

		return newObj;
	};

	this.quitPrep = function () {
		var i,	script,
			scripts = ["default.dbj", "tools/townchicken.js", "tools/antihostile.js", "tools/party.js", "tools/flashthread.js", "tools/rushthread.js"];

		for (i = 0; i < scripts.length; i += 1) {
			script = getScript(scripts[i]);

			if (script && script.running) {
				script.stop();
			}
		}

		return true;
	};

	this.getPotion = function (pottype) {
		var i,
			items = me.getItems();

		if (!items) {
			return false;
		}

		for (i = 0; i < items.length; i += 1) {
			if (pottype === 78 && items[i].mode === 0 && items[i].location === 3 && items[i].itemType === 78) {
				print("�c2Drinking rejuventation potion from inventory.");

				return copyUnit(items[i]);
			}

			if (items[i].mode === 2 && items[i].itemType === pottype) {
				return copyUnit(items[i]);
			}
		}

		return false;
	};

	this.togglePause = function () {
		var script = getScript("default.dbj");

		if (script) {
			if (script.running) {
				print("�c1Pausing.");
				script.pause();
			} else {
				print("�c2Resuming.");
				script.resume();
			}
		}

		script = getScript("tools/antihostile.js");

		if (script) {
			if (script.running) {
				script.pause();
			} else {
				script.resume();
			}
		}
	};

	this.drinkPotion = function (type) {
		var pottype, potion,
			tNow = getTickCount();

		switch (type) {
		case 0:
		case 1:
			if ((timerLastDrink[type] && (tNow - timerLastDrink[type] < 1000)) || me.getState(type === 0 ? 100 : 106)) {
				return false;
			}

			break;
		case 2:
		case 4:
			if (timerLastDrink[type] && (tNow - timerLastDrink[type] < 500)) { // small delay for juvs just to prevent using more at once
				return false;
			}

			break;
		default:
			if (timerLastDrink[type] && (tNow - timerLastDrink[type] < 8000)) {
				return false;
			}

			break;
		}

		if (me.mode === 0 || me.mode === 17 || me.mode === 18) { // mode 18 - can't drink while leaping/whirling etc.
			return false;
		}

		switch (type) {
		case 0:
		case 3:
			pottype = 76;

			break;
		case 1:
			pottype = 77;

			break;
		default:
			pottype = 78;

			break;
		}

		potion = this.getPotion(pottype);

		if (potion) {
			if (me.mode === 0 || me.mode === 17) {
				return false;
			}

			if (type < 3) {
				potion.interact();
			} else {
				clickItem(2, potion);
			}

			timerLastDrink[type] = getTickCount();

			return true;
		}

		return false;
	};

	this.getNearestMonster = function () {
		var gid, distance,
			monster = getUnit(1),
			range = 30;

		if (monster) {
			do {
				if (monster.hp > 0 && Attack.checkMonster(monster)) {
					distance = getDistance(me, monster);

					if (distance < range) {
						range = distance;
						gid = monster.gid;
					}
				}
			} while (monster.getNext());
		}

		monster = getUnit(1, -1, -1, gid);

		if (monster) {
			return ". Nearest monster: " + monster.name;
		}

		return ".";
	};

	this.getIronGolem = function () {
		var golem = getUnit(1, "iron golem");

		if (!golem) {
			return false;
		}

		do {
			if (golem.getParent().name === me.name) {
				return golem;
			}
		} while (golem.getNext());

		return false;
	};

	this.revealArea = function (area) {
		var room = getRoom(area);

		do {
			if (room instanceof Room && room.area === area) {
				room.reveal(true);
			}
		} while (room.getNext());
	};

	// Event functions
	this.keyEvent = function (key) {
		switch (key) {
		case 19: // Pause/Break key
			this.togglePause();

			break;
		case 123: // F12 key
			area = getArea();

			if (typeof area !== "object") {
				break;
			}

			me.overhead("Revealing " + area.name);
			this.revealArea(me.area);

			break;
		case 96: // Numpad 0
			showConsole();
			print("�c4MF: �c0" + me.getStat(80) + " �c4GF: �c0" + me.getStat(79) + " �c1FR: �c0" + me.getStat(39)
				+ " �c3CR: �c0" + me.getStat(43) + " �c9LR: �c0" + me.getStat(41) + " �c2PR: �c0" + me.getStat(45));

			break;
		}
	};

	this.gameEvent = function (mode, param1, param2, name1, name2) {
		switch (mode) {
		case 0x00: // "%Name1(%Name2) dropped due to time out."
		case 0x01: // "%Name1(%Name2) dropped due to errors."
		case 0x03: // "%Name1(%Name2) left our world. Diablo's minions weaken."
			if (configCache.QuitList.indexOf(name1) > -1) {
				print(name1 + (mode === 0 ? " timed out" : " left"));

				quitFlag = true;
			}

			if (configCache.AntiHostile) {
				scriptBroadcast("remove " + name1);
			}

			break;
		case 0x06: // "%Name1 was Slain by %Name2" 
			if (configCache.AntiHostile && param2 === 0x00 && name2 === me.name) {
				scriptBroadcast("mugshot " + name1);
			}

			break;
		case 0x07:
			if (configCache.AntiHostile && param2 === 0x03) { // "%Player has declared hostility towards you."
				scriptBroadcast("findHostiles");
			}

			break;
		case 0x11: // "%Param1 Stones of Jordan Sold to Merchants"
			if (configCache.SoJWaitTime) {
				D2Bot.printToConsole(param1 + " Stones of Jordan Sold to Merchants;7");
				scriptBroadcast("soj");
			}

			break;
		case 0x12: // "Diablo Walks the Earth"
			if (configCache.StopOnDClone) {
				D2Bot.printToConsole("Diablo Walks the Earth;7");
				this.togglePause();
				Town.goToTown();
				showConsole();
				print("�c4Diablo Walks the Earth");

				me.maxgametime = 0;
			}

			break;
		}
	};

	this.scriptEvent = function (msg) {
		switch (msg) {
		case "quit":
			quitFlag = true;

			break;
		}
	};

	// Cache variables to prevent a bug where d2bs loses the reference to Config object
	configCache = this.cacheConfig(Config);

	addEventListener("scriptmsg", this.scriptEvent);
	addEventListener("keyup", this.keyEvent);
	addEventListener("gameevent", this.gameEvent);

	while (me.ingame) {
		if (!me.inTown) {
			try {
				if (configCache.UseHP > 0 && me.hp < Math.floor(me.hpmax * configCache.UseHP / 100)) {
					this.drinkPotion(0);
				}

				if (configCache.UseRejuvHP > 0 && me.hp < Math.floor(me.hpmax * configCache.UseRejuvHP / 100)) {
					this.drinkPotion(2);
				}

				if (configCache.LifeChicken > 0 && me.hp <= Math.floor(me.hpmax * configCache.LifeChicken / 100)) {
					area = getArea();

					if (typeof area !== "object") {
						area = {name: "unknown"};
					}

					D2Bot.printToConsole("Life Chicken: " + me.hp + "/" + me.hpmax + " in " + area.name + this.getNearestMonster() + ";9");
					D2Bot.updateChickens();
					quit();

					break;
				}

				if (configCache.UseMP > 0 && me.mp < Math.floor(me.mpmax * configCache.UseMP / 100)) {
					this.drinkPotion(1);
				}

				if (configCache.UseRejuvMP > 0 && me.mp < Math.floor(me.mpmax * configCache.UseRejuvMP / 100)) {
					this.drinkPotion(2);
				}

				if (configCache.ManaChicken > 0 && me.mp <= Math.floor(me.mpmax * configCache.ManaChicken / 100)) {
					area = getArea();

					if (typeof area !== "object") {
						area = {name: "unknown"};
					}

					D2Bot.printToConsole("Mana Chicken: " + me.mp + "/" + me.mpmax + " in " + area.name + ";9");
					D2Bot.updateChickens();
					quit();

					break;
				}

				if (configCache.IronGolemChicken > 0 && me.classid === 2) {
					if (!ironGolem || !copyUnit(ironGolem).x) {
						ironGolem = this.getIronGolem();
					}

					if (ironGolem) {
						if (ironGolem.hp <= Math.floor(128 * configCache.IronGolemChicken / 100)) { // ironGolem.hpmax is bugged with BO
							area = getArea();

							if (typeof area !== "object") {
								area = {name: "unknown"};
							}

							D2Bot.printToConsole("Irom Golem Chicken in " + area.name + ";9");
							D2Bot.updateChickens();
							quit();

							break;
						}
					}
				}

				if (configCache.UseMerc) {
					mercHP = getMercHP();

					if (mercHP > 0) {
						if (mercHP < configCache.MercChicken) {
							area = getArea();

							if (typeof area !== "object") {
								area = {name: "unknown"};
							}

							D2Bot.printToConsole("Merc Chicken in " + area.name + ";9");
							D2Bot.updateChickens();
							quit();

							break;
						}

						if (mercHP < configCache.UseMercRejuv) {
							this.drinkPotion(4);
						} else if (mercHP < configCache.UseMercHP) {
							this.drinkPotion(3);
						}
					}
				}
			} catch (e) {
				D2Bot.printToConsole("Error in Tools Thread: #" + e.lineNumber + ": " + e.message + " Area: " + getArea().name + ";9");
				quit();

				return;
			}
		}

		if (quitFlag) {
			print("�c8Run duration �c2" + ((getTickCount() - me.gamestarttime) / 1000));

			if (configCache.LogExperience) {
				Experience.log();
			}

			this.quitPrep();
			quit();

			break;
		}

		delay(10);
	}
}